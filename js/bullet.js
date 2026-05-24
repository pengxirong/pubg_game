// ======================================
// 子弹系统
// ======================================
class Bullet {
    constructor(x, y, angle, weaponData, owner) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.angle = angle + (Math.random() - 0.5) * weaponData.spread;
        this.speed = weaponData.bulletSpeed;
        this.damage = weaponData.damage;
        this.range = weaponData.range;
        this.owner = owner; // 'player' 或 bot实例
        this.weaponType = weaponData.type;
        this.color = weaponData.color;
        this.alive = true;
        this.trail = [];
    }

    update(dt) {
        if (!this.alive) return;

        // 记录轨迹
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();

        // 移动
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;

        // 射程检测
        const dist = Math.hypot(this.x - this.startX, this.y - this.startY);
        if (dist > this.range) { this.alive = false; return; }

        // 边界检测
        if (this.x < 0 || this.x > Game.MAP_WIDTH || this.y < 0 || this.y > Game.MAP_HEIGHT) {
            this.alive = false; return;
        }

        // 建筑碰撞
        for (const b of Game.buildings) {
            for (const w of b.walls) {
                if (this.x >= w.x && this.x <= w.x + w.w && this.y >= w.y && this.y <= w.y + w.h) {
                    this.alive = false;
                    ParticleSystem.emit('bulletImpact', this.x, this.y);
                    return;
                }
            }
        }

        // 障碍物碰撞
        for (const obs of Game.obstacles) {
            if (obs.type === 'bush') continue; // 灌木不阻挡子弹
            const d = Math.hypot(this.x - obs.x, this.y - obs.y);
            if (d < obs.radius) {
                this.alive = false;
                ParticleSystem.emit('bulletImpact', this.x, this.y);
                return;
            }
        }

        // 命中角色检测
        if (this.owner === 'player') {
            for (const bot of Game.bots) {
                if (bot.isDead) continue;
                if (this._hitCheck(bot)) return;
            }
        } else {
            // Bot的子弹检测玩家
            if (Game.player && !Game.player.isDead) {
                if (this._hitCheck(Game.player)) return;
            }
            // 也检测其他bot（混战）
            for (const bot of Game.bots) {
                if (bot.isDead || bot === this.owner) continue;
                if (this._hitCheck(bot)) return;
            }
        }
    }

    _hitCheck(target) {
        const d = Math.hypot(this.x - target.x, this.y - target.y);
        if (d < (target.radius || 15)) {
            this.alive = false;
            const knockbackAngle = this.angle;
            target.takeDamage(this.damage, this.owner);
            ParticleSystem.emit('blood', target.x, target.y, { angle: knockbackAngle, count: 4 });
            AudioManager.play('hit');
            return true;
        }
        return false;
    }

    render(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // 视口裁剪
        if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) return;

        // 弹道轨迹
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.3;
            const t0 = this.trail[0];
            ctx.moveTo(t0.x - camera.x, t0.y - camera.y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.globalAlpha = 0.1 + (i / this.trail.length) * 0.3;
                ctx.lineTo(this.trail[i].x - camera.x, this.trail[i].y - camera.y);
            }
            ctx.lineTo(sx, sy);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // 子弹本体 - 发光点
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();

        // 发光效果
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.5;
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
window.Bullet = Bullet;

window.BulletManager = {
    update(dt) {
        for (const b of Game.bullets) b.update(dt);
        Game.bullets = Game.bullets.filter(b => b.alive);
    },
    render(ctx, camera) {
        for (const b of Game.bullets) b.render(ctx, camera);
    }
};
