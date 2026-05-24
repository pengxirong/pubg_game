// ======================================
// 玩家系统
// ======================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.radius = 15;
        this.hp = 100;
        this.maxHp = 100;
        this.armor = 0;
        this.maxArmor = 100;
        this.speed = 200;
        this.baseSpeed = 200;
        this.isDead = false;
        this.name = '你';

        // 武器系统
        this.weapons = [null, null];
        this.currentSlot = 0;
        this.fireTimer = 0;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadTime = 0;

        // 弹药
        this.ammo = { pistol: 30, shotgun: 0, rifle: 0, sniper: 0, smg: 0 };

        // 弹夹弹药（每把武器独立记录）
        this.magAmmo = [0, 0];

        // 物资
        this.medkits = 0;
        this.energyDrinks = 0;

        // 状态
        this.speedBoostTimer = 0;
        this.hurtFlashTimer = 0;
        this.isHealing = false;
        this.healTimer = 0;

        // 统计
        this.kills = 0;
        this.damageDealt = 0;

        // 动画
        this.footstepTimer = 0;
        this.isMoving = false;
        this.legPhase = 0;
    }

    getCurrentWeapon() {
        return this.weapons[this.currentSlot];
    }

    getCurrentWeaponData() {
        const w = this.getCurrentWeapon();
        return w ? WeaponData[w.type] : null;
    }

    update(dt) {
        if (this.isDead) return;

        this.handleMovement(dt);
        this.handleAiming();
        this.handleShooting(dt);

        // 换弹计时
        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this._finishReload();
            }
        }

        // 使用医疗包进度
        if (this.isHealing) {
            this.healTimer -= dt;
            if (this.healTimer <= 0) {
                this.hp = Math.min(this.maxHp, this.hp + 50);
                this.isHealing = false;
                AudioManager.play('heal');
            }
        }

        // 速度加成倒计时
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            this.speed = this.baseSpeed * 1.15;
            if (this.speedBoostTimer <= 0) this.speed = this.baseSpeed;
        }

        // 受伤闪烁
        if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;

        // 毒圈伤害
        if (Game.zone && !Game.zone.isInSafeZone(this.x, this.y)) {
            const dmg = Game.zone.getDamage() * dt;
            if (dmg > 0) this.takeDamage(dmg, null, true);
        }

        // 按键处理
        if (Input.isJustPressed('r')) this.handleReload();
        if (Input.isJustPressed('e')) this.handlePickup();
        if (Input.isJustPressed('1')) this.switchWeapon(0);
        if (Input.isJustPressed('2')) this.switchWeapon(1);
        if (Input.isJustPressed('4')) this.useMedkit();
        if (Input.isJustPressed('5')) this.useEnergyDrink();

        // 空投拾取
        for (const ad of Game.airdrops) {
            if (ad.state === 'landed' && !ad.opened &&
                Math.hypot(this.x - ad.x, this.y - ad.y) < 40 &&
                Input.isJustPressed('e')) {
                ad.open();
            }
        }
    }

    handleMovement(dt) {
        let dx = 0, dy = 0;
        if (Input.keys['w'] || Input.keys['arrowup']) dy = -1;
        if (Input.keys['s'] || Input.keys['arrowdown']) dy = 1;
        if (Input.keys['a'] || Input.keys['arrowleft']) dx = -1;
        if (Input.keys['d'] || Input.keys['arrowright']) dx = 1;

        this.isMoving = dx !== 0 || dy !== 0;
        if (!this.isMoving) return;

        // 归一化对角线移动
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;

        let spd = this.speed;
        // 灌木减速
        for (const obs of Game.obstacles) {
            if (obs.type === 'bush' && Math.hypot(this.x - obs.x, this.y - obs.y) < obs.radius) {
                spd *= 0.6;
                break;
            }
        }

        const newX = this.x + dx * spd * dt;
        const newY = this.y + dy * spd * dt;

        // 分轴碰撞检测（允许沿墙滑动）
        if (this._canMoveTo(newX, this.y)) this.x = newX;
        if (this._canMoveTo(this.x, newY)) this.y = newY;

        // 限制在地图内
        this.x = Math.max(this.radius, Math.min(Game.MAP_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(Game.MAP_HEIGHT - this.radius, this.y));

        // 脚步效果
        this.footstepTimer += dt;
        this.legPhase += dt * 10;
        if (this.footstepTimer > 0.35) {
            this.footstepTimer = 0;
            ParticleSystem.emit('dust', this.x, this.y + 10, { count: 1 });
        }
    }

    _canMoveTo(nx, ny) {
        const r = this.radius;
        // 检查网格碰撞（多点检测）
        const points = [
            [nx, ny], [nx + r, ny], [nx - r, ny],
            [nx, ny + r], [nx, ny - r],
            [nx + r * 0.7, ny + r * 0.7], [nx - r * 0.7, ny + r * 0.7],
            [nx + r * 0.7, ny - r * 0.7], [nx - r * 0.7, ny - r * 0.7]
        ];
        for (const [px, py] of points) {
            if (!GameMap.isWalkable(px, py)) return false;
        }
        // 检查障碍物碰撞
        for (const obs of Game.obstacles) {
            if (obs.type === 'bush') continue;
            if (Math.hypot(nx - obs.x, ny - obs.y) < r + obs.radius) return false;
        }
        return true;
    }

    handleAiming() {
        this.angle = Math.atan2(
            Input.mouse.worldY - this.y,
            Input.mouse.worldX - this.x
        );
    }

    handleShooting(dt) {
        this.fireTimer -= dt;
        if (this.fireTimer < 0) this.fireTimer = 0;

        if (!Input.mouse.down) return;
        const wd = this.getCurrentWeaponData();
        if (!wd || this.isReloading || this.isHealing) return;
        if (this.fireTimer > 0) return;
        if (this.magAmmo[this.currentSlot] <= 0) {
            this.handleReload();
            return;
        }

        // 发射子弹
        const muzzleX = this.x + Math.cos(this.angle) * 20;
        const muzzleY = this.y + Math.sin(this.angle) * 20;

        if (wd.pellets) {
            for (let i = 0; i < wd.pellets; i++) {
                Game.bullets.push(new Bullet(muzzleX, muzzleY, this.angle, wd, 'player'));
            }
        } else {
            Game.bullets.push(new Bullet(muzzleX, muzzleY, this.angle, wd, 'player'));
        }

        // 效果
        ParticleSystem.emit('muzzleFlash', this.x, this.y, { angle: this.angle });
        ParticleSystem.emit('shell', this.x, this.y, { angle: this.angle, count: 1 });
        AudioManager.play(wd.type);

        this.fireTimer = wd.fireRate;
        this.magAmmo[this.currentSlot]--;

        if (this.magAmmo[this.currentSlot] <= 0) {
            this.handleReload();
        }
    }

    handleReload() {
        if (this.isReloading) return;
        const w = this.getCurrentWeapon();
        const wd = this.getCurrentWeaponData();
        if (!w || !wd) return;

        const neededAmmo = wd.magSize - this.magAmmo[this.currentSlot];
        if (neededAmmo <= 0) return;
        if (this.ammo[wd.ammoType] <= 0) return;

        this.isReloading = true;
        this.reloadTimer = wd.reloadTime;
        this.reloadTime = wd.reloadTime;
        this.isHealing = false;
        AudioManager.play('reload');
    }

    _finishReload() {
        this.isReloading = false;
        const w = this.getCurrentWeapon();
        const wd = this.getCurrentWeaponData();
        if (!w || !wd) return;

        const needed = wd.magSize - this.magAmmo[this.currentSlot];
        const available = Math.min(needed, this.ammo[wd.ammoType]);
        this.magAmmo[this.currentSlot] += available;
        this.ammo[wd.ammoType] -= available;
    }

    switchWeapon(slot) {
        if (slot === this.currentSlot) return;
        if (!this.weapons[slot]) return;
        this.currentSlot = slot;
        this.isReloading = false;
        this.fireTimer = 0.3; // 切枪延迟
    }

    handlePickup() {
        const nearby = LootManager.getNearbyLoot(this.x, this.y, 50);
        if (nearby.length === 0) return;

        const item = nearby[0];
        let picked = false;

        switch (item.type) {
            case 'weapon':
                const wd = WeaponData[item.subType];
                if (!wd) break;
                // 空槽直接装备
                if (!this.weapons[this.currentSlot]) {
                    this.weapons[this.currentSlot] = { type: item.subType };
                    this.magAmmo[this.currentSlot] = item.currentAmmo || wd.magSize;
                } else if (!this.weapons[1 - this.currentSlot]) {
                    this.weapons[1 - this.currentSlot] = { type: item.subType };
                    this.magAmmo[1 - this.currentSlot] = item.currentAmmo || wd.magSize;
                } else {
                    // 替换当前武器（旧武器掉落）
                    const oldW = this.weapons[this.currentSlot];
                    const oldAmmo = this.magAmmo[this.currentSlot];
                    const dropped = new LootItem(this.x, this.y, 'weapon', oldW.type, 1);
                    dropped.currentAmmo = oldAmmo;
                    Game.lootItems.push(dropped);
                    this.weapons[this.currentSlot] = { type: item.subType };
                    this.magAmmo[this.currentSlot] = item.currentAmmo || wd.magSize;
                }
                this.isReloading = false;
                picked = true;
                break;

            case 'ammo':
                this.ammo[item.subType] = (this.ammo[item.subType] || 0) + item.amount;
                picked = true;
                break;

            case 'health':
                this.medkits++;
                picked = true;
                break;

            case 'armor':
                this.armor = Math.min(this.maxArmor, this.armor + 50);
                picked = true;
                break;

            case 'energy':
                this.energyDrinks++;
                picked = true;
                break;
        }

        if (picked) {
            item.alive = false;
            AudioManager.play('pickup');
        }
    }

    useMedkit() {
        if (this.medkits <= 0 || this.hp >= this.maxHp || this.isHealing) return;
        this.medkits--;
        this.isHealing = true;
        this.healTimer = 3.0;
        this.isReloading = false;
    }

    useEnergyDrink() {
        if (this.energyDrinks <= 0) return;
        this.energyDrinks--;
        this.hp = Math.min(this.maxHp, this.hp + 25);
        this.speedBoostTimer = 10;
        AudioManager.play('heal');
    }

    takeDamage(amount, attacker, isZone = false) {
        if (this.isDead) return;

        if (this.armor > 0 && !isZone) {
            const armorDmg = amount * 0.7;
            const hpDmg = amount * 0.3;
            this.armor = Math.max(0, this.armor - armorDmg);
            this.hp -= hpDmg;
            if (this.armor <= 0) {
                // 护甲碎了，多余伤害转到HP
                this.hp -= Math.abs(this.armor);
                this.armor = 0;
            }
        } else {
            this.hp -= amount;
        }

        this.hurtFlashTimer = 0.15;
        this.isHealing = false;

        if (this.hp <= 0) {
            this.hp = 0;
            this.die(attacker);
        }
    }

    die(killer) {
        this.isDead = true;
        LootManager.dropLoot(this.x, this.y, this);
        Game.aliveCount--;

        const killerName = killer ? (killer === 'player' ? '你' : (killer.name || '毒圈')) : '毒圈';
        const weapon = killer && killer !== 'player' && killer.getCurrentWeapon
            ? WeaponData[killer.getCurrentWeapon()?.type]?.name || '' : '';
        HUD.addKillFeed(killerName, this.name, weapon);

        if (killer && killer.kills !== undefined) killer.kills++;
    }

    render(ctx, camera) {
        if (this.isDead) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // 受伤闪烁
        const isHurt = this.hurtFlashTimer > 0;

        ctx.save();
        ctx.translate(sx, sy);

        // 腿部动画
        if (this.isMoving) {
            const legOffset = Math.sin(this.legPhase) * 5;
            ctx.fillStyle = '#2E7D32';
            ctx.beginPath();
            ctx.arc(Math.cos(this.angle + 2.5) * 8, Math.sin(this.angle + 2.5) * 8 + legOffset * 0.3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(Math.cos(this.angle - 2.5) * 8, Math.sin(this.angle - 2.5) * 8 - legOffset * 0.3, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 身体
        ctx.fillStyle = isHurt ? '#FF4444' : '#388E3C';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 头部
        ctx.fillStyle = isHurt ? '#FF8888' : '#FFCC80';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // 武器
        const wd = this.getCurrentWeaponData();
        if (wd) {
            const gunLen = wd.type === 'sniper' ? 28 : wd.type === 'pistol' ? 16 : 22;
            const gunX = Math.cos(this.angle) * gunLen;
            const gunY = Math.sin(this.angle) * gunLen;
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(this.angle) * 8, Math.sin(this.angle) * 8);
            ctx.lineTo(gunX, gunY);
            ctx.stroke();
            // 枪口
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(gunX, gunY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 换弹进度弧
        if (this.isReloading) {
            const progress = 1 - this.reloadTimer / this.reloadTime;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, -22, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
        }

        // 治疗进度弧
        if (this.isHealing) {
            const progress = 1 - this.healTimer / 3.0;
            ctx.strokeStyle = '#EF5350';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, -22, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
        }

        ctx.restore();
    }
}
window.Player = Player;
