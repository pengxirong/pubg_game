# 🎮 绝地求生 - 网页版大逃杀

<p align="center">
  <img src="https://img.shields.io/badge/Engine-HTML5_Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Dependencies-None-4CAF50?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />
</p>

<p align="center">
  <b>一个使用纯 HTML5 Canvas + JavaScript 构建的俯视角 2D 大逃杀游戏</b><br>
  无需框架，无需构建工具，打开即玩！
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> •
  <a href="#-游戏特色">游戏特色</a> •
  <a href="#-操作说明">操作说明</a> •
  <a href="#%EF%B8%8F-技术架构">技术架构</a> •
  <a href="#-开发">开发</a>
</p>

---

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/your-username/pubg_game.git

# 直接在浏览器中打开（无需安装任何依赖）
open index.html
# 或者 Windows:
start index.html
```

> **零依赖！** 不需要 Node.js、npm 或任何构建工具。双击 `index.html` 即可开始游戏。

也可以使用任意静态文件服务器：

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

## 🎯 游戏特色

### 🗺️ 大型程序化地图
- **4000 × 4000 像素**的开放世界
- 程序化生成的建筑物（房屋、仓库、小屋、瞭望塔）
- 多种地形：草地、沙地、水域、道路
- 300+ 障碍物：树木、岩石、板条箱、灌木丛

### 🔫 5 种武器系统

| 武器 | 类型 | 伤害 | 射速 | 射程 | 弹容量 |
|------|------|------|------|------|--------|
| 🔫 P92 手枪 | 手枪 | 15 | 0.25s | 400 | 15 |
| 💥 S686 霰弹枪 | 霰弹 | 12×8 | 0.8s | 200 | 2 |
| 🎯 M416 突击步枪 | 步枪 | 22 | 0.1s | 600 | 30 |
| 🔭 Kar98 狙击枪 | 狙击 | 75 | 1.5s | 1000 | 5 |
| ⚡ UMP9 冲锋枪 | 冲锋 | 18 | 0.08s | 350 | 25 |

### 🤖 智能 AI 系统
- **30 名 AI 对手**，三种难度等级（简单 / 中等 / 困难）
- 有限状态机 AI：巡逻 → 搜索物资 → 战斗 → 逃跑 → 跑圈
- 不同难度的 AI 拥有不同的感知范围、瞄准精度和反应时间

### ⭕ 缩圈机制
- **6 阶段**渐进式缩圈，圈外伤害逐轮递增
- 带电弧视觉效果的毒圈边界
- 小地图实时显示安全区范围

### 📦 完整的物资系统
- 武器、弹药、医疗包、防弹衣、能量饮料
- 稀有度系统（普通 / 优秀 / 稀有 / 史诗）
- 建筑内和户外均有物资分布
- 击杀掉落全部物资

### ✈️ 空投系统
- 每 90 秒飞机投放一次空投
- 空投包含高级武器和稀有物资
- 降落伞降落动画 + 红色烟雾信号

### 🎨 视觉特效
- 7 种粒子效果：枪口闪光、弹壳、血液飞溅、爆炸、烟雾、尘土
- 子弹轨迹拖尾
- 军事风格暗色 UI，glassmorphism 菜单
- 准心、受伤闪红、低血量警告

### 🔊 程序化音效
- **Web Audio API** 实时合成所有音效
- 每种武器独特的枪声
- 换弹、拾取、击杀、缩圈警报等音效
- 零外部音频文件依赖

## 🕹️ 操作说明

| 按键 | 功能 |
|------|------|
| `W` `A` `S` `D` | 移动 |
| `鼠标移动` | 瞄准方向 |
| `鼠标左键` | 射击 |
| `R` | 换弹 |
| `E` | 拾取物资 / 打开空投 |
| `1` / `2` | 切换武器槽 |
| `4` | 使用医疗包（+50 HP，3秒施法） |
| `5` | 使用能量饮料（+25 HP，+15% 移速 10秒） |
| `M` | 打开/关闭大地图 |

## 🎮 游戏流程

```
开始菜单 → 飞机航线 → 跳伞降落 → 搜索物资 → 缩圈开始
    ↓                                           ↓
  操作说明                              战斗 & 生存
                                           ↓
                            ┌─────────── 存活？──────────┐
                            ↓                            ↓
                      继续缩圈                       游戏结束
                            ↓                        (显示排名)
                      最后一人？
                            ↓
                  🏆 大吉大利，今晚吃鸡！
