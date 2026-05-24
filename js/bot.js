// ======================================
// AI Bot 系统 (有限状态机)
// ======================================
const BOT_NAMES = [
    '战狼','猎鹰','夜枭','闪电','毒蛇','黑豹','苍龙','烈焰','寒冰','雷霆',
    '暗影','狂风','铁壁','银翼','金刃','碧血','幽灵','天鹰','地虎','玄武',
    '白虎','朱雀','青龙','赤焰','冰霜','疾风','破晓','暮光','星陨','月华'
];
const BOT_COLORS = [
    '#5D4037','#795548','#6D4C41','#4E342E','#3E2723',
    '#546E7A','#455A64','#37474F','#616161','#424242',
    '#8D6E63','#A1887F','#4E342E','#78909C','#607D8B'
];
let botNameIdx = 0;

class Bot {
    constructor(x, y, difficulty) {
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.radius = 15;
        this.hp = 100;
        this.maxHp = 100;
        this.armor = Math.random() < 0.3 ? 50 : 0;
        this.isDead = false;
        this.name = BOT_NAMES[botNameIdx % BOT_NAMES.length];
        botNameIdx++;
        this.difficulty = difficulty || 'medium';

        // 武器
        this.weapons = [null, null];
        this.currentSlot = 0;
        this.fireTimer = 0;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.ammo = { pistol: 90, shotgun: 30, rifle: 60, sniper: 20, smg: 60 };
        this.magAmmo = [0, 0];
        this.medkits = Math.random() < 0.4 ? 1 : 0;
        this.energyDrinks = 0;
        this.kills = 0;

        // AI 参数
        const diffSettings = {
            easy:   { detect: 250, accuracy: 0.35, reaction: 0.8, speed: 160, fireRateMul: 1.6 },
            medium: { detect: 350, accuracy: 0.55, reaction: 0.5, speed: 180, fireRateMul: 1.2 },
            hard:   { detect: 450, accuracy: 0.78, reaction: 0.25, speed: 195, fireRateMul: 1.0 }
        };
        const ds = diffSettings[this.difficulty] || diffSettings.medium;
        this.detectionRange = ds.detect;
        this.aimAccuracy = ds.accuracy;
        this.reactionTime = ds.reaction;
        this.speed = ds.speed;
        this.baseSpeed = ds.speed;
        this.fireRateMul = ds.fireRateMul;

        // AI 状态
        this.aiState = 'patrol';
        this.stateTimer = 0;
        this.target = null;
        this.targetPos = null;
        this.reactionTimer = 0;
        this.waypointX = x;
        this.waypointY = y;
        this.waypointTimer = 0;
        this.pauseTimer = 0;

        // 外观
        this.bodyColor = BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];
        this.isMoving = false;
        this.footstepTimer = 0;
        this.legPhase = Math.random() * Math.PI * 2;

