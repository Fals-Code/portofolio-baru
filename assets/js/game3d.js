// Code Runner 3D – v3 | Fullscreen Edition
// Features: Intense Web Audio music, Pause, Dynamic themes, Progressive difficulty

class CodeRunnerGame {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // Core
        this.laneWidth = 3;
        this.baseSpeed = 14;
        this.speed = this.baseSpeed;
        this.gravity = -52;
        this.jumpForce = 22;

        // State
        this.state = 'START'; // START, PLAYING, PAUSED, GAMEOVER
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('codeRunnerHS') || '0');

        // Player
        this.playerData = { lane: 0, yVelocity: 0, isJumping: false, canDoubleJump: true };
        this.obstacles = [];
        this.collectibles = [];
        this.clock = new THREE.Clock();
        this.timeElapsed = 0;
        this.spawnInterval = 1.5;

        // Touch
        this.touchStartX = 0;
        this.touchStartY = 0;

        // Themes per level
        this.themes = [
            { bg: 0x060810, fog: 0x060810, grid: 0x10183a, player: 0x3b82f6, accent: 0x60a5fa, label: '#3b82f6', name: 'Blueprint' },
            { bg: 0x0a0614, fog: 0x0a0614, grid: 0x1e0a3a, player: 0xa855f7, accent: 0xd946ef, label: '#a855f7', name: 'Neon'      },
            { bg: 0x040d04, fog: 0x040d04, grid: 0x072507, player: 0x22c55e, accent: 0x4ade80, label: '#22c55e', name: 'Matrix'    },
            { bg: 0x100404, fog: 0x100404, grid: 0x2a0808, player: 0xe8533a, accent: 0xfb923c, label: '#e8533a', name: 'Inferno'   },
            { bg: 0x020d10, fog: 0x020d10, grid: 0x041d2a, player: 0x06b6d4, accent: 0x22d3ee, label: '#06b6d4', name: 'Cyber'    },
        ];
        this.currentTheme = 0;

        // Audio
        this.audio = null;
        this.musicPlaying = false;
        this.musicEnabled = true;
        this.beatTimeout = null;
        this.oscNodes = [];

        this.initDOM();
        this.initThree();
        this.initAudio();
        this.bindEvents();
        this.animate();
        this.updateHUD();
    }

    // ═══════════════════════════════════════════════
    //  AUDIO ENGINE  (intense, greget version)
    // ═══════════════════════════════════════════════

    initAudio() {
        try {
            this.audio = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { this.musicEnabled = false; }
    }

    startMusic() {
        if (!this.musicEnabled || !this.audio || this.musicPlaying) return;
        if (this.audio.state === 'suspended') this.audio.resume();

        const ctx = this.audio;
        this.musicPlaying = true;

        // Master chain: compressor → limiter → destination
        const master = ctx.createGain();
        master.gain.value = 0.7;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 8;
        comp.ratio.value = 6;
        comp.release.value = 0.15;
        master.connect(comp);
        comp.connect(ctx.destination);
        this._master = master;

        // ── Bassline (heavy sawtooth sub) ──────────────────
        const bassline = [55, 55, 73.4, 55, 58.3, 55, 65.4, 73.4]; // A1-based pattern
        let bassStep = 0;
        const playBass = () => {
            if (!this.musicPlaying) return;
            const now = ctx.currentTime;
            const freq = bassline[bassStep % bassline.length] * (1 + (this.level - 1) * 0.03);
            bassStep++;

            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600 + this.level * 40, now);
            filter.Q.value = 8;

            env.gain.setValueAtTime(0, now);
            env.gain.linearRampToValueAtTime(0.9, now + 0.01);
            env.gain.exponentialRampToValueAtTime(0.3, now + 0.08);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            osc.connect(filter); filter.connect(env); env.connect(master);
            osc.start(now); osc.stop(now + 0.25);

            const interval = Math.max(100, 160 - this.level * 8);
            this.beatTimeout = setTimeout(playBass, interval);
        };
        playBass();

        // ── Lead arp (bright, cutting) ────────────────────
        const arpNotes = [220, 277.2, 329.6, 369.99, 440, 369.99, 329.6, 277.2];
        let arpStep = 0;
        const playArp = () => {
            if (!this.musicPlaying) return;
            const now = ctx.currentTime;
            const freq = arpNotes[arpStep % arpNotes.length];
            arpStep++;

            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.setValueAtTime(freq * 1.01, now + 0.01); // slight detune

            env.gain.setValueAtTime(0.22, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            const hpf = ctx.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.value = 400;

            osc.connect(hpf); hpf.connect(env); env.connect(master);
            osc.start(now); osc.stop(now + 0.2);

            const interval = Math.max(80, 130 - this.level * 6);
            setTimeout(playArp, interval);
        };
        setTimeout(playArp, 50);

        // ── Kick drum (punchy) ─────────────────────────────
        const playKick = () => {
            if (!this.musicPlaying) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(28, now + 0.3);
            env.gain.setValueAtTime(1.8, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(env); env.connect(master);
            osc.start(now); osc.stop(now + 0.4);

            const interval = Math.max(200, 400 - this.level * 15);
            setTimeout(playKick, interval);
        };
        playKick();

        // ── Snare (noise) ───────────────────────────────────
        const playSnare = () => {
            if (!this.musicPlaying) return;
            const now = ctx.currentTime;
            const bufSize = ctx.sampleRate * 0.12;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.6, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            const hpf = ctx.createBiquadFilter();
            hpf.type = 'highpass'; hpf.frequency.value = 1500;
            src.connect(hpf); hpf.connect(env); env.connect(master);
            src.start(now);

            const interval = Math.max(200, 380 - this.level * 12);
            setTimeout(playSnare, interval * 2);
        };
        setTimeout(playSnare, 200);

        // ── Hi-hat (tight) ─────────────────────────────────
        const playHat = () => {
            if (!this.musicPlaying) return;
            const now = ctx.currentTime;
            const bufSize = ctx.sampleRate * 0.04;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.25, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            const hpf = ctx.createBiquadFilter();
            hpf.type = 'highpass'; hpf.frequency.value = 10000;
            src.connect(hpf); hpf.connect(env); env.connect(master);
            src.start(now);

            const interval = Math.max(60, 100 - this.level * 4);
            setTimeout(playHat, interval);
        };
        setTimeout(playHat, 100);
    }

    stopMusic() {
        this.musicPlaying = false;
        clearTimeout(this.beatTimeout);
        if (this._master) {
            this._master.gain.setTargetAtTime(0, this.audio.currentTime, 0.1);
        }
    }

    playSFX(type) {
        if (!this.musicEnabled || !this.audio) return;
        if (this.audio.state === 'suspended') this.audio.resume();
        const ctx = this.audio;
        const now = ctx.currentTime;

        if (type === 'collect') {
            [600, 800, 1100].forEach((f, i) => {
                const o = ctx.createOscillator();
                const e = ctx.createGain();
                o.type = 'sine'; o.frequency.value = f;
                e.gain.setValueAtTime(0.3, now + i * 0.06);
                e.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
                o.connect(e); e.connect(ctx.destination);
                o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.15);
            });
        } else if (type === 'hit') {
            const o = ctx.createOscillator();
            const e = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(280, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.25);
            e.gain.setValueAtTime(0.8, now); e.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            o.connect(e); e.connect(ctx.destination);
            o.start(now); o.stop(now + 0.35);
        } else if (type === 'levelup') {
            [330, 440, 550, 660, 880].forEach((f, i) => {
                const t = now + i * 0.1;
                const o = ctx.createOscillator();
                const e = ctx.createGain();
                o.type = 'triangle'; o.frequency.value = f;
                e.gain.setValueAtTime(0.5, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                o.connect(e); e.connect(ctx.destination);
                o.start(t); o.stop(t + 0.2);
            });
        }
    }

    // ═══════════════════════════════════════════════
    //  DOM / HUD
    // ═══════════════════════════════════════════════

    initDOM() {
        this.uiLayer = document.createElement('div');
        this.uiLayer.className = 'game3d-ui';
        this.container.appendChild(this.uiLayer);
    }

    updateHUD() {
        const t = this.themes[this.currentTheme % this.themes.length];
        let hearts = '';
        for (let i = 0; i < this.lives; i++) hearts += '<i class="fas fa-heart"></i>';

        if (this.state === 'START') {
            this.uiLayer.innerHTML = `
            <div class="g-overlay">
                <div class="g-logo" style="color:${t.label}">Code Runner</div>
                <p class="g-sub">Hindari bug merah, kumpulkan commit hijau.<br>Makin lama… makin gila.</p>
                <div class="g-controls">
                    <span><kbd>←</kbd><kbd>→</kbd> Pindah Lane</span>
                    <span><kbd>Space</kbd> Loncat (2x)</span>
                    <span><kbd>P</kbd> Pause</span>
                </div>
                <div class="g-btn-group">
                    <button class="g-btn" id="g-start-btn" style="background:${t.label}">
                        <i class="fas fa-play"></i> Start Game
                    </button>
                </div>
                <div class="g-hs">🏆 Best: ${this.highScore}</div>
                <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:rgba(255,255,255,0.35);cursor:pointer;margin-top:0.75rem;">
                    <input type="checkbox" id="g-music-cb" ${this.musicEnabled ? 'checked' : ''} style="accent-color:${t.label}">
                    <i class="fas fa-music"></i> Musik
                </label>
                <div style="margin-top:1.25rem;">
                    <a href="index.html" style="font-size:0.78rem;color:rgba(255,255,255,0.25);text-decoration:underline;">← Kembali ke Portfolio</a>
                </div>
            </div>`;
            document.getElementById('g-start-btn').onclick = () => this.startGame();
            const cb = document.getElementById('g-music-cb');
            if (cb) cb.onchange = e => { this.musicEnabled = e.target.checked; };

        } else if (this.state === 'PAUSED') {
            this.uiLayer.innerHTML = `
            ${this._hudHTML(t, hearts)}
            <div class="g-pause-overlay">
                <div class="g-pause-card">
                    <h2 style="color:${t.label}"><i class="fas fa-pause" style="font-size:1.4rem;margin-right:0.5rem;"></i>Paused</h2>
                    <p>Tekan P atau klik Resume untuk melanjutkan</p>
                    <div class="g-btn-group">
                        <button class="g-btn" id="g-resume-btn" style="background:${t.label}">
                            <i class="fas fa-play"></i> Resume
                        </button>
                        <button class="g-btn g-btn-sec" id="g-restart-in-pause">
                            <i class="fas fa-redo"></i> Restart
                        </button>
                    </div>
                    <div style="margin-top:1.25rem;">
                        <a href="index.html" style="font-size:0.78rem;color:rgba(255,255,255,0.25);text-decoration:underline;">← Kembali ke Portfolio</a>
                    </div>
                </div>
            </div>`;
            this._bindHUDBtns(t);
            document.getElementById('g-resume-btn').onclick = () => this.resumeGame();
            document.getElementById('g-restart-in-pause').onclick = () => this.startGame();

        } else if (this.state === 'GAMEOVER') {
            const isNew = Math.floor(this.score) >= this.highScore && this.highScore > 0;
            this.uiLayer.innerHTML = `
            <div class="g-overlay">
                <div class="g-logo" style="color:#ef4444">Game Over</div>
                ${isNew ? '<div class="g-new-record">🏆 Rekor Baru!</div>' : ''}
                <div class="g-final-score" style="color:${t.label}">${Math.floor(this.score)}</div>
                <p style="color:rgba(255,255,255,0.35);font-size:.85rem;margin-bottom:1.5rem;">Dicapai di Level ${this.level}</p>
                <div class="g-btn-group">
                    <button class="g-btn" id="g-restart-btn" style="background:${t.label}">
                        <i class="fas fa-redo"></i> Coba Lagi
                    </button>
                    <a href="index.html" class="g-btn g-btn-sec"><i class="fas fa-home"></i> Portfolio</a>
                </div>
                <div class="g-hs">🏆 Best: ${this.highScore}</div>
            </div>`;
            document.getElementById('g-restart-btn').onclick = () => this.startGame();

        } else { // PLAYING
            this.uiLayer.innerHTML = this._hudHTML(t, hearts);
            this._bindHUDBtns(t);
        }
    }

    _hudHTML(t, hearts) {
        return `
        <div class="g-hud">
            <a href="index.html" class="g-back-btn"><i class="fas fa-arrow-left"></i></a>
            <div class="g-hud-left">
                <div class="g-score-val" style="color:${t.label}" id="hud-score">${Math.floor(this.score)}</div>
                <div class="g-score-lbl">Score</div>
            </div>
            <div class="g-hud-center">
                <div class="g-level-badge" id="hud-level" style="border-color:${t.label};color:${t.label}">Lv.${this.level} — ${t.name}</div>
                <div class="g-speed" id="hud-speed">Speed: ${Math.floor(this.speed)}</div>
            </div>
            <div class="g-hud-right">
                <span class="g-lives">${hearts}</span>
                <button class="g-icon-btn" id="hud-pause-btn" title="Pause (P)">
                    <i class="fas fa-pause"></i>
                </button>
                <button class="g-icon-btn" id="hud-music-btn" title="Music (M)">
                    <i class="fas fa-${this.musicEnabled ? 'volume-up' : 'volume-mute'}"></i>
                </button>
            </div>
        </div>`;
    }

    _bindHUDBtns(t) {
        const pb = document.getElementById('hud-pause-btn');
        if (pb) pb.onclick = () => this.state === 'PAUSED' ? this.resumeGame() : this.pauseGame();
        const mb = document.getElementById('hud-music-btn');
        if (mb) mb.onclick = () => this.toggleMusic();
    }

    // ═══════════════════════════════════════════════
    //  THREE.JS
    // ═══════════════════════════════════════════════

    initThree() {
        const t = this.themes[0];
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(t.bg);
        this.scene.fog = new THREE.FogExp2(t.fog, 0.016);

        this.camera = new THREE.PerspectiveCamera(72, this.container.clientWidth / this.container.clientHeight, 0.1, 800);
        this.camera.position.set(0, 4.5, 10);
        this.camera.lookAt(0, 1, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(this.ambientLight);
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(-8, 20, 8);
        this.scene.add(this.dirLight);
        this.pLight = new THREE.PointLight(t.player, 1.5, 14);
        this.scene.add(this.pLight);

        this.createGrid();
        this.createPlayer();
        this.initParticles();
    }

    applyTheme(idx) {
        const t = this.themes[idx % this.themes.length];
        this.scene.background = new THREE.Color(t.bg);
        this.scene.fog = new THREE.FogExp2(t.fog, 0.016);
        this.gridMaterial.color.setHex(t.grid);
        this.player.material.color.setHex(t.player);
        this.player.material.emissive.setHex(t.player);
        this.pLight.color.setHex(t.player);
        this.particleSystem.material.color.setHex(t.accent);
    }

    createGrid() {
        this.gridGroup = new THREE.Group();
        this.scene.add(this.gridGroup);
        this.gridMaterial = new THREE.LineBasicMaterial({ color: this.themes[0].grid, transparent: true, opacity: 0.6 });
        // Lane lines
        for (let i = -1; i <= 1; i++) {
            const g = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i * this.laneWidth, 0, 100),
                new THREE.Vector3(i * this.laneWidth, 0, -300)
            ]);
            this.gridGroup.add(new THREE.Line(g, this.gridMaterial));
        }
        // Horizontal lines
        this.hLines = [];
        for (let i = 0; i < 28; i++) {
            const hg = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-this.laneWidth * 1.6, 0, 0),
                new THREE.Vector3(this.laneWidth * 1.6, 0, 0)
            ]);
            const l = new THREE.Line(hg, this.gridMaterial);
            l.position.z = -i * 11;
            this.gridGroup.add(l);
            this.hLines.push(l);
        }
        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(this.laneWidth * 3.2, 400),
            new THREE.MeshStandardMaterial({ color: 0x04050a, roughness: 1 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.z = -100;
        this.scene.add(floor);
    }

    createPlayer() {
        const t = this.themes[0];
        const mat = new THREE.MeshStandardMaterial({ color: t.player, emissive: t.player, emissiveIntensity: 0.65, metalness: 0.3, roughness: 0.35 });
        this.player = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.88, 0.88), mat);
        this.player.position.y = 0.44;
        this.scene.add(this.player);
        // Wireframe overlay
        const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.18 });
        this.playerWire = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.88, 0.88), wireMat);
        this.player.add(this.playerWire);
    }

    initParticles() {
        const pGeo = new THREE.BufferGeometry();
        const count = 130;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 16;
            pos[i + 1] = Math.random() * 10;
            pos[i + 2] = -Math.random() * 90;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ size: 0.14, color: this.themes[0].accent, transparent: true, opacity: 0.5 });
        this.particleSystem = new THREE.Points(pGeo, mat);
        this.scene.add(this.particleSystem);
    }

    // ═══════════════════════════════════════════════
    //  INPUT
    // ═══════════════════════════════════════════════

    bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });

        document.addEventListener('keydown', (e) => {
            if (this.state === 'PLAYING') {
                if (e.key === 'ArrowLeft' || e.key === 'a') this.moveLane(-1);
                else if (e.key === 'ArrowRight' || e.key === 'd') this.moveLane(1);
                else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { this.jump(); e.preventDefault(); }
                else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.pauseGame();
                else if (e.key === 'm' || e.key === 'M') this.toggleMusic();
            } else if (this.state === 'PAUSED') {
                if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.resumeGame();
            }
        });

        this.container.addEventListener('touchstart', e => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        this.container.addEventListener('touchend', e => {
            if (this.state !== 'PLAYING') return;
            const dx = e.changedTouches[0].screenX - this.touchStartX;
            const dy = e.changedTouches[0].screenY - this.touchStartY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) this.moveLane(dx > 0 ? 1 : -1);
            else if (dy < -30 || (Math.abs(dx) < 10 && Math.abs(dy) < 10)) this.jump();
        }, { passive: true });
    }

    moveLane(dir) { this.playerData.lane = Math.max(-1, Math.min(1, this.playerData.lane + dir)); }
    jump() {
        if (!this.playerData.isJumping) {
            this.playerData.yVelocity = this.jumpForce;
            this.playerData.isJumping = true;
        } else if (this.playerData.canDoubleJump) {
            this.playerData.yVelocity = this.jumpForce * 0.78;
            this.playerData.canDoubleJump = false;
        }
    }

    // ═══════════════════════════════════════════════
    //  GAME STATE
    // ═══════════════════════════════════════════════

    startGame() {
        this.state = 'PLAYING';
        this.score = 0; this.lives = 3; this.level = 1;
        this.speed = this.baseSpeed; this.spawnInterval = 1.5; this.timeElapsed = 0;
        this.currentTheme = 0;
        this.playerData = { lane: 0, yVelocity: 0, isJumping: false, canDoubleJump: true };
        this.player.position.set(0, 0.44, 0);
        this.obstacles.forEach(o => this.scene.remove(o.mesh));
        this.collectibles.forEach(c => this.scene.remove(c.mesh));
        this.obstacles = []; this.collectibles = [];
        this.applyTheme(0);
        this.clock.getDelta(); // reset clock
        this.updateHUD();
        this.stopMusic();
        this.musicPlaying = false;
        setTimeout(() => this.startMusic(), 80);
    }

    pauseGame() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this.stopMusic();
        this.updateHUD();
    }

    resumeGame() {
        if (this.state !== 'PAUSED') return;
        this.state = 'PLAYING';
        this.clock.getDelta(); // reset dt so no jump
        this.updateHUD();
        this.musicPlaying = false;
        setTimeout(() => this.startMusic(), 80);
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.stopMusic();
        if (Math.floor(this.score) > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('codeRunnerHS', this.highScore);
        }
        this.updateHUD();
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else if (this.state === 'PLAYING') {
            this.musicPlaying = false;
            setTimeout(() => this.startMusic(), 80);
        }
        // Refresh icon
        const mb = document.getElementById('hud-music-btn');
        if (mb) mb.innerHTML = `<i class="fas fa-${this.musicEnabled ? 'volume-up' : 'volume-mute'}"></i>`;
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 350) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.playSFX('levelup');
            const newTheme = (this.level - 1) % this.themes.length;
            if (newTheme !== this.currentTheme) {
                this.currentTheme = newTheme;
                this.applyTheme(this.currentTheme);
                // Restart music for new tempo feel
                this.stopMusic();
                this.musicPlaying = false;
                setTimeout(() => this.startMusic(), 80);
            }
            // Update level badge live
            const badge = document.getElementById('hud-level');
            if (badge) {
                const tNow = this.themes[this.currentTheme % this.themes.length];
                badge.textContent = `Lv.${this.level} — ${tNow.name}`;
                badge.style.color = tNow.label;
                badge.style.borderColor = tNow.label;
            }
            const notif = document.createElement('div');
            notif.className = 'g-levelup-notif';
            notif.style.color = this.themes[this.currentTheme].label;
            notif.innerHTML = `<i class="fas fa-bolt"></i> Level ${this.level}!`;
            this.uiLayer.appendChild(notif);
            setTimeout(() => notif.remove(), 2200);
        }
    }

    // ═══════════════════════════════════════════════
    //  SPAWN
    // ═══════════════════════════════════════════════

    spawnItem() {
        const doubleChance = Math.min(0.4, (this.level - 1) * 0.08);
        const isObstacle = Math.random() < 0.58;
        if (isObstacle) {
            this.spawnObstacle();
            if (Math.random() < doubleChance) setTimeout(() => this.spawnObstacle(), 280);
        } else {
            this.spawnCollectible();
        }
    }

    spawnObstacle() {
        const lane = Math.floor(Math.random() * 3) - 1;
        const type = this.level % 3;
        let geo;
        if (type === 0) geo = new THREE.IcosahedronGeometry(0.55, 0);
        else if (type === 1) geo = new THREE.TetrahedronGeometry(0.65, 0);
        else geo = new THREE.OctahedronGeometry(0.6, 0);
        const mat = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);
        const isHigh = this.level >= 3 && Math.random() < 0.3;
        mesh.position.set(lane * this.laneWidth, isHigh ? 2.1 : 0.5, -115);
        this.scene.add(mesh);
        this.obstacles.push({ mesh, active: true });
    }

    spawnCollectible() {
        const lane = Math.floor(Math.random() * 3) - 1;
        const mat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.7 });
        const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.13, 8, 16), mat);
        mesh.position.set(lane * this.laneWidth, Math.random() > 0.5 ? 3 : 0.8, -115);
        this.scene.add(mesh);
        this.collectibles.push({ mesh, active: true });
    }

    // ═══════════════════════════════════════════════
    //  PHYSICS
    // ═══════════════════════════════════════════════

    updatePhysics(dt) {
        if (this.state !== 'PLAYING') return;

        // Lane
        const tx = this.playerData.lane * this.laneWidth;
        this.player.position.x += (tx - this.player.position.x) * 12 * dt;

        // Jump
        if (this.playerData.isJumping) {
            this.playerData.yVelocity += this.gravity * dt;
            this.player.position.y += this.playerData.yVelocity * dt;
            if (this.player.position.y <= 0.44) {
                this.player.position.y = 0.44;
                this.playerData.isJumping = false;
                this.playerData.canDoubleJump = true;
                this.playerData.yVelocity = 0;
            }
        }

        this.pLight.position.set(this.player.position.x, this.player.position.y + 1, this.player.position.z + 1);
        this.player.rotation.x -= this.speed * dt * 0.4;

        // Score + difficulty
        this.score += this.speed * dt * 0.1;
        const diff = 1 + (this.level - 1) * 0.2;
        this.speed = this.baseSpeed * diff + this.score * 0.007;
        this.spawnInterval = Math.max(0.5, 1.5 - this.level * 0.11);

        this.checkLevelUp();

        // Grid
        this.hLines.forEach(l => { l.position.z += this.speed * dt; if (l.position.z > 12) l.position.z -= 330; });

        // Particles
        const pos = this.particleSystem.geometry.attributes.position.array;
        for (let i = 2; i < pos.length; i += 3) { pos[i] += this.speed * dt * 1.7; if (pos[i] > 12) pos[i] = -90; }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;

        // Spawn
        this.timeElapsed += dt;
        if (this.timeElapsed > this.spawnInterval) { this.spawnItem(); this.timeElapsed = 0; }

        // Collisions
        const pBox = new THREE.Box3().setFromObject(this.player);
        pBox.expandByScalar(-0.1);

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            if (!o.active) continue;
            o.mesh.position.z += this.speed * dt;
            o.mesh.rotation.x += 4 * dt; o.mesh.rotation.y += 4 * dt;
            const ob = new THREE.Box3().setFromObject(o.mesh); ob.expandByScalar(-0.14);
            if (pBox.intersectsBox(ob)) {
                o.active = false; this.scene.remove(o.mesh); this.obstacles.splice(i, 1);
                this.lives--;
                this.playSFX('hit');
                this.flashScreen('rgba(239,68,68,0.5)');
                this.updateHUD();
                if (this.lives <= 0) this.gameOver();
            } else if (o.mesh.position.z > 12) { this.scene.remove(o.mesh); this.obstacles.splice(i, 1); }
        }

        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const c = this.collectibles[i];
            if (!c.active) continue;
            c.mesh.position.z += this.speed * dt; c.mesh.rotation.y += 3 * dt;
            const cb = new THREE.Box3().setFromObject(c.mesh);
            if (pBox.intersectsBox(cb)) {
                c.active = false; this.scene.remove(c.mesh); this.collectibles.splice(i, 1);
                this.score += 50 + this.level * 10;
                this.playSFX('collect');
                this.flashScreen('rgba(16,185,129,0.3)');
            } else if (c.mesh.position.z > 12) { this.scene.remove(c.mesh); this.collectibles.splice(i, 1); }
        }

        // Live score update
        const se = document.getElementById('hud-score');
        if (se) se.textContent = Math.floor(this.score);
        const spd = document.getElementById('hud-speed');
        if (spd) spd.textContent = `Speed: ${Math.floor(this.speed)}`;
    }

    flashScreen(color) {
        const f = document.createElement('div');
        f.style.cssText = `position:fixed;inset:0;background:${color};z-index:5;pointer-events:none;transition:opacity 0.35s ease;`;
        document.body.appendChild(f);
        setTimeout(() => { f.style.opacity = '0'; setTimeout(() => f.remove(), 350); }, 60);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.07);
        this.updatePhysics(dt);
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.portfolioGame = new CodeRunnerGame('game3dContainer');
});
