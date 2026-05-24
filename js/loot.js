// ======================================
// 物资拾取系统
// ======================================
class LootItem {
    constructor(x, y, type, subType, amount) {
        this.x = x;
        this.y = y;
        this.type = type;       // 'weapon'|'ammo'|'health'|'armor'|'energy'
        this.subType = subType; // 武器ID或弹药类型
        this.amount = amount;
        this.alive = true;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.glowPhase = Math.random() * Math.PI * 2;
        // 武器物资自带弹药
        this.currentAmmo = 0;
        if (type === 'weapon') {
            const wd = WeaponData[subType];
            if (wd) this.currentAmmo = wd.magSize;
        }
    }

    getDisplayName() {
        if (this.type === 'weapon') return WeaponData[this.subType]?.name || this.subType;
        if (this.type === 'ammo') return (AmmoTypes[this.subType]?.name || this.subType) + ' x' + this.amount;
        if (this.type === 'health') return '医疗包';
        if (this.type === 'armor') return '防弹衣';
        if (this.type === 'energy') return '能量饮料';
        return '未知物品';
    }

    getColor() {
        if (this.type === 'weapon') return WeaponData[this.subType]?.color || '#fff';
        if (this.type === 'ammo') return AmmoTypes[this.subType]?.color || '#aaa';
        if (this.type === 'health') return '#EF5350';
        if (this.type === 'armor') return '#42A5F5';
        if (this.type === 'energy') return '#FFA726';
        return '#fff';
    }

    getRarityColor() {
        if (this.type !== 'weapon') return 'rgba(255,255,255,0.3)';
        const rarity = { pistol: '#aaa', smg: '#aaa', shotgun: '#4CAF50', assault: '#42A5F5', sniper: '#AB47BC' };
        return rarity[this.subType] || '#aaa';
    }

    render(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx < -30 || sx > ctx.canvas.width + 30 || sy < -30 || sy > ctx.canvas.height + 30) return;

        const time = performance.now() / 1000;
        const bob = Math.sin(time * 2 + this.bobPhase) * 3;
        const glow = 0.3 + Math.sin(time * 3 + this.glowPhase) * 0.15;

        // 地面发光圈
        ctx.beginPath();
        ctx.fillStyle = this.getColor();
        ctx.globalAlpha = glow * 0.3;
        ctx.arc(sx, sy + bob, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 物品图标背景
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.arc(sx, sy + bob, 10, 0, Math.PI * 2);
        ctx.fill();

        // 物品图标
        ctx.fillStyle = this.getColor();
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { weapon: '▲', ammo: '•', health: '+', armor: '◆', energy: '☆' };
        ctx.fillText(icons[this.type] || '?', sx, sy + bob);

        // 稀有度边框
        if (this.type === 'weapon') {
            ctx.strokeStyle = this.getRarityColor();
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 11, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
window.LootItem = LootItem;

window.LootManager = {
    spawnLoot(buildings) {
        Game.lootItems = [];
        const weaponTypes = ['pistol', 'pistol', 'pistol', 'smg', 'smg', 'shotgun', 'shotgun', 'assault', 'sniper'];
        const ammoTypes = Object.keys(AmmoTypes);

        // 建筑内物资
        for (const b of buildings) {
            const count = 2 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                const lx = b.x + 20 + Math.random() * (b.width - 40);
                const ly = b.y + 20 + Math.random() * (b.height - 40);
                this._spawnRandomLoot(lx, ly, 0.5);
            }
        }

        // 户外散落物资
        for (let i = 0; i < 80; i++) {
            const x = 100 + Math.random() * (Game.MAP_WIDTH - 200);
            const y = 100 + Math.random() * (Game.MAP_HEIGHT - 200);
            if (GameMap.isWalkable(x, y)) {
                this._spawnRandomLoot(x, y, 0.3);
            }
        }
    },

    _spawnRandomLoot(x, y, weaponChance) {
        const r = Math.random();
        if (r < weaponChance * 0.4) {
            // 武器
            const types = ['pistol', 'pistol', 'smg', 'smg', 'shotgun', 'assault', 'sniper'];
            const weights = [0.25, 0.25, 0.2, 0.2, 0.15, 0.1, 0.05];
            const wtype = this._weightedRandom(types, weights);
            Game.lootItems.push(new LootItem(x, y, 'weapon', wtype, 1));
        } else if (r < weaponChance * 0.4 + 0.3) {
            // 弹药
            const atype = ['pistol', 'rifle', 'smg', 'shotgun', 'sniper'][Math.floor(Math.random() * 5)];
            const amt = 20 + Math.floor(Math.random() * 40);
            Game.lootItems.push(new LootItem(x, y, 'ammo', atype, amt));
        } else if (r < weaponChance * 0.4 + 0.5) {
            // 医疗包
            Game.lootItems.push(new LootItem(x, y, 'health', 'medkit', 1));
        } else if (r < weaponChance * 0.4 + 0.6) {
            // 护甲
            Game.lootItems.push(new LootItem(x, y, 'armor', 'vest', 1));
        } else {
            // 能量饮料
            Game.lootItems.push(new LootItem(x, y, 'energy', 'drink', 1));
        }
    },

    _weightedRandom(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            r -= weights[i];
            if (r <= 0) return items[i];
        }
        return items[items.length - 1];
    },

    getNearbyLoot(x, y, radius) {
        return Game.lootItems.filter(item =>
            item.alive && Math.hypot(item.x - x, item.y - y) < radius
        ).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    },

    dropLoot(x, y, entity) {
        // 掉落武器
        for (const w of entity.weapons) {
            if (w) {
                const offset = (Math.random() - 0.5) * 30;
                const item = new LootItem(x + offset, y + offset, 'weapon', w.type, 1);
                item.currentAmmo = w.currentAmmo || 0;
                Game.lootItems.push(item);
            }
        }
        // 掉落弹药
        for (const [atype, amt] of Object.entries(entity.ammo)) {
            if (amt > 0) {
                const offset = (Math.random() - 0.5) * 40;
                Game.lootItems.push(new LootItem(x + offset, y + offset, 'ammo', atype, amt));
            }
        }
        // 掉落医疗包
        for (let i = 0; i < (entity.medkits || 0); i++) {
            const offset = (Math.random() - 0.5) * 30;
            Game.lootItems.push(new LootItem(x + offset, y + offset, 'health', 'medkit', 1));
        }
    },

    update(dt) {
        Game.lootItems = Game.lootItems.filter(i => i.alive);
    },

    render(ctx, camera) {
        for (const item of Game.lootItems) item.render(ctx, camera);
    }
};