        // 给bot初始武器
        this._assignInitialWeapon();
    }

    _assignInitialWeapon() {
        const types = ['pistol', 'pistol', 'smg', 'smg', 'shotgun', 'assault'];
        const t = types[Math.floor(Math.random() * types.length)];
        this.weapons[0] = { type: t };
        const wd = WeaponData[t];
        if (wd) this.magAmmo[0] = wd.magSize;
    }

    getCurrentWeapon() { return this.weapons[this.currentSlot]; }
    getCurrentWeaponData() {
        const w = this.getCurrentWeapon();
        return w ? WeaponData[w.type] : null;
    }

    update(dt) {
        if (this.isDead) return;

        this.updateAI(dt);

        // 换弹
        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.isReloading = false;
                const wd = this.getCurrentWeaponData();
                if (wd) {
                    const needed = wd.magSize - this.magAmmo[this.currentSlot];
                    const avail = Math.min(needed, this.ammo[wd.ammoType] || 0);
                    this.magAmmo[this.currentSlot] += avail;
                    this.ammo[wd.ammoType] = (this.ammo[wd.ammoType] || 0) - avail;
                }
            }
        }

        this.fireTimer -= dt;
        if (this.fireTimer < 0) this.fireTimer = 0;

        // 毒圈伤害
        if (Game.zone && !Game.zone.isInSafeZone(this.x, this.y)) {
            const dmg = Game.zone.getDamage() * dt;
            if (dmg > 0) this.takeDamage(dmg, null, true);
        }
    }

    updateAI(dt) {
        // 优先级检查
        // 1. 毒圈检查
        if (Game.zone && Game.zone.currentPhase >= 0 && !Game.zone.isInSafeZone(this.x, this.y)) {
            const distToCenter = Math.hypot(this.x - Game.zone.currentCenter.x, this.y - Game.zone.currentCenter.y);
            if (distToCenter > Game.zone.currentRadius * 0.8) {
                this.aiState = 'moveToZone';
            }
        }

        // 2. 低血量检查
        if (this.hp < 30 && this.medkits > 0) {
            this.heal();
        }

        // 3. 敌人检测
        if (this.aiState !== 'moveToZone') {
            const enemy = this.findNearestEnemy();
            if (enemy && this.aiState !== 'flee') {
                if (this.hp < 25 && this.aiState === 'combat') {
                    this.aiState = 'flee';
                    this.target = enemy;
                } else if (this.aiState !== 'combat') {
                    this.aiState = 'combat';
                    this.target = enemy;
                    this.reactionTimer = this.reactionTime;
                }
            }
        }

        // 执行当前状态
        switch (this.aiState) {
            case 'patrol': this.patrolBehavior(dt); break;
            case 'loot': this.lootBehavior(dt); break;
            case 'combat': this.combatBehavior(dt); break;
            case 'flee': this.fleeBehavior(dt); break;
            case 'moveToZone': this.moveToZoneBehavior(dt); break;
        }
    }

    patrolBehavior(dt) {
        this.waypointTimer -= dt;

        if (this.pauseTimer > 0) {
            this.pauseTimer -= dt;
            this.isMoving = false;
            return;
        }

        if (this.waypointTimer <= 0) {
            // 新路径点
            this.waypointX = Math.max(100, Math.min(Game.MAP_WIDTH - 100,
                this.x + (Math.random() - 0.5) * 600));
            this.waypointY = Math.max(100, Math.min(Game.MAP_HEIGHT - 100,
                this.y + (Math.random() - 0.5) * 600));
            this.waypointTimer = 4 + Math.random() * 6;

            // 随机暂停
            if (Math.random() < 0.2) {
                this.pauseTimer = 1 + Math.random() * 2;
            }
        }

        this.moveToward(this.waypointX, this.waypointY, dt);

        // 路过物资自动拾取
        const nearLoot = LootManager.getNearbyLoot(this.x, this.y, 40);
        if (nearLoot.length > 0) {
            this._autoPickup(nearLoot[0]);
        }

        // 检查附近是否有有价值的物资
        if (!this.weapons[0] || (!this.weapons[1] && Math.random() < 0.01)) {
            const loot = this._findNearbyWeapon();
            if (loot) {
                this.aiState = 'loot';
                this.targetPos = { x: loot.x, y: loot.y };
            }
        }
    }

    lootBehavior(dt) {
        if (!this.targetPos) { this.aiState = 'patrol'; return; }

        this.moveToward(this.targetPos.x, this.targetPos.y, dt);

        const dist = Math.hypot(this.x - this.targetPos.x, this.y - this.targetPos.y);
        if (dist < 40) {
            const nearby = LootManager.getNearbyLoot(this.x, this.y, 50);
            if (nearby.length > 0) {
                this._autoPickup(nearby[0]);
            }
            this.aiState = 'patrol';
            this.targetPos = null;
        }
    }

    combatBehavior(dt) {
        if (!this.target || this.target.isDead) {
            this.target = null;
            this.aiState = 'patrol';
            return;
        }

        const dist = Math.hypot(this.x - this.target.x, this.y - this.target.y);
        if (dist > this.detectionRange * 1.5) {
            this.target = null;
            this.aiState = 'patrol';
            return;
        }

        // 反应时间
        if (this.reactionTimer > 0) {
            this.reactionTimer -= dt;
            // 转向目标
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            return;
        }

        // 战斗移动
        const wd = this.getCurrentWeaponData();
        const preferDist = wd ? (wd.type === 'shotgun' ? 80 : wd.type === 'sniper' ? 400 : 200) : 200;

        if (dist > preferDist + 50) {
            this.moveToward(this.target.x, this.target.y, dt);
        } else if (dist < preferDist - 50) {
            // 拉开距离
            const awayAngle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
            const moveX = this.x + Math.cos(awayAngle) * 100;
            const moveY = this.y + Math.sin(awayAngle) * 100;
            this.moveToward(moveX, moveY, dt);
        } else {
            // 横向移动（闪避）
            this.stateTimer += dt;
            const strafeAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x) +
                Math.PI / 2 * Math.sign(Math.sin(this.stateTimer * 2));
            const moveX = this.x + Math.cos(strafeAngle) * 50;
            const moveY = this.y + Math.sin(strafeAngle) * 50;
            this.moveToward(moveX, moveY, dt);
        }

        // 瞄准和射击
        this.aimAndShoot(this.target, dt);
    }

    fleeBehavior(dt) {
        if (!this.target) { this.aiState = 'patrol'; return; }

        const fleeAngle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
        const fleeX = this.x + Math.cos(fleeAngle) * 300;
        const fleeY = this.y + Math.sin(fleeAngle) * 300;
        this.moveToward(fleeX, fleeY, dt);

        // 治疗
        if (this.medkits > 0 && this.hp < 50) this.heal();

        // 恢复
        const dist = this.target ? Math.hypot(this.x - this.target.x, this.y - this.target.y) : 999;
        if (this.hp > 50 || dist > 400) {
            this.aiState = 'patrol';
            this.target = null;
        }
    }

    moveToZoneBehavior(dt) {
        if (!Game.zone) { this.aiState = 'patrol'; return; }

        const cx = Game.zone.currentCenter.x;
        const cy = Game.zone.currentCenter.y;
        this.moveToward(cx, cy, dt);

        if (Game.zone.isInSafeZone(this.x, this.y)) {
            this.aiState = 'patrol';
        }

        // 跑圈途中也要战斗
        const enemy = this.findNearestEnemy();
        if (enemy) {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (dist < 150) {
                this.aimAndShoot(enemy, dt);
            }
        }
    }

    moveToward(tx, ty, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) { this.isMoving = false; return; }

        const moveAngle = Math.atan2(dy, dx);
        let spd = this.speed;

        // 灌木减速
        for (const obs of Game.obstacles) {
            if (obs.type === 'bush' && Math.hypot(this.x - obs.x, this.y - obs.y) < obs.radius) {
                spd *= 0.6; break;
            }
        }

        const newX = this.x + Math.cos(moveAngle) * spd * dt;
        const newY = this.y + Math.sin(moveAngle) * spd * dt;

        // 碰撞检测（简化版）
        if (this._canMoveTo(newX, this.y)) this.x = newX;
        else {
            // 尝试绕行
            const altX = this.x + Math.cos(moveAngle + 0.7) * spd * dt;
            if (this._canMoveTo(altX, this.y)) this.x = altX;
        }
        if (this._canMoveTo(this.x, newY)) this.y = newY;
        else {
            const altY = this.y + Math.sin(moveAngle + 0.7) * spd * dt;
            if (this._canMoveTo(this.x, altY)) this.y = altY;
        }

        this.x = Math.max(20, Math.min(Game.MAP_WIDTH - 20, this.x));
        this.y = Math.max(20, Math.min(Game.MAP_HEIGHT - 20, this.y));

        // 非战斗时面向移动方向
        if (this.aiState !== 'combat') {
            this.angle = moveAngle;
        }
        this.isMoving = true;
        this.legPhase += dt * 10;
    }

    _canMoveTo(nx, ny) {
        if (!GameMap.isWalkable(nx, ny)) return false;
        if (!GameMap.isWalkable(nx + this.radius, ny)) return false;
        if (!GameMap.isWalkable(nx - this.radius, ny)) return false;
        if (!GameMap.isWalkable(nx, ny + this.radius)) return false;
        if (!GameMap.isWalkable(nx, ny - this.radius)) return false;
        for (const obs of Game.obstacles) {
            if (obs.type === 'bush') continue;
            if (Math.hypot(nx - obs.x, ny - obs.y) < this.radius + obs.radius) return false;
        }
        return true;
    }

    aimAndShoot(target, dt) {
        const wd = this.getCurrentWeaponData();
        if (!wd || this.isReloading) return;

        // 瞄准
        const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
        // 添加不精准度
        const inaccuracy = (1 - this.aimAccuracy) * 0.5;
        this.angle = targetAngle + (Math.random() - 0.5) * inaccuracy;

        // 射击
        if (this.fireTimer <= 0 && this.magAmmo[this.currentSlot] > 0) {
            const muzzleX = this.x + Math.cos(this.angle) * 20;
            const muzzleY = this.y + Math.sin(this.angle) * 20;

            if (wd.pellets) {
                for (let i = 0; i < wd.pellets; i++) {
                    Game.bullets.push(new Bullet(muzzleX, muzzleY, this.angle, wd, this));
                }
            } else {
                Game.bullets.push(new Bullet(muzzleX, muzzleY, this.angle, wd, this));
            }

            ParticleSystem.emit('muzzleFlash', this.x, this.y, { angle: this.angle });
            AudioManager.play(wd.type);
            this.fireTimer = wd.fireRate * this.fireRateMul;
            this.magAmmo[this.currentSlot]--;

            if (this.magAmmo[this.currentSlot] <= 0) {
                this._startReload();
            }
        }
    }

    _startReload() {
        const wd = this.getCurrentWeaponData();
        if (!wd || this.isReloading) return;
        if ((this.ammo[wd.ammoType] || 0) <= 0) return;
        this.isReloading = true;
        this.reloadTimer = wd.reloadTime;
    }

    findNearestEnemy() {
        let nearest = null;
        let nearestDist = this.detectionRange;

        // 检查玩家
        if (Game.player && !Game.player.isDead) {
            const d = Math.hypot(this.x - Game.player.x, this.y - Game.player.y);
            if (d < nearestDist) {
                nearest = Game.player;
                nearestDist = d;
            }
        }
        // 检查其他bot
        for (const bot of Game.bots) {
            if (bot === this || bot.isDead) continue;
            const d = Math.hypot(this.x - bot.x, this.y - bot.y);
            if (d < nearestDist) {
                nearest = bot;
                nearestDist = d;
            }
        }
        return nearest;
    }

    _findNearbyWeapon() {
        let best = null;
        let bestDist = 200;
        for (const item of Game.lootItems) {
            if (!item.alive || item.type !== 'weapon') continue;
            const d = Math.hypot(this.x - item.x, this.y - item.y);
            if (d < bestDist) {
                best = item;
                bestDist = d;
            }
        }
        return best;
    }

    _autoPickup(item) {
        if (!item.alive) return;
        switch (item.type) {
            case 'weapon':
                if (!this.weapons[0]) {
                    this.weapons[0] = { type: item.subType };
                    this.magAmmo[0] = WeaponData[item.subType]?.magSize || 10;
                    this.currentSlot = 0;
                } else if (!this.weapons[1]) {
                    this.weapons[1] = { type: item.subType };
                    this.magAmmo[1] = WeaponData[item.subType]?.magSize || 10;
                }
                break;
            case 'ammo':
                this.ammo[item.subType] = (this.ammo[item.subType] || 0) + item.amount;
                break;
            case 'health':
                this.medkits++;
                break;
            case 'armor':
                this.armor = Math.min(100, this.armor + 50);
                break;
            case 'energy':
                this.energyDrinks++;
                break;
        }
        item.alive = false;
    }

    takeDamage(amount, attacker, isZone = false) {
        if (this.isDead) return;
        if (this.armor > 0 && !isZone) {
            const armorDmg = amount * 0.7;
            this.hp -= amount * 0.3;
            this.armor = Math.max(0, this.armor - armorDmg);
            if (this.armor <= 0) this.hp -= Math.abs(this.armor);
        } else {
            this.hp -= amount;
        }

        // 被攻击时切换到战斗状态
        if (attacker && !isZone && this.aiState !== 'combat') {
            this.aiState = 'combat';
            this.target = attacker === 'player' ? Game.player : attacker;
            this.reactionTimer = this.reactionTime * 0.5; // 被打时反应更快
        }

        // 记录伤害来源
        if (attacker === 'player' && Game.player) {
            Game.player.damageDealt += amount;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die(attacker);
        }
    }

    die(killer) {
        this.isDead = true;
        LootManager.dropLoot(this.x, this.y, this);
        Game.aliveCount--;

        const killerName = killer === 'player' ? '你' :
            (killer && killer.name ? killer.name : '毒圈');
        const wd = killer && killer !== 'player' && killer.getCurrentWeaponData
            ? killer.getCurrentWeaponData() : null;
        HUD.addKillFeed(killerName, this.name, wd ? wd.name : '');

        if (killer === 'player' && Game.player) {
            Game.player.kills++;
            AudioManager.play('kill');
        } else if (killer && killer.kills !== undefined) {
            killer.kills++;
        }

        ParticleSystem.emit('blood', this.x, this.y, { count: 8 });
    }

    heal() {
        if (this.medkits <= 0 || this.hp >= this.maxHp) return;
        this.medkits--;
        this.hp = Math.min(this.maxHp, this.hp + 50);
    }

    render(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx < -30 || sx > ctx.canvas.width + 30 || sy < -30 || sy > ctx.canvas.height + 30) return;

        ctx.save();
        ctx.translate(sx, sy);

        if (this.isDead) {
            // 死亡标记
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#c00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
            ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        // 腿部
        if (this.isMoving) {
            const legOff = Math.sin(this.legPhase) * 4;
            ctx.fillStyle = this.bodyColor;
            ctx.beginPath();
            ctx.arc(Math.cos(this.angle + 2.5) * 7, Math.sin(this.angle + 2.5) * 7 + legOff * 0.3, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(Math.cos(this.angle - 2.5) * 7, Math.sin(this.angle - 2.5) * 7 - legOff * 0.3, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 身体
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 头部
        ctx.fillStyle = '#FFCC80';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // 难度标记
        if (this.difficulty === 'hard') {
            ctx.fillStyle = '#F44336';
            ctx.beginPath();
            ctx.arc(0, -this.radius - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 武器
        const wd = this.getCurrentWeaponData();
        if (wd) {
            const gunLen = wd.type === 'sniper' ? 26 : wd.type === 'pistol' ? 14 : 20;
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(this.angle) * 7, Math.sin(this.angle) * 7);
            ctx.lineTo(Math.cos(this.angle) * gunLen, Math.sin(this.angle) * gunLen);
            ctx.stroke();
        }

        // 血量条（只在受伤时显示）
        if (this.hp < this.maxHp) {
            const barW = 30;
            const barH = 3;
            const hpRatio = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -this.radius - 12, barW, barH);
            ctx.fillStyle = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FFC107' : '#F44336';
            ctx.fillRect(-barW / 2, -this.radius - 12, barW * hpRatio, barH);
        }

        ctx.restore();
    }
}
window.Bot = Bot;
