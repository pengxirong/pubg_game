// ======================================
// 小地图系统
// ======================================
window.Minimap = {
    size: 180,
    padding: 15,
    deathMarkers: [],

    addDeathMarker(x, y) {
        this.deathMarkers.push({ x, y, time: 5.0 });
    },

    update(dt) {
        for (let i = this.deathMarkers.length - 1; i >= 0; i--) {
            this.deathMarkers[i].time -= dt;
            if (this.deathMarkers[i].time <= 0) {
                this.deathMarkers.splice(i, 1);
            }
        }
    },

    render(ctx) {
        const cw = ctx.canvas.width;
        const s = this.size;
        const mx = cw - s - this.padding;
        const my = this.padding + 60; // 留空间给存活人数下方
        const scale = s / Game.MAP_WIDTH;

        // 背景
        ctx.fillStyle = 'rgba(0, 10, 0, 0.7)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.fillRect(mx, my, s, s);
        ctx.strokeRect(mx, my, s, s);

        // 网格线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 4; i++) {
            const offset = (s / 4) * i;
            ctx.beginPath();
            ctx.moveTo(mx + offset, my);
            ctx.lineTo(mx + offset, my + s);
            ctx.moveTo(mx, my + offset);
            ctx.lineTo(mx + s, my + offset);
            ctx.stroke();
        }

        // 水域
        if (GameMap._lakes) {
            ctx.fillStyle = 'rgba(33, 150, 243, 0.4)';
            for (const lake of GameMap._lakes) {
                ctx.beginPath();
                ctx.ellipse(
                    mx + lake.cx * scale,
                    my + lake.cy * scale,
                    lake.rx * scale,
                    lake.ry * scale,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }

        // 建筑物
        ctx.fillStyle = 'rgba(180, 180, 180, 0.5)';
        for (const b of Game.buildings) {
            ctx.fillRect(
                mx + b.x * scale,
                my + b.y * scale,
                b.width * scale,
                b.height * scale
            );
        }

        // 毒圈 / 安全区
        if (Game.zone && Game.zone.currentPhase >= 0) {
            // 当前毒圈边界
            ctx.beginPath();
            ctx.arc(
                mx + Game.zone.currentCenter.x * scale,
                my + Game.zone.currentCenter.y * scale,
                Game.zone.currentRadius * scale,
                0, Math.PI * 2
            );
            ctx.strokeStyle = 'rgba(60, 120, 255, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 下一个安全区
            if (Game.zone.state === 'waiting' && Game.zone.nextRadius < Game.zone.currentRadius) {
                ctx.beginPath();
                ctx.arc(
                    mx + Game.zone.nextCenter.x * scale,
                    my + Game.zone.nextCenter.y * scale,
                    Game.zone.nextRadius * scale,
                    0, Math.PI * 2
                );
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // 空投
        for (const ad of Game.airdrops) {
            if (ad.opened) continue;
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(
                mx + ad.x * scale - 2,
                my + ad.y * scale - 2,
                4, 4
            );
        }

        // 死亡标记
        for (const dm of this.deathMarkers) {
            const alpha = Math.min(1, dm.time / 2);
            ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
            ctx.lineWidth = 1.5;
            const dx = mx + dm.x * scale;
            const dy = my + dm.y * scale;
            ctx.beginPath();
            ctx.moveTo(dx - 3, dy - 3);
            ctx.lineTo(dx + 3, dy + 3);
            ctx.moveTo(dx + 3, dy - 3);
            ctx.lineTo(dx - 3, dy + 3);
            ctx.stroke();
        }

        // Bot 位置 (仅显示近距离的)
        if (Game.player) {
            for (const bot of Game.bots) {
                if (bot.isDead) continue;
                const dist = Math.hypot(bot.x - Game.player.x, bot.y - Game.player.y);
                if (dist < 300) { // 近距离显示
                    ctx.fillStyle = 'rgba(255, 80, 80, 0.8)';
                    ctx.beginPath();
                    ctx.arc(mx + bot.x * scale, my + bot.y * scale, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 玩家位置（绿色三角形）
        if (Game.player && !Game.player.isDead) {
            const px = mx + Game.player.x * scale;
            const py = my + Game.player.y * scale;
            const pa = Game.player.angle;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(pa);
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(-3, -3);
            ctx.lineTo(-3, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // 玩家位置发光
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 飞机航线
        if (AirdropManager.planeVisible) {
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mx + AirdropManager._startX * scale, my + AirdropManager._startY * scale);
            ctx.lineTo(mx + AirdropManager.planeTargetX * scale, my + AirdropManager.planeTargetY * scale);
            ctx.stroke();
            ctx.setLineDash([]);

            // 飞机位置
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mx + AirdropManager.planeX * scale, my + AirdropManager.planeY * scale, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};
