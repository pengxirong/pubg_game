// ======================================
// 地图系统 - 程序化生成
// ======================================
window.GameMap = {
    grid: [],
    gridCols: 0,
    gridRows: 0,
    terrainCanvas: null,
    generated: false,

    generate() {
        const W = Game.MAP_WIDTH;
        const H = Game.MAP_HEIGHT;
        const T = Game.TILE_SIZE;
        this.gridCols = Math.ceil(W / T);
        this.gridRows = Math.ceil(H / T);

        // 初始化碰撞网格 (0=可通行)
        this.grid = [];
        for (let r = 0; r < this.gridRows; r++) {
            this.grid[r] = new Uint8Array(this.gridCols);
        }

        Game.buildings = [];
        Game.obstacles = [];

        // 生成水域
        this._generateWater();

        // 生成建筑
        this._generateBuildings();

        // 生成道路（连接建筑）
        // (简化：不生成道路，保持地图简洁)

        // 生成障碍物
        this._generateObstacles();

        // 预渲染地形
        this._renderTerrain();

        this.generated = true;
    },

    _generateWater() {
        const T = Game.TILE_SIZE;
        // 2-3个小湖泊
        const lakes = [
            { cx: 800 + Math.random() * 400, cy: 800 + Math.random() * 400, rx: 120 + Math.random() * 80, ry: 80 + Math.random() * 60 },
            { cx: 2800 + Math.random() * 400, cy: 1200 + Math.random() * 400, rx: 100 + Math.random() * 60, ry: 120 + Math.random() * 80 },
            { cx: 1500 + Math.random() * 500, cy: 3200 + Math.random() * 400, rx: 150 + Math.random() * 80, ry: 90 + Math.random() * 60 },
        ];
        this._lakes = lakes;

        for (const lake of lakes) {
            for (let r = 0; r < this.gridRows; r++) {
                for (let c = 0; c < this.gridCols; c++) {
                    const x = c * T + T / 2;
                    const y = r * T + T / 2;
                    const dx = (x - lake.cx) / lake.rx;
                    const dy = (y - lake.cy) / lake.ry;
                    if (dx * dx + dy * dy < 1) {
                        this.grid[r][c] = 2; // 水
                    }
                }
            }
        }
    },

    _generateBuildings() {
        const T = Game.TILE_SIZE;
        const buildingDefs = [
            { type: 'house', w: 120, h: 100, color: '#6D4C41', roof: '#5D4037' },
            { type: 'house', w: 100, h: 80, color: '#795548', roof: '#5D4037' },
            { type: 'warehouse', w: 160, h: 100, color: '#607D8B', roof: '#546E7A' },
            { type: 'shed', w: 60, h: 60, color: '#8D6E63', roof: '#6D4C41' },
            { type: 'tower', w: 50, h: 50, color: '#78909C', roof: '#607D8B' },
        ];

        const numBuildings = 20 + Math.floor(Math.random() * 8);
        const margin = 200;

        for (let i = 0; i < numBuildings; i++) {
            const def = buildingDefs[Math.floor(Math.random() * buildingDefs.length)];
            let placed = false;

            for (let attempt = 0; attempt < 30; attempt++) {
                const x = margin + Math.random() * (Game.MAP_WIDTH - 2 * margin - def.w);
                const y = margin + Math.random() * (Game.MAP_HEIGHT - 2 * margin - def.h);

                // 检查是否与已有建筑重叠
                let overlap = false;
                for (const b of Game.buildings) {
                    if (x < b.x + b.width + 40 && x + def.w + 40 > b.x &&
                        y < b.y + b.height + 40 && y + def.h + 40 > b.y) {
                        overlap = true;
                        break;
                    }
                }
                // 检查是否在水上
                const gr = Math.floor((y + def.h / 2) / T);
                const gc = Math.floor((x + def.w / 2) / T);
                if (gr >= 0 && gr < this.gridRows && gc >= 0 && gc < this.gridCols && this.grid[gr][gc] === 2) {
                    overlap = true;
                }

                if (!overlap) {
                    const building = this._createBuilding(x, y, def);
                    Game.buildings.push(building);
                    this._markBuildingOnGrid(building);
                    placed = true;
                    break;
                }
            }
        }
    },

    _createBuilding(x, y, def) {
        const wallThick = 8;
        const doorWidth = 30;
        const w = def.w;
        const h = def.h;
        const walls = [];
        const doors = [];

        // 门的位置（随机一个边）
        const doorSide = Math.floor(Math.random() * 4);
        let doorX, doorY, doorW, doorH;

        // 上墙
        if (doorSide === 0) {
            const doorStart = x + w * 0.3 + Math.random() * w * 0.3;
            walls.push({ x: x, y: y, w: doorStart - x, h: wallThick });
            walls.push({ x: doorStart + doorWidth, y: y, w: x + w - doorStart - doorWidth, h: wallThick });
            doors.push({ x: doorStart, y: y, w: doorWidth, h: wallThick });
        } else {
            walls.push({ x: x, y: y, w: w, h: wallThick });
        }
        // 下墙
        if (doorSide === 2) {
            const doorStart = x + w * 0.3 + Math.random() * w * 0.3;
            walls.push({ x: x, y: y + h - wallThick, w: doorStart - x, h: wallThick });
            walls.push({ x: doorStart + doorWidth, y: y + h - wallThick, w: x + w - doorStart - doorWidth, h: wallThick });
            doors.push({ x: doorStart, y: y + h - wallThick, w: doorWidth, h: wallThick });
        } else {
            walls.push({ x: x, y: y + h - wallThick, w: w, h: wallThick });
        }
        // 左墙
        if (doorSide === 3) {
            const doorStart = y + h * 0.3 + Math.random() * h * 0.3;
            walls.push({ x: x, y: y, w: wallThick, h: doorStart - y });
            walls.push({ x: x, y: doorStart + doorWidth, w: wallThick, h: y + h - doorStart - doorWidth });
            doors.push({ x: x, y: doorStart, w: wallThick, h: doorWidth });
        } else {
            walls.push({ x: x, y: y, w: wallThick, h: h });
        }
        // 右墙
        if (doorSide === 1) {
            const doorStart = y + h * 0.3 + Math.random() * h * 0.3;
            walls.push({ x: x + w - wallThick, y: y, w: wallThick, h: doorStart - y });
            walls.push({ x: x + w - wallThick, y: doorStart + doorWidth, w: wallThick, h: y + h - doorStart - doorWidth });
            doors.push({ x: x + w - wallThick, y: doorStart, w: wallThick, h: doorWidth });
        } else {
            walls.push({ x: x + w - wallThick, y: y, w: wallThick, h: h });
        }

        return {
            x, y, width: w, height: h,
            type: def.type, color: def.color, roofColor: def.roof,
            walls, doors
        };
    },

    _markBuildingOnGrid(building) {
        const T = Game.TILE_SIZE;
        for (const wall of building.walls) {
            const startC = Math.floor(wall.x / T);
            const endC = Math.ceil((wall.x + wall.w) / T);
            const startR = Math.floor(wall.y / T);
            const endR = Math.ceil((wall.y + wall.h) / T);
            for (let r = startR; r < endR && r < this.gridRows; r++) {
                for (let c = startC; c < endC && c < this.gridCols; c++) {
                    if (r >= 0 && c >= 0) this.grid[r][c] = 1;
                }
            }
        }
    },

    _generateObstacles() {
        const types = [
            { type: 'tree', radius: 18, color: '#2E7D32', count: 150 },
            { type: 'rock', radius: 16, color: '#757575', count: 60 },
            { type: 'crate', radius: 12, color: '#6D4C41', count: 30 },
            { type: 'bush', radius: 15, color: '#1B5E20', count: 80 },
        ];

        for (const def of types) {
            for (let i = 0; i < def.count; i++) {
                for (let attempt = 0; attempt < 10; attempt++) {
                    const x = 50 + Math.random() * (Game.MAP_WIDTH - 100);
                    const y = 50 + Math.random() * (Game.MAP_HEIGHT - 100);

                    // 检查是否在建筑内
                    let inBuilding = false;
                    for (const b of Game.buildings) {
                        if (x > b.x - 10 && x < b.x + b.width + 10 &&
                            y > b.y - 10 && y < b.y + b.height + 10) {
                            inBuilding = true;
                            break;
                        }
                    }
                    if (inBuilding) continue;

                    // 检查是否在水上
                    if (!this.isWalkable(x, y)) continue;

                    // 检查与其他障碍物距离
                    let tooClose = false;
                    for (const obs of Game.obstacles) {
                        if (Math.hypot(x - obs.x, y - obs.y) < obs.radius + def.radius + 5) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (tooClose) continue;

                    Game.obstacles.push({
                        x, y,
                        radius: def.radius,
                        type: def.type,
                        color: def.color,
                        destructible: def.type === 'crate'
                    });
                    break;
                }
            }
        }
    },

    _renderTerrain() {
        const W = Game.MAP_WIDTH;
        const H = Game.MAP_HEIGHT;
        this.terrainCanvas = document.createElement('canvas');
        this.terrainCanvas.width = W;
        this.terrainCanvas.height = H;
        const tctx = this.terrainCanvas.getContext('2d');

        // 基础草地
        tctx.fillStyle = '#3a5a1c';
        tctx.fillRect(0, 0, W, H);

        // 使用伪随机色块增加纹理变化
        const seed = 42;
        for (let i = 0; i < 800; i++) {
            const bx = ((i * 7919 + seed) % W);
            const by = ((i * 6271 + seed) % H);
            const bs = 30 + (i % 60);
            const shade = (i % 3 === 0) ? 'rgba(50, 100, 20, 0.3)' : 'rgba(30, 70, 15, 0.2)';
            tctx.fillStyle = shade;
            tctx.beginPath();
            tctx.arc(bx, by, bs, 0, Math.PI * 2);
            tctx.fill();
        }

        // 沙地区域
        const sandAreas = [
            { x: 3000, y: 200, w: 600, h: 500 },
            { x: 200, y: 2800, w: 500, h: 400 },
        ];
        for (const sa of sandAreas) {
            tctx.fillStyle = 'rgba(160, 140, 100, 0.6)';
            tctx.beginPath();
            tctx.ellipse(sa.x + sa.w / 2, sa.y + sa.h / 2, sa.w / 2, sa.h / 2, 0, 0, Math.PI * 2);
            tctx.fill();
            // 沙地纹理
            for (let j = 0; j < 50; j++) {
                const sx = sa.x + Math.random() * sa.w;
                const sy = sa.y + Math.random() * sa.h;
                tctx.fillStyle = 'rgba(180, 160, 110, 0.3)';
                tctx.beginPath();
                tctx.arc(sx, sy, 10 + Math.random() * 15, 0, Math.PI * 2);
                tctx.fill();
            }
        }

        // 道路
        tctx.strokeStyle = '#555';
        tctx.lineWidth = 30;
        tctx.lineCap = 'round';
        // 横向道路
        tctx.beginPath();
        tctx.moveTo(0, H * 0.4);
        tctx.lineTo(W, H * 0.4);
        tctx.stroke();
        tctx.beginPath();
        tctx.moveTo(0, H * 0.75);
        tctx.lineTo(W, H * 0.75);
        tctx.stroke();
        // 纵向道路
        tctx.beginPath();
        tctx.moveTo(W * 0.3, 0);
        tctx.lineTo(W * 0.3, H);
        tctx.stroke();
        tctx.beginPath();
        tctx.moveTo(W * 0.7, 0);
        tctx.lineTo(W * 0.7, H);
        tctx.stroke();
        // 道路线
        tctx.strokeStyle = '#666';
        tctx.lineWidth = 1;
        tctx.setLineDash([15, 15]);
        tctx.beginPath();
        tctx.moveTo(0, H * 0.4);
        tctx.lineTo(W, H * 0.4);
        tctx.moveTo(0, H * 0.75);
        tctx.lineTo(W, H * 0.75);
        tctx.moveTo(W * 0.3, 0);
        tctx.lineTo(W * 0.3, H);
        tctx.moveTo(W * 0.7, 0);
        tctx.lineTo(W * 0.7, H);
        tctx.stroke();
        tctx.setLineDash([]);

        // 水域
        if (this._lakes) {
            for (const lake of this._lakes) {
                const grad = tctx.createRadialGradient(
                    lake.cx, lake.cy, 0,
                    lake.cx, lake.cy, Math.max(lake.rx, lake.ry)
                );
                grad.addColorStop(0, '#1565C0');
                grad.addColorStop(0.7, '#1976D2');
                grad.addColorStop(1, '#2196F3');
                tctx.fillStyle = grad;
                tctx.beginPath();
                tctx.ellipse(lake.cx, lake.cy, lake.rx, lake.ry, 0, 0, Math.PI * 2);
                tctx.fill();

                // 水面光泽
                tctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                tctx.beginPath();
                tctx.ellipse(lake.cx - lake.rx * 0.2, lake.cy - lake.ry * 0.2,
                    lake.rx * 0.4, lake.ry * 0.3, -0.3, 0, Math.PI * 2);
                tctx.fill();
            }
        }

        // 小草细节
        tctx.fillStyle = 'rgba(40, 80, 20, 0.4)';
        for (let i = 0; i < 3000; i++) {
            const gx = Math.random() * W;
            const gy = Math.random() * H;
            tctx.fillRect(gx, gy, 1, 3 + Math.random() * 3);
        }

        // 地图边框
        tctx.strokeStyle = '#FF4444';
        tctx.lineWidth = 6;
        tctx.setLineDash([]);
        tctx.strokeRect(3, 3, W - 6, H - 6);
    },

    isWalkable(x, y) {
        const T = Game.TILE_SIZE;
        const c = Math.floor(x / T);
        const r = Math.floor(y / T);
        if (r < 0 || r >= this.gridRows || c < 0 || c >= this.gridCols) return false;
        return this.grid[r][c] === 0;
    },

    isPositionClear(x, y, radius) {
        // 检查网格
        const offsets = [
            [0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius],
            [radius * 0.7, radius * 0.7], [-radius * 0.7, radius * 0.7],
            [radius * 0.7, -radius * 0.7], [-radius * 0.7, -radius * 0.7]
        ];
        for (const [ox, oy] of offsets) {
            if (!this.isWalkable(x + ox, y + oy)) return false;
        }
        // 检查障碍物
        for (const obs of Game.obstacles) {
            if (obs.type === 'bush') continue;
            if (Math.hypot(x - obs.x, y - obs.y) < radius + obs.radius) return false;
        }
        return true;
    },

    getRandomOpenPosition() {
        for (let i = 0; i < 100; i++) {
            const x = 100 + Math.random() * (Game.MAP_WIDTH - 200);
            const y = 100 + Math.random() * (Game.MAP_HEIGHT - 200);
            if (this.isPositionClear(x, y, 20)) return { x, y };
        }
        return { x: Game.MAP_WIDTH / 2, y: Game.MAP_HEIGHT / 2 };
    },

    render(ctx, camera) {
        if (!this.terrainCanvas) return;

        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;

        // 绘制地形（只绘制可见区域）
        const sx = Math.max(0, Math.floor(camera.x));
        const sy = Math.max(0, Math.floor(camera.y));
        const sw = Math.min(this.terrainCanvas.width - sx, cw);
        const sh = Math.min(this.terrainCanvas.height - sy, ch);
        if (sw > 0 && sh > 0) {
            ctx.drawImage(this.terrainCanvas, sx, sy, sw, sh, sx - camera.x, sy - camera.y, sw, sh);
        }

        // 绘制地图外区域
        ctx.fillStyle = '#111';
        if (camera.x < 0) ctx.fillRect(0, 0, -camera.x, ch);
        if (camera.y < 0) ctx.fillRect(0, 0, cw, -camera.y);
        if (camera.x + cw > Game.MAP_WIDTH) ctx.fillRect(Game.MAP_WIDTH - camera.x, 0, cw, ch);
        if (camera.y + ch > Game.MAP_HEIGHT) ctx.fillRect(0, Game.MAP_HEIGHT - camera.y, cw, ch);

        // 绘制建筑物（只绘制可见的）
        for (const b of Game.buildings) {
            if (b.x + b.width < camera.x || b.x > camera.x + cw ||
                b.y + b.height < camera.y || b.y > camera.y + ch) continue;
            this._renderBuilding(ctx, b, camera);
        }

        // 绘制障碍物（只绘制可见的）
        for (const obs of Game.obstacles) {
            const osx = obs.x - camera.x;
            const osy = obs.y - camera.y;
            if (osx < -30 || osx > cw + 30 || osy < -30 || osy > ch + 30) continue;
            this._renderObstacle(ctx, obs, camera);
        }
    },

    _renderBuilding(ctx, b, camera) {
        const bx = b.x - camera.x;
        const by = b.y - camera.y;

        // 建筑阴影
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(bx + 4, by + 4, b.width, b.height);

        // 建筑地板
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(bx, by, b.width, b.height);

        // 墙壁
        for (const wall of b.walls) {
            ctx.fillStyle = b.color;
            ctx.fillRect(wall.x - camera.x, wall.y - camera.y, wall.w, wall.h);
            ctx.strokeStyle = '#3E2723';
            ctx.lineWidth = 1;
            ctx.strokeRect(wall.x - camera.x, wall.y - camera.y, wall.w, wall.h);
        }

        // 门
        for (const door of b.doors) {
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(door.x - camera.x, door.y - camera.y, door.w, door.h);
        }

        // 屋顶纹理线
        ctx.strokeStyle = b.roofColor || '#5D4037';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < b.width; i += 15) {
            ctx.beginPath();
            ctx.moveTo(bx + i, by);
            ctx.lineTo(bx + i, by + b.height);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },

    _renderObstacle(ctx, obs, camera) {
        const ox = obs.x - camera.x;
        const oy = obs.y - camera.y;

        switch (obs.type) {
            case 'tree':
                // 树干
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(ox - 3, oy - 3, 6, 6);
                // 树冠阴影
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.arc(ox + 3, oy + 3, obs.radius, 0, Math.PI * 2);
                ctx.fill();
                // 树冠
                ctx.fillStyle = obs.color;
                ctx.beginPath();
                ctx.arc(ox, oy, obs.radius, 0, Math.PI * 2);
                ctx.fill();
                // 高光
                ctx.fillStyle = 'rgba(80, 180, 60, 0.3)';
                ctx.beginPath();
                ctx.arc(ox - 4, oy - 4, obs.radius * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'rock':
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(ox + 2, oy + 3, obs.radius, obs.radius * 0.7, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = obs.color;
                ctx.beginPath();
                ctx.ellipse(ox, oy, obs.radius, obs.radius * 0.7, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(200,200,200,0.2)';
                ctx.beginPath();
                ctx.ellipse(ox - 3, oy - 3, obs.radius * 0.4, obs.radius * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'crate':
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(ox - obs.radius + 2, oy - obs.radius + 2, obs.radius * 2, obs.radius * 2);
                ctx.fillStyle = obs.color;
                ctx.fillRect(ox - obs.radius, oy - obs.radius, obs.radius * 2, obs.radius * 2);
                ctx.strokeStyle = '#4E342E';
                ctx.lineWidth = 1;
                ctx.strokeRect(ox - obs.radius, oy - obs.radius, obs.radius * 2, obs.radius * 2);
                // 木纹
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.beginPath();
                ctx.moveTo(ox - obs.radius, oy);
                ctx.lineTo(ox + obs.radius, oy);
                ctx.stroke();
                break;

            case 'bush':
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = obs.color;
                ctx.beginPath();
                ctx.arc(ox, oy, obs.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(50, 120, 30, 0.4)';
                ctx.beginPath();
                ctx.arc(ox - 3, oy - 2, obs.radius * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
        }
    }
};