```

## ⚙️ 技术架构

```
pubg_game/
├── index.html          # 游戏入口
├── index.css           # 全局样式（军事暗色主题）
├── README.md
└── js/
    ├── engine.js       # 🎮 游戏主循环 & 状态管理
    ├── input.js        # ⌨️ 键鼠输入处理
    ├── audio.js        # 🔊 Web Audio API 程序化音效
    ├── particles.js    # ✨ 粒子特效系统
    ├── weapons.js      # 🔫 武器数据定义
    ├── bullet.js       # 💨 子弹物理 & 碰撞检测
    ├── loot.js         # 📦 物资生成 & 拾取
    ├── zone.js         # ⭕ 缩圈系统（6阶段）
    ├── airdrop.js      # ✈️ 空投系统
    ├── map.js          # 🗺️ 程序化地图生成
    ├── player.js       # 🧑 玩家控制
    ├── bot.js          # 🤖 AI Bot（FSM 状态机）
    ├── hud.js          # 📊 HUD 界面
    └── minimap.js      # 🗺️ 小地图
```

### 技术亮点

- **零依赖**：纯原生 JavaScript，无任何第三方库
- **离屏 Canvas 预渲染**：地形纹理一次性渲染到离屏 Canvas，每帧仅绘制可见区域
- **视口裁剪**：所有渲染物体进行视口内检测，大幅减少绘制开销
- **碰撞网格**：将地图划分为 40px 格子，O(1) 碰撞查询
- **有限状态机 AI**：每个 Bot 拥有独立的 FSM，5 种行为状态自然切换
- **程序化音效合成**：使用 OscillatorNode + 噪声缓冲区生成所有音效

## 🛠️ 开发

### 本地开发

```bash
# 推荐使用 Live Server 获得更好的开发体验
# VS Code 扩展: ritwickdey.LiveServer

# 或使用 Python 简易服务器
python -m http.server 8080
```

### 自定义配置

**调整地图大小**（[engine.js](js/engine.js)）：
```javascript
Game.MAP_WIDTH = 4000;   // 修改地图宽度
Game.MAP_HEIGHT = 4000;  // 修改地图高度
```

**调整 Bot 数量和难度分布**（[engine.js](js/engine.js) `startGame` 方法）：
```javascript
for (let i = 0; i < 10; i++) difficulties.push('easy');
for (let i = 0; i < 13; i++) difficulties.push('medium');
for (let i = 0; i < 7; i++) difficulties.push('hard');
```

**调整缩圈参数**（[zone.js](js/zone.js)）：
```javascript
this.phases = [
    { waitTime: 60, shrinkTime: 30, damage: 1, sizePercent: 0.75 },
    // ...
];
```

**添加新武器**（[weapons.js](js/weapons.js)）：
```javascript
WeaponData['newgun'] = {
    name: '新武器', type: 'newgun', damage: 30,
    fireRate: 0.15, range: 500, bulletSpeed: 850,
    magSize: 20, reloadTime: 2.0, spread: 0.04,
    ammoType: 'rifle', color: '#FF5722', icon: '🔥'
};
```

## 📝 浏览器兼容性

| 浏览器 | 支持 |
|--------|------|
| Chrome 80+ | ✅ 推荐 |
| Firefox 75+ | ✅ |
| Edge 80+ | ✅ |
| Safari 14+ | ✅ |

## 📜 License

本项目采用 [MIT License](LICENSE) 开源协议。

---

<p align="center">
  <b>🏆 大吉大利，今晚吃鸡！</b><br>
  <sub>如果觉得好玩，请给个 ⭐ Star 支持一下！</sub>
</p>
