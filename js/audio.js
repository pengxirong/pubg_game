// ======================================
// 音效系统 - Web Audio API 程序化合成
// ======================================
window.AudioManager = {
    ctx: null,
    masterGain: null,
    initialized: false,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API 不可用');
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    play(name) {
        if (!this.initialized) return;
        this.resume();
        const t = this.ctx.currentTime;
        try {
            switch (name) {
                case 'pistol': this._playGunshot(t, 800, 0.08, 0.6); break;
                case 'shotgun': this._playGunshot(t, 200, 0.15, 0.9); break;
                case 'assault': this._playGunshot(t, 500, 0.06, 0.5); break;
                case 'sniper': this._playSniperShot(t); break;
                case 'smg': this._playGunshot(t, 600, 0.04, 0.4); break;
                case 'reload': this._playReload(t); break;
                case 'pickup': this._playPickup(t); break;
                case 'hit': this._playHit(t); break;
                case 'kill': this._playKill(t); break;
                case 'zone_warning': this._playZoneWarning(t); break;
                case 'heal': this._playHeal(t); break;
                case 'chicken_dinner': this._playVictory(t); break;
            }
        } catch (e) { /* 静默处理音频错误 */ }
    },

    _createNoise(duration) {
        const sr = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * duration, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        return src;
    },

    _playGunshot(t, freq, dur, vol) {
        // 噪声爆发
        const noise = this._createNoise(dur * 2);
        const noiseGain = this.ctx.createGain();
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = freq;
        noiseFilter.Q.value = 1;
        noiseGain.gain.setValueAtTime(vol, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur * 2);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
        noise.stop(t + dur * 2);

        // 低频冲击
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq * 0.3, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + dur);
        oscGain.gain.setValueAtTime(vol * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + dur);
    },

    _playSniperShot(t) {
        this._playGunshot(t, 1200, 0.12, 0.8);
        // 长尾回响
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
        g.gain.setValueAtTime(0.15, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.5);
    },

    _playReload(t) {
        // 金属咔嗒声 - 两段
        [0, 0.3].forEach(offset => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800 + offset * 400, t + offset);
            osc.frequency.exponentialRampToValueAtTime(200, t + offset + 0.05);
            g.gain.setValueAtTime(0.2, t + offset);
            g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start(t + offset);
            osc.stop(t + offset + 0.08);
        });
    },

    _playPickup(t) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(800, t + 0.12);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    _playHit(t) {
        const noise = this._createNoise(0.1);
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 600;
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        noise.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        noise.start(t);
        noise.stop(t + 0.1);
    },

    _playKill(t) {
        this._playHit(t);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    _playZoneWarning(t) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.5);
        g.gain.linearRampToValueAtTime(0, t + 1.0);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 1.0);
    },

    _playHeal(t) {
        [0, 0.15, 0.3].forEach((offset, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 400 + i * 100;
            g.gain.setValueAtTime(0.1, t + offset);
            g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start(t + offset);
            osc.stop(t + offset + 0.15);
        });
    },

    _playVictory(t) {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.2, t + i * 0.2);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.4);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.4);
        });
    }
};
