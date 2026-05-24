// ======================================
// 输入系统 - 键盘与鼠标管理
// ======================================
window.Input = {
    keys: {},
    keysJustPressed: {},
    mouse: {
        x: 0, y: 0,
        worldX: 0, worldY: 0,
        down: false,
        rightDown: false
    },

    init(canvas) {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (!this.keys[key]) {
                this.keysJustPressed[key] = true;
            }
            this.keys[key] = true;
            if (['tab', ' '].includes(key)) e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.updateWorldMouse();
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.down = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.down = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // 失焦时释放所有按键
        window.addEventListener('blur', () => {
            this.keys = {};
            this.mouse.down = false;
            this.mouse.rightDown = false;
        });
    },

    updateWorldMouse() {
        if (window.Game) {
            this.mouse.worldX = this.mouse.x + Game.camera.x;
            this.mouse.worldY = this.mouse.y + Game.camera.y;
        }
    },

    isJustPressed(key) {
        return !!this.keysJustPressed[key];
    },

    clearJustPressed() {
        this.keysJustPressed = {};
    }
};
