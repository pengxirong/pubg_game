// ======================================
// 缩圈系统 (毒圈/安全区)
// ======================================
class Zone {
    constructor() {
        this.phases = [
            { waitTime: 60, shrinkTime: 30, damage: 1, sizePercent: 0.75 },
            { waitTime: 45, shrinkTime: 25, damage: 2, sizePercent: 0.50 },
            { waitTime: 35, shrinkTime: 20, damage: 4, sizePercent: 0.30 },
            { waitTime: 25, shrinkTime: 15, damage: 7, sizePercent: 0.18 },
            { waitTime: 15, shrinkTime: 10, damage: 10, sizePercent: 0.08 },
            { waitTime: 8, shrinkTime: 5, damage: 15, sizePercent: 0.02 }
        ];
        this.currentPhase = -1;
        this.state = 'waiting'; // 'waiting'|'shrinking'
        this.timer = 0;

        const maxR = Math.hypot(Game.MAP_WIDTH, Game.MAP_HEIGHT) / 2;
        this.currentCenter = { x: Game.MAP_WIDTH / 2, y: Game.MAP_HEIGHT / 2 };
        this.currentRadius = maxR;
        this.nextCenter = { x: Game.MAP_WIDTH / 2, y: Game.MAP_HEIGHT / 2 };
        this.nextRadius = maxR;
        this.fromCenter = { x: Game.MAP_WIDTH / 2, y: Game.MAP_HEIGHT / 2 };
        this.fromRadius = maxR;
        this.shrinkProgress = 0;

        this.warningPlayed = false;
        this.sparkTimer = 0;
        this.sparks = [];
    }

    start() {
        this.nextPhase();
    }

    nextPhase() {
        this.currentPhase++;
        if (this.currentPhase >= this.phases.length) {
            this.currentPhase = this.phases.length - 1;
            return;
        }
        const phase = this.phases[this.currentPhase];
        const maxR = Math.hypot(Game.MAP_WIDTH, Game.MAP_HEIGHT) / 2;

        this.fromCenter = { x: this.currentCenter.x, y: this.currentCenter.y };
        this.fromRadius = this.currentRadius;

        this.nextRadius = maxR * phase.sizePercent;
        // 在当前安全区内随机偏移新中心
        const maxOffset = Math.max(0, this.currentRadius - this.nextRadius) * 0.6;
        this.nextCenter = {
            x: this.currentCenter.x + (Math.random() - 0.5) * maxOffset,
            y: this.currentCenter.y + (Math.random() - 0.5) * maxOffset
        };
        // 限制在地图范围内
        this.nextCenter.x = Math.max(this.nextRadius, Math.min(Game.MAP_WIDTH - this.nextRadius, this.nextCenter.x));
        this.nextCenter.y = Math.max(this.nextRadius, Math.min(Game.MAP_HEIGHT - this.nextRadius, this.nextCenter.y));

        this.state = 'waiting';
        this.timer = phase.waitTime;
        this.shrinkProgress = 0;
        this.warningPlayed = false;
    }

    update(dt) {
        if (this.currentPhase < 0) return;

        const phase = this.phases[this.currentPhase];

        if (this.state === 'waiting') {
            this.timer -= dt;
            if (this.timer <= 10 && !this.warningPlayed) {
                AudioManager.play('zone_warning');
                this.warningPlayed = true;
            }
            if (this.timer <= 0) {
                this.state = 'shrinking';
                this.shrinkProgress = 0;
            }
        } else if (this.state === 'shrinking') {
            this.shrinkProgress += dt / phase.shrinkTime;
            if (this.shrinkProgress >= 1) {
                this.shrinkProgress = 1;
                this.currentCenter.x = this.nextCenter.x;
                this.currentCenter.y = this.nextCenter.y;
                this.currentRadius = this.nextRadius;
                this.nextPhase();
            } else {
                const t = this._easeInOut(this.shrinkProgress);
                this.currentCenter.x = this.fromCenter.x + (this.nextCenter.x - this.fromCenter.x) * t;
                this.currentCenter.y = this.fromCenter.y + (this.nextCenter.y - this.fromCenter.y) * t;
                this.currentRadius = this.fromRadius + (this.nextRadius - this.fromRadius) * t;
            }
        }

        // 更新毒圈边缘电弧
        this.sparkTimer += dt;
        if (this.sparkTimer > 0.05) {
            this.sparkTimer = 0;
            const ang = Math.random() * Math.PI * 2;
            this.sparks.push({
                angle: ang,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.3 + Math.random() * 0.3,
                length: 5 + Math.random() * 15
            });
        }
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            this.sparks[i].life -= dt;
            if (this.sparks[i].life <= 0) this.sparks.splice(i, 1);
        }
    }

    _easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    isInSafeZone(x, y) {
        const d = Math.hypot(x - this.currentCenter.x, y - this.currentCenter.y);
        return d <= this.currentRadius;
    }

    getDamage() {
        if (this.currentPhase < 0) return 0;
        return this.phases[Math.min(this.currentPhase, this.phases.length - 1)].damage;
    }

    getTimeRemaining() {
        if (this.state === 'waiting') return Math.ceil(this.timer);
        const phase = this.phases[this.currentPhase];
        return Math.ceil(phase.shrinkTime * (1 - this.shrinkProgress));
    }

    getCurrentPhaseInfo() {
        if (this.currentPhase < 0) return { phase: 0, state: 'none', time: 0 };
        return {
            phase: this.currentPhase + 1,
            state: this.state,
            time: this.getTimeRemaining(),
            damage: this.getDamage()
        };
    }

    render(ctx, camera) {
        if (this.currentPhase < 0) return;

        const cx = this.currentCenter.x - camera.x;
        const cy = this.currentCenter.y - camera.y;
        const r = this.currentRadius;

        // 绘制毒圈外区域（半透明蓝紫色覆盖）
        ctx.save();
        // 使用路径裁剪方式：画一个大矩形，中间挖掉安全区圆形
        ctx.beginPath();
        // 外部大矩形（覆盖整个可见区域+额外空间）
        ctx.rect(-1000, -1000, ctx.canvas.width + 2000, ctx.canvas.height + 2000);
        // 内部安全区圆形（逆时针挖洞）
        ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(30, 50, 180, 0.25)';
        ctx.fill();
        ctx.restore();

        // 毒圈边缘圈
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(60, 120, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 电弧效果
        for (const spark of this.sparks) {
            const sa = spark.angle;
            const alpha = spark.life / spark.maxLife;
            const sx = cx + Math.cos(sa) * r;
            const sy = cy + Math.sin(sa) * r;
            const ex = cx + Math.cos(sa) * (r + spark.length);
            const ey = cy + Math.sin(sa) * (r + spark.length);

            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 180, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.moveTo(sx, sy);
            // 锯齿形电弧
            const mid1x = (sx + ex) / 2 + (Math.random() - 0.5) * 8;
            const mid1y = (sy + ey) / 2 + (Math.random() - 0.5) * 8;
            ctx.lineTo(mid1x, mid1y);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        // 下一个安全区预览（白色实线圆）
        if (this.state === 'waiting' && this.nextRadius < this.currentRadius) {
            const nx = this.nextCenter.x - camera.x;
            const ny = this.nextCenter.y - camera.y;
            ctx.beginPath();
            ctx.arc(nx, ny, this.nextRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}
window.Zone = Zone;
