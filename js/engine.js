// ======================================
// 游戏引擎 - 主循环与状态管理
// ======================================
window.Game = {
    state: 'menu', // 'menu'|'plane'|'playing'|'gameover'
    canvas: null,
    ctx: null,
    camera: { x: 0, y: 0 },
    MAP_WIDTH: 4000,
    MAP_HEIGHT: 4000,
    TILE_SIZE: 40,
    player: null,
    bots: [],
    bullets: [],
    lootItems: [],
    buildings: [],
    obstacles: [],
    zone: null,
    airdrops: [],
    killFeed: [],
    aliveCount: 31,
    gameTime: 0,
    delta: 0,
    winner: false,
    // 飞机
    planeAngle: 0,
    planeStartX: 0, planeStartY: 0,
    planeEndX: 0, planeEndY: 0,
    planeProgress: 0,
    planeX: 0, planeY: 0,
    hasJumped: false,
    parachuteY: 0,
    parachuteTarget: 0,
    showBigMap: false,
    lastTime: 0,
    startTime: 0,
    fps: 0,
    frameCount: 0,
    fpsTimer: 0
};

window.GameEngine = {
    init() {
        Game.canvas = document.getElementById('gameCanvas');
        Game.ctx = Game.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        Input.init(Game.canvas);
        AudioManager.init();

        // 开始渲染循环（菜单背景）
        Game.lastTime = performance.now();
        this._loop();
    },

    resize() {
        Game.canvas.width = window.innerWidth;
        Game.canvas.height = window.innerHeight;
    },

    startGame() {
        AudioManager.resume();
        document.getElementById('startMenu').style.display = 'none';

        // 重置游戏状态
        Game.bullets = [];
        Game.lootItems = [];
        Game.airdrops = [];
        Game.killFeed = [];
        Game.aliveCount = 31;
        Game.gameTime = 0;
        Game.winner = false;
        Game.showBigMap = false;
        Game.startTime = performance.now();

        // 生成地图
        GameMap.generate();

        // 生成物资
        LootManager.spawnLoot(Game.buildings);

        // 创建缩圈
        Game.zone = new Zone();

        // 设置飞机航线
        Game.planeAngle = Math.random() * Math.PI * 2;
        const cx = Game.MAP_WIDTH / 2;
        const cy = Game.MAP_HEIGHT / 2;
        Game.planeStartX = cx - Math.cos(Game.planeAngle) * 2500;
        Game.planeStartY = cy - Math.sin(Game.planeAngle) * 2500;
        Game.planeEndX = cx + Math.cos(Game.planeAngle) * 2500;
        Game.planeEndY = cy + Math.sin(Game.planeAngle) * 2500;
        Game.planeProgress = 0;
        Game.planeX = Game.planeStartX;
        Game.planeY = Game.planeStartY;
        Game.hasJumped = false;

        // 创建玩家（先放在飞机上）
        Game.player = new Player(Game.planeX, Game.planeY);

        // 创建Bot
        Game.bots = [];
        const difficulties = [];
        for (let i = 0; i < 10; i++) difficulties.push('easy');
        for (let i = 0; i < 13; i++) difficulties.push('medium');
        for (let i = 0; i < 7; i++) difficulties.push('hard');

        // Bot们在飞机航线上不同位置跳伞（简化：直接放置在地图上）
        for (let i = 0; i < 30; i++) {
            const pos = GameMap.getRandomOpenPosition();
            const bot = new Bot(pos.x, pos.y, difficulties[i]);
            Game.bots.push(bot);
        }

        // 开始飞机阶段
        Game.state = 'plane';
    },

    restart() {
        document.getElementById('gameOverScreen').style.display = 'none';
        this.startGame();
    },

    _loop() {
        const now = performance.now();
        let dt = (now - Game.lastTime) / 1000;
        Game.lastTime = now;

        // 限制dt避免跳帧
        if (dt > 0.05) dt = 0.05;
        Game.delta = dt;

        // FPS计算
        Game.frameCount++;
        Game.fpsTimer += dt;
        if (Game.fpsTimer >= 1) {
            Game.fps = Game.frameCount;
            Game.frameCount = 0;
            Game.fpsTimer = 0;
        }

        this.update(dt);
        this.render();

        requestAnimationFrame(() => this._loop());
    },

    update(dt) {
        if (Game.state === 'menu') return;

        if (Game.state === 'plane') {
            this._updatePlane(dt);
        } else if (Game.state === 'playing') {
            this._updatePlaying(dt);
        }

        Input.clearJustPressed();
    },

    _updatePlane(dt) {
        // 飞机移动
        Game.planeProgress += dt * 0.08;
        Game.planeX = Game.planeStartX + (Game.planeEndX - Game.planeStartX) * Game.planeProgress;
        Game.planeY = Game.planeStartY + (Game.planeEndY - Game.planeStartY) * Game.planeProgress;

        // 摄像机跟随飞机
        Game.camera.x = Game.planeX - Game.canvas.width / 2;
        Game.camera.y = Game.planeY - Game.canvas.height / 2;
        Input.updateWorldMouse();

        // 点击跳伞
        if (Input.mouse.down || Input.isJustPressed(' ') || Game.planeProgress > 0.85) {
            Game.hasJumped = true;
            // 玩家在当前飞机位置跳下
            const jumpX = Math.max(50, Math.min(Game.MAP_WIDTH - 50, Game.planeX));
            const jumpY = Math.max(50, Math.min(Game.MAP_HEIGHT - 50, Game.planeY));
            Game.player.x = jumpX;
            Game.player.y = jumpY;

            // 确保玩家落在可通行区域
            if (!GameMap.isPositionClear(Game.player.x, Game.player.y, 20)) {
                const pos = GameMap.getRandomOpenPosition();
                Game.player.x = pos.x;
                Game.player.y = pos.y;
            }

            Game.state = 'playing';

            // 启动缩圈（延迟一点）
            setTimeout(() => {
                if (Game.zone) Game.zone.start();
            }, 3000);
        }

        // 飞机飞出地图则强制跳伞
        if (Game.planeProgress >= 1) {
            Game.player.x = Game.MAP_WIDTH / 2;
            Game.player.y = Game.MAP_HEIGHT / 2;
            Game.state = 'playing';
            if (Game.zone) Game.zone.start();
        }

        Input.clearJustPressed();
    },

    _updatePlaying(dt) {
        Game.gameTime += dt;

        // 更新各系统
        Game.player.update(dt);
        for (const bot of Game.bots) bot.update(dt);
        BulletManager.update(dt);
        LootManager.update(dt);
        if (Game.zone) Game.zone.update(dt);
        AirdropManager.update(dt);
        ParticleSystem.update(dt);
        HUD.update(dt);
        Minimap.update(dt);

        // 更新摄像机
        if (!Game.player.isDead) {
            const targetCamX = Game.player.x - Game.canvas.width / 2;
            const targetCamY = Game.player.y - Game.canvas.height / 2;
            Game.camera.x += (targetCamX - Game.camera.x) * 8 * dt;
            Game.camera.y += (targetCamY - Game.camera.y) * 8 * dt;
        }
        Input.updateWorldMouse();

        // 大地图切换
        if (Input.isJustPressed('m')) {
            Game.showBigMap = !Game.showBigMap;
        }

        // 胜利检测
        if (!Game.player.isDead && Game.aliveCount <= 1) {
            Game.winner = true;
            this._gameOver(true);
        }

        // 失败检测
        if (Game.player.isDead) {
            this._gameOver(false);
        }
    },

    _gameOver(isWinner) {
        Game.state = 'gameover';

        const screen = document.getElementById('gameOverScreen');
        const title = document.getElementById('gameOverTitle');
        const rank = document.getElementById('gameOverRank');
        const kills = document.getElementById('statKills');
        const time = document.getElementById('statTime');
        const damage = document.getElementById('statDamage');

        if (isWinner) {
            title.textContent = '大吉大利，今晚吃鸡！';
            title.className = 'gameover-title winner';
            rank.textContent = '#1';
            rank.style.color = '#FFD700';
            AudioManager.play('chicken_dinner');
        } else {
            const aliveCount = Game.aliveCount;
            title.textContent = '游戏结束';
            title.className = 'gameover-title';
            rank.textContent = `#${aliveCount + 1}`;
            rank.style.color = aliveCount < 5 ? '#FFA726' : '#fff';
        }

        kills.textContent = Game.player ? Game.player.kills : 0;
        const totalTime = Math.floor(Game.gameTime);
        time.textContent = `${Math.floor(totalTime / 60)}:${String(totalTime % 60).padStart(2, '0')}`;
        damage.textContent = Game.player ? Math.floor(Game.player.damageDealt) : 0;

        screen.style.display = 'flex';
    },

    render() {
        const ctx = Game.ctx;
        const cw = Game.canvas.width;
        const ch = Game.canvas.height;

        // 清屏
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, cw, ch);

        if (Game.state === 'menu') return;

        if (Game.state === 'plane') {
            this._renderPlane(ctx);
            return;
        }

        // ===== 游戏渲染顺序 =====
        // 1. 地图
        GameMap.render(ctx, Game.camera);

        // 2. 物资
        LootManager.render(ctx, Game.camera);

        // 3. 空投
        AirdropManager.render(ctx, Game.camera);

        // 4. 死亡的Bot
        for (const bot of Game.bots) {
            if (bot.isDead) bot.render(ctx, Game.camera);
        }

        // 5. 活着的Bot
        for (const bot of Game.bots) {
            if (!bot.isDead) bot.render(ctx, Game.camera);
        }

        // 6. 玩家
        if (Game.player) Game.player.render(ctx, Game.camera);

        // 7. 子弹
        BulletManager.render(ctx, Game.camera);

        // 8. 粒子
        ParticleSystem.render(ctx, Game.camera);

        // 9. 毒圈
        if (Game.zone) Game.zone.render(ctx, Game.camera);

        // 10. 准心
        this._renderCrosshair(ctx);

        // 11. HUD (屏幕空间)
        HUD.render(ctx);

        // 12. 小地图
        Minimap.render(ctx);

        // 13. 大地图覆盖
        if (Game.showBigMap) {
            this._renderBigMap(ctx);
        }

        // FPS显示
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${Game.fps}`, 10, ch - 10);
    },

    _renderPlane(ctx) {
        // 渲染地图背景
        GameMap.render(ctx, Game.camera);

        // 飞机航线
        const sx = Game.planeStartX - Game.camera.x;
        const sy = Game.planeStartY - Game.camera.y;
        const ex = Game.planeEndX - Game.camera.x;
        const ey = Game.planeEndY - Game.camera.y;

        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);

        // 飞机
        const px = Game.planeX - Game.camera.x;
        const py = Game.planeY - Game.camera.y;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Game.planeAngle);

        // 机身
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(-20, -12);
        ctx.lineTo(-20, 12);
        ctx.closePath();
        ctx.fill();
        // 机翼
        ctx.fillStyle = '#888';
        ctx.fillRect(-12, -25, 10, 50);
        // 尾翼
        ctx.fillRect(-18, -8, 4, 16);
        ctx.restore();

        // 提示文字
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Rajdhani, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('点击鼠标或按空格键跳伞！', Game.canvas.width / 2, 80);

        ctx.font = '16px Rajdhani, sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('飞机正在飞越战场...', Game.canvas.width / 2, 110);
    },

    _renderCrosshair(ctx) {
        const mx = Input.mouse.x;
        const my = Input.mouse.y;
        const size = 12;
        const gap = 4;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;

        // 十字线
        ctx.beginPath();
        ctx.moveTo(mx - size, my);
        ctx.lineTo(mx - gap, my);
        ctx.moveTo(mx + gap, my);
        ctx.lineTo(mx + size, my);
        ctx.moveTo(mx, my - size);
        ctx.lineTo(mx, my - gap);
        ctx.moveTo(mx, my + gap);
        ctx.lineTo(mx, my + size);
        ctx.stroke();

        // 中心点
        ctx.fillStyle = 'rgba(255, 50, 50, 0.7)';
        ctx.beginPath();
        ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
        ctx.fill();
    },

    _renderBigMap(ctx) {
        const cw = Game.canvas.width;
        const ch = Game.canvas.height;
        const mapSize = Math.min(cw, ch) * 0.8;
        const mx = (cw - mapSize) / 2;
        const my = (ch - mapSize) / 2;
        const scale = mapSize / Game.MAP_WIDTH;

        // 背景遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, cw, ch);

        // 地图背景
        ctx.fillStyle = '#2a3a1c';
        ctx.fillRect(mx, my, mapSize, mapSize);

        // 道路
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mx, my + mapSize * 0.4);
        ctx.lineTo(mx + mapSize, my + mapSize * 0.4);
        ctx.moveTo(mx, my + mapSize * 0.75);
        ctx.lineTo(mx + mapSize, my + mapSize * 0.75);
        ctx.moveTo(mx + mapSize * 0.3, my);
        ctx.lineTo(mx + mapSize * 0.3, my + mapSize);
        ctx.moveTo(mx + mapSize * 0.7, my);
        ctx.lineTo(mx + mapSize * 0.7, my + mapSize);
        ctx.stroke();

        // 水域
        if (GameMap._lakes) {
            ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
            for (const lake of GameMap._lakes) {
                ctx.beginPath();
                ctx.ellipse(mx + lake.cx * scale, my + lake.cy * scale,
                    lake.rx * scale, lake.ry * scale, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 建筑物
        ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
        for (const b of Game.buildings) {
            ctx.fillRect(mx + b.x * scale, my + b.y * scale, b.width * scale, b.height * scale);
        }

        // 安全区
        if (Game.zone && Game.zone.currentPhase >= 0) {
            ctx.beginPath();
            ctx.arc(mx + Game.zone.currentCenter.x * scale, my + Game.zone.currentCenter.y * scale,
                Game.zone.currentRadius * scale, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(60, 120, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (Game.zone.state === 'waiting') {
                ctx.beginPath();
                ctx.arc(mx + Game.zone.nextCenter.x * scale, my + Game.zone.nextCenter.y * scale,
                    Game.zone.nextRadius * scale, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // 玩家
        if (Game.player && !Game.player.isDead) {
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(mx + Game.player.x * scale, my + Game.player.y * scale, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '12px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('你', mx + Game.player.x * scale, my + Game.player.y * scale - 10);
        }

        // 提示
        ctx.fillStyle = '#888';
        ctx.font = '14px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('按 M 关闭地图', cw / 2, my + mapSize + 25);
    }
};

// 页面加载完成后初始化
window.addEventListener('load', () => GameEngine.init());
