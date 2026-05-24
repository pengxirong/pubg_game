// ======================================
// 武器数据定义
// ======================================
window.WeaponData = {
    'pistol': {
        name: 'P92手枪', type: 'pistol', damage: 15,
        fireRate: 0.25, range: 400, bulletSpeed: 800,
        magSize: 15, reloadTime: 1.5, spread: 0.05,
        ammoType: 'pistol', color: '#FFD700', icon: '🔫'
    },
    'shotgun': {
        name: 'S686霰弹枪', type: 'shotgun', damage: 12,
        pellets: 8, fireRate: 0.8, range: 200, bulletSpeed: 600,
        magSize: 2, reloadTime: 2.5, spread: 0.15,
        ammoType: 'shotgun', color: '#FF6B35', icon: '💥'
    },
    'assault': {
        name: 'M416突击步枪', type: 'assault', damage: 22,
        fireRate: 0.1, range: 600, bulletSpeed: 900,
        magSize: 30, reloadTime: 2.0, spread: 0.03,
        ammoType: 'rifle', color: '#4FC3F7', icon: '🎯'
    },
    'sniper': {
        name: 'Kar98狙击枪', type: 'sniper', damage: 75,
        fireRate: 1.5, range: 1000, bulletSpeed: 1200,
        magSize: 5, reloadTime: 3.0, spread: 0.01,
        ammoType: 'sniper', color: '#E040FB', icon: '🔭'
    },
    'smg': {
        name: 'UMP9冲锋枪', type: 'smg', damage: 18,
        fireRate: 0.08, range: 350, bulletSpeed: 750,
        magSize: 25, reloadTime: 1.8, spread: 0.06,
        ammoType: 'smg', color: '#66BB6A', icon: '⚡'
    }
};

window.AmmoTypes = {
    'pistol': { name: '9mm弹药', color: '#FFD700' },
    'shotgun': { name: '12号口径', color: '#FF6B35' },
    'rifle': { name: '5.56mm弹药', color: '#4FC3F7' },
    'sniper': { name: '7.62mm弹药', color: '#E040FB' },
    'smg': { name: '.45 ACP', color: '#66BB6A' }
};
