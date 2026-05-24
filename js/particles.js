// ======================================
// 粒子系统 - 视觉特效
// ======================================
window.ParticleSystem = {
    particles: [],

    emit(type, x, y, opts = {}) {
        const count = opts.count || this._defaultCount(type);
        for (let i = 0; i < count; i++) {
            this.particles.push(this._createParticle(type, x, y, opts));
        }
    },

    _defaultCount(type) {
        const counts = {
            muzzleFlash: 1, bulletImpact: 5, blood: 4,
            explosion: 25, smoke: 3, dust: 2, shell: 1
        };
        return counts[type] || 3;
    },

    _createParticle(type, x, y, opts) {
        const angle = opts.angle || Math.random() * Math.PI * 2;
        const p = {
            x, y, type, alpha: 1,
            life: 0, maxLife: 0.5,
            vx: 0, vy: 0,
            size: 3, color: '#fff',
            gravity: 0, rotation: 0, rotSpeed: 0
        };

        switch (type) {
            case 'muzzleFlash':
                p.maxLife = 0.08;
                p.size = 12 + Math.random() * 10;
                p.color = '#FFE082';
                // 闪光在枪口方向
                p.x = x + Math.cos(angle) * 20;
                p.y = y + Math.sin(angle) * 20;
                break;

            case 'bulletImpact':
                p.maxLife = 0.2 + Math.random() * 0.2;
                p.size = 2 + Math.random() * 3;
                p.color = ['#aaa', '#888', '#bbb', '#cc9'][Math.floor(Math.random() * 4)];
                const impSpd = 80 + Math.random() * 120;
                const impAng = Math.random() * Math.PI * 2;
                p.vx = Math.cos(impAng) * impSpd;
                p.vy = Math.sin(impAng) * impSpd;
                p.gravity = 200;
                break;

            case 'blood':
                p.maxLife = 0.3 + Math.random() * 0.3;
                p.size = 3 + Math.random() * 4;
                p.color = ['#e53935', '#c62828', '#b71c1c', '#ff5252'][Math.floor(Math.random() * 4)];
                const bldSpd = 60 + Math.random() * 100;
                const bldAng = (opts.angle || 0) + (Math.random() - 0.5) * 1.2;
                p.vx = Math.cos(bldAng) * bldSpd;
                p.vy = Math.sin(bldAng) * bldSpd;
                p.gravity = 300;
                break;

            case 'explosion':
                p.maxLife = 0.4 + Math.random() * 0.4;
                p.size = 5 + Math.random() * 10;
                p.color = ['#FF6F00', '#FF8F00', '#FFB300', '#F44336', '#ff5722'][Math.floor(Math.random() * 5)];
                const expSpd = 100 + Math.random() * 200;
                const expAng = Math.random() * Math.PI * 2;
                p.vx = Math.cos(expAng) * expSpd;
                p.vy = Math.sin(expAng) * expSpd;
                p.gravity = 50;
                break;

            case 'smoke':
                p.maxLife = 1.0 + Math.random() * 1.0;
                p.size = 8 + Math.random() * 12;
                p.color = '#888';
                p.alpha = 0.4;
                p.vx = (Math.random() - 0.5) * 20;
                p.vy = -20 - Math.random() * 30;
                break;

            case 'dust':
                p.maxLife = 0.3 + Math.random() * 0.2;
                p.size = 2 + Math.random() * 2;
                p.color = '#8D6E63';
                p.alpha = 0.5;
                const dustAng = Math.random() * Math.PI * 2;
                p.vx = Math.cos(dustAng) * (20 + Math.random() * 30);
                p.vy = Math.sin(dustAng) * (20 + Math.random() * 30);
                break;

            case 'shell':
                p.maxLife = 0.5;
                p.size = 3;
                p.color = '#FFD54F';
                const shellAng = (opts.angle || 0) + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                p.vx = Math.cos(shellAng) * (80 + Math.random() * 40);
                p.vy = Math.sin(shellAng) * (80 + Math.random() * 40);
                p.gravity = 400;
                p.rotation = Math.random() * Math.PI;
                p.rotSpeed = (Math.random() - 0.5) * 20;
                break;
        }
        return p;
    },

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.rotation += p.rotSpeed * dt;

            // 淡出
            const lifeRatio = p.life / p.maxLife;
            if (p.type === 'smoke') {
                p.alpha = 0.4 * (1 - lifeRatio);
                p.size += dt * 15; // 烟雾扩大
            } else if (p.type === 'muzzleFlash') {
                p.alpha = 1 - lifeRatio;
                p.size *= 0.9;
            } else {
                p.alpha = 1 - lifeRatio;
            }
        }
    },

    render(ctx, camera) {
        for (const p of this.particles) {
            const sx = p.x - camera.x;
            const sy = p.y - camera.y;

            // 视口裁剪
            if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) continue;

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.translate(sx, sy);

            if (p.type === 'muzzleFlash') {
                // 发光圆形
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                grad.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
                grad.addColorStop(0.4, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'shell') {
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-1.5, -4, 3, 8);
            } else if (p.type === 'smoke') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
};
