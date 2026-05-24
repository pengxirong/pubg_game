// ======================================
// 空投系统
// ======================================
class Airdrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.state = 'falling'; // 'falling'|'landed'
        this.fallHeight = 400;
        this.fallSpeed = 120;
        this.opened = false;
        this.smokeTimer = 0;
        this.items = this._generateItems();
    }

    _generateItems() {
        // 高级武器
        const weapons = ['assault', 'sniper'];
        const weapon = weapons[Math.floor(Math.random() * weapons.length)];
        return [
            { type: 'weapon', subType: weapon, amount: 1 },
            { type: 'ammo', subType: WeaponData[weapon].ammoType, amount: 60 },
            { type: 'health', subType: 'medkit', amount: 1 },
            { type: 'armor', subType: 'vest', amount: 1 }
        ];
    }

    update(dt) {
        if (this.state === 'falling') {
            this.fallHeight -= this.fallSpeed * dt;
            if (this.fallHeight <= 0) {
                this.fallHeight = 0;
                this.state = 'landed';
            }
        }
        if (this.state === 'landed' && !this.opened) {
            this.smokeTimer += dt;
            if (this.smokeTimer > 0.3) {
                this.smokeTimer = 0;
                ParticleSystem.emit('smoke', this.x + (Math.random() - 0.5) * 10, this.y - 10, { count: 1 });
            }
        }
    }

    open() {
        if (this.opened || this.state !== 'landed') return;
        this.opened = true;
        // 散落物资
        for (const item of this.items) {
            const ox = this.x + (Math.random() - 0.5) * 50;
            const oy = this.y + (Math.random() - 0.5) * 50;
            const loot = new LootItem(ox, oy, item.type, item.subType, item.amount);
            Game.lootItems.push(loot);
        }
        AudioManager.play('pickup');
    }

    render(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx < -60 || sx > ctx.canvas.width + 60 || sy < -60 || sy > ctx.canvas.height + 60) return;

        if (this.state === 'falling') {
            const visualY = sy - this.fallHeight;
            // 降落伞
            ctx.fillStyle = '#E8E8E8';
            ctx.beginPath();
            ctx.arc(sx, visualY - 30, 20, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            // 伞绳
            ctx.beginPath();
            ctx.moveTo(sx - 15, visualY - 25);
            ctx.lineTo(sx, visualY);
            ctx.moveTo(sx + 15, visualY - 25);
            ctx.lineTo(sx, visualY);
            ctx.stroke();
            // 箱子
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(sx - 10, visualY - 5, 20, 15);
            ctx.strokeStyle = '#3E2723';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx - 10, visualY - 5, 20, 15);

            // 阴影
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(sx, sy, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else {
            // 已降落的箱子
            const glowAlpha = this.opened ? 0.1 : 0.3 + Math.sin(performance.now() / 300) * 0.15;
            // 发光效果
            if (!this.opened) {
                ctx.fillStyle = `rgba(255, 200, 0, ${glowAlpha})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 25, 0, Math.PI * 2);
                ctx.fill();
            }
            // 箱子
            ctx.fillStyle = this.opened ? '#4E342E' : '#33691E';
            ctx.fillRect(sx - 15, sy - 10, 30, 20);
            ctx.strokeStyle = this.opened ? '#3E2723' : '#1B5E20';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 15, sy - 10, 30, 20);
            // 十字标记
            if (!this.opened) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx - 6, sy);
                ctx.lineTo(sx + 6, sy);
                ctx.moveTo(sx, sy - 6);
                ctx.lineTo(sx, sy + 6);
                ctx.stroke();
            }
        }
    }
}
window.Airdrop = Airdrop;

window.AirdropManager = {
    spawnTimer: 0,
    spawnInterval: 90,
    planeVisible: false,
    planeX: 0,
    planeY: 0,
    planeTargetX: 0,
    planeTargetY: 0,
    planeProgress: 0,
    dropX: 0,
    dropY: 0,
    dropped: false,

    update(dt) {
        if (Game.state !== 'playing') return;

        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval && !this.planeVisible) {
            this.spawnTimer = 0;
            this.spawnAirdrop();
        }

        if (this.planeVisible) {
            this.planeProgress += dt * 0.3;
            this.planeX = this._startX + (this.planeTargetX - this._startX) * this.planeProgress;
            this.planeY = this._startY + (this.planeTargetY - this._startY) * this.planeProgress;

            // 到达投放点时投下空投
            if (!this.dropped && this.planeProgress >= 0.5) {
                this.dropped = true;
                Game.airdrops.push(new Airdrop(this.dropX, this.dropY));
            }

            if (this.planeProgress >= 1) {
                this.planeVisible = false;
            }
        }

        // 更新所有空投
        for (const ad of Game.airdrops) ad.update(dt);
    },

    spawnAirdrop() {
        // 在安全区内选择投放点
        const zone = Game.zone;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * zone.currentRadius * 0.6;
        this.dropX = zone.currentCenter.x + Math.cos(angle) * dist;
        this.dropY = zone.currentCenter.y + Math.sin(angle) * dist;

        // 飞机航线
        const flyAngle = Math.random() * Math.PI * 2;
        this._startX = this.dropX - Math.cos(flyAngle) * 3000;
        this._startY = this.dropY - Math.sin(flyAngle) * 3000;
        this.planeTargetX = this.dropX + Math.cos(flyAngle) * 3000;
        this.planeTargetY = this.dropY + Math.sin(flyAngle) * 3000;
        this.planeX = this._startX;
        this.planeY = this._startY;
        this.planeProgress = 0;
        this.planeVisible = true;
        this.dropped = false;
    },

    render(ctx, camera) {
        // 飞机
        if (this.planeVisible) {
            const sx = this.planeX - camera.x;
            const sy = this.planeY - camera.y;
            const angle = Math.atan2(this.planeTargetY - this._startY, this.planeTargetX - this._startX);

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(angle);
            // 机身
            ctx.fillStyle = 'rgba(150, 150, 150, 0.7)';
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(-15, -8);
            ctx.lineTo(-15, 8);
            ctx.closePath();
            ctx.fill();
            // 机翼
            ctx.fillStyle = 'rgba(120, 120, 120, 0.7)';
            ctx.fillRect(-8, -18, 8, 36);
            ctx.restore();
        }

        // 空投箱
        for (const ad of Game.airdrops) ad.render(ctx, camera);
    }
};
