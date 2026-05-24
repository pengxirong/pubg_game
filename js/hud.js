// ======================================
// HUD 界面系统
// ======================================
window.HUD = {
    killFeedEntries: [],
    pickupHint: null,
    pickupHintTimer: 0,

    addKillFeed(killer, victim, weapon) {
        this.killFeedEntries.unshift({
            killer, victim, weapon,
            time: 5.0
        });
        if (this.killFeedEntries.length > 5) this.killFeedEntries.pop();
    },

    update(dt) {
        // 更新 Kill Feed 计时
        for (let i = this.killFeedEntries.length - 1; i >= 0; i--) {
            this.killFeedEntries[i].time -= dt;
            if (this.killFeedEntries[i].time <= 0) {
                this.killFeedEntries.splice(i, 1);
            }
        }

        // 拾取提示
        if (Game.player && !Game.player.isDead) {
            const nearby = LootManager.getNearbyLoot(Game.player.x, Game.player.y, 50);
            // 也检查空投
            let nearAirdrop = null;
            for (const ad of Game.airdrops) {
                if (ad.state === 'landed' && !ad.opened &&
                    Math.hypot(Game.player.x - ad.x, Game.player.y - ad.y) < 40) {
                    nearAirdrop = ad;
                    break;
                }
            }
            if (nearby.length > 0) {
                this.pickupHint = '按 E 拾取 ' + nearby[0].getDisplayName();
            } else if (nearAirdrop) {
                this.pickupHint = '按 E 打开空投';
            } else {
                this.pickupHint = null;
            }
        }
    },

    render(ctx) {
        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;
        const p = Game.player;
        if (!p) return;

        // ===== 左下角 - 生命值和护甲 =====
        this._renderHealthBar(ctx, 20, ch - 60, 220, p);

        // ===== 右下角 - 武器信息 =====
        this._renderWeaponInfo(ctx, cw - 280, ch - 90, p);

        // ===== 左上角 - 存活信息 =====
        this._renderAliveInfo(ctx, 20, 20);

        // ===== 顶部中央 - 缩圈信息 =====
        this._renderZoneInfo(ctx, cw / 2, 15);

        // ===== 右侧 - Kill Feed =====
        this._renderKillFeed(ctx, cw - 20, 80);

        // ===== 中央提示 =====
        if (this.pickupHint) {
            this._renderPickupHint(ctx, cw / 2, ch - 130);
        }

        // 毒圈警告
        if (p && !p.isDead && Game.zone && !Game.zone.isInSafeZone(p.x, p.y)) {
            this._renderZoneWarning(ctx, cw / 2, ch / 2 - 100);
        }

        // 受伤红色边框效果
        if (p.hurtFlashTimer > 0) {
            const alpha = p.hurtFlashTimer / 0.15 * 0.3;
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, cw, 5);
            ctx.fillRect(0, ch - 5, cw, 5);
            ctx.fillRect(0, 0, 5, ch);
            ctx.fillRect(cw - 5, 0, 5, ch);
        }
    },

    _renderHealthBar(ctx, x, y, w, p) {
        // 面板背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this._roundRect(ctx, x - 5, y - 5, w + 10, 55, 8);
        ctx.fill();

        // 血量条
        const hpRatio = Math.max(0, p.hp / p.maxHp);
        const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FFC107' : '#F44336';

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this._roundRect(ctx, x, y, w, 18, 4);
        ctx.fill();

        if (hpRatio > 0) {
            const grad = ctx.createLinearGradient(x, y, x + w * hpRatio, y);
            grad.addColorStop(0, hpColor);
            grad.addColorStop(1, hpColor + 'cc');
            ctx.fillStyle = grad;
            this._roundRect(ctx, x, y, w * hpRatio, 18, 4);
            ctx.fill();
        }

        // HP文字
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`♥ ${Math.ceil(p.hp)} / ${p.maxHp}`, x + w / 2, y + 13);

        // 护甲条
        const armorY = y + 24;
        const armorRatio = Math.max(0, p.armor / p.maxArmor);

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this._roundRect(ctx, x, armorY, w, 14, 4);
        ctx.fill();

        if (armorRatio > 0) {
            ctx.fillStyle = '#42A5F5';
            this._roundRect(ctx, x, armorY, w * armorRatio, 14, 4);
            ctx.fill();
        }

        ctx.fillStyle = '#ccc';
        ctx.font = 'bold 10px Rajdhani, sans-serif';
        ctx.fillText(`🛡 ${Math.ceil(p.armor)}`, x + w / 2, armorY + 11);

        // 物资图标
        const itemY = armorY + 18;
        ctx.font = '11px Rajdhani, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#EF5350';
        ctx.fillText(`✚ ${p.medkits}`, x, itemY + 10);
        ctx.fillStyle = '#FFA726';
        ctx.fillText(`☆ ${p.energyDrinks}`, x + 50, itemY + 10);
    },

    _renderWeaponInfo(ctx, x, y, p) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this._roundRect(ctx, x, y, 260, 80, 8);
        ctx.fill();

        const wd = p.getCurrentWeaponData();

        // 武器槽指示
        for (let i = 0; i < 2; i++) {
            const slotX = x + 10 + i * 60;
            const slotY = y + 5;
            const isActive = i === p.currentSlot;

            ctx.fillStyle = isActive ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)';
            ctx.strokeStyle = isActive ? '#FFD700' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            this._roundRect(ctx, slotX, slotY, 50, 25, 4);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 10px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = isActive ? '#FFD700' : '#888';
            const slotWeapon = p.weapons[i];
            if (slotWeapon) {
                const swd = WeaponData[slotWeapon.type];
                ctx.fillText(swd ? swd.icon : '?', slotX + 15, slotY + 17);
                ctx.font = '8px Rajdhani, sans-serif';
                ctx.fillText(`${i + 1}`, slotX + 40, slotY + 12);
            } else {
                ctx.fillStyle = '#555';
                ctx.fillText(`${i + 1}`, slotX + 25, slotY + 17);
            }
        }

        // 当前武器信息
        if (wd) {
            ctx.textAlign = 'left';
            ctx.font = 'bold 14px Rajdhani, sans-serif';
            ctx.fillStyle = wd.color;
            ctx.fillText(wd.name, x + 10, y + 50);

            // 弹药信息
            const mag = p.magAmmo[p.currentSlot];
            const total = p.ammo[wd.ammoType] || 0;
            ctx.font = 'bold 20px Rajdhani, sans-serif';
            ctx.fillStyle = mag <= 5 ? '#F44336' : '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(`${mag}`, x + 210, y + 72);
            ctx.font = '14px Rajdhani, sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText(`/ ${wd.magSize} | ${total}`, x + 250, y + 72);

            // 换弹提示
            if (p.isReloading) {
                ctx.font = 'bold 12px Rajdhani, sans-serif';
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                ctx.fillText('换弹中...', x + 130, y + 50);
            }
        } else {
            ctx.textAlign = 'center';
            ctx.font = '14px Rajdhani, sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText('无武器 - 按E拾取', x + 130, y + 55);
        }
    },

    _renderAliveInfo(ctx, x, y) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this._roundRect(ctx, x, y, 120, 50, 8);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.font = 'bold 22px Rajdhani, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(`👥 ${Game.aliveCount}`, x + 12, y + 25);

        ctx.font = '13px Rajdhani, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`⚔ ${Game.player ? Game.player.kills : 0} 击杀`, x + 12, y + 43);
    },

    _renderZoneInfo(ctx, cx, y) {
        if (!Game.zone || Game.zone.currentPhase < 0) return;
        const info = Game.zone.getCurrentPhaseInfo();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this._roundRect(ctx, cx - 100, y, 200, 35, 8);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.font = 'bold 13px Rajdhani, sans-serif';

        if (info.state === 'waiting') {
            ctx.fillStyle = '#aaa';
            ctx.fillText(`第${info.phase}轮`, cx - 50, y + 23);
            ctx.fillStyle = info.time <= 10 ? '#F44336' : '#fff';
            ctx.font = 'bold 16px Rajdhani, sans-serif';
            ctx.fillText(`${info.time}s`, cx + 20, y + 25);
            ctx.font = '11px Rajdhani, sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText('安全区缩小倒计时', cx + 70, y + 23);
        } else {
            ctx.fillStyle = '#F44336';
            ctx.fillText(`⚠ 缩圈中`, cx - 40, y + 23);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Rajdhani, sans-serif';
            ctx.fillText(`${info.time}s`, cx + 30, y + 25);
        }
    },

    _renderKillFeed(ctx, rx, y) {
        ctx.textAlign = 'right';
        for (let i = 0; i < this.killFeedEntries.length; i++) {
            const entry = this.killFeedEntries[i];
            const alpha = Math.min(1, entry.time / 1.0);
            const ey = y + i * 24;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this._roundRect(ctx, rx - 230, ey, 230, 20, 4);
            ctx.fill();

            ctx.font = '12px Rajdhani, sans-serif';
            // 击杀者名字
            ctx.fillStyle = entry.killer === '你' ? '#FFD700' : '#fff';
            ctx.textAlign = 'right';
            const text = `${entry.killer} 🔫 ${entry.victim}`;
            ctx.fillText(text, rx - 8, ey + 14);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    },

    _renderPickupHint(ctx, cx, y) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Rajdhani, sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        const textW = ctx.measureText(this.pickupHint).width + 20;
        this._roundRect(ctx, cx - textW / 2, y, textW, 28, 6);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.fillText(this.pickupHint, cx, y + 19);
    },

    _renderZoneWarning(ctx, cx, y) {
        const blink = Math.sin(performance.now() / 200) > 0;
        if (!blink) return;
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px Rajdhani, sans-serif';
        ctx.fillStyle = '#F44336';
        ctx.fillText('⚠ 你在安全区外！正在受到伤害！', cx, y);
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
};
