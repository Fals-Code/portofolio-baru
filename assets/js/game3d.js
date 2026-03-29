// Code Runner 3D Game using Three.js

class CodeRunnerGame {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        // Settings
        this.laneWidth = 3;
        this.speed = 15; // Starting speed
        this.gravity = -50;
        this.jumpForce = 20;
        
        // Game State
        this.state = 'START'; // START, PLAYING, GAMEOVER
        this.score = 0;
        this.lives = 3;
        this.highScore = localStorage.getItem("codeRunnerHighScore") || 0;
        
        // Entities
        this.player = null;
        this.playerData = {
            lane: 0, // -1, 0, 1
            yVelocity: 0,
            isJumping: false,
            canDoubleJump: true
        };
        
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.clock = new THREE.Clock();
        this.timeElapsed = 0;
        
        // Controls
        this.touchStartX = 0;
        this.touchStartY = 0;

        this.initDOM();
        this.initThree();
        this.bindEvents();
        
        this.animate();
        this.showStartScreen();
    }

    initDOM() {
        this.uiLayer = document.createElement("div");
        this.uiLayer.className = "game3d-ui";
        this.container.appendChild(this.uiLayer);
        
        this.updateHUD();
    }

    updateHUD() {
        let heartStr = "";
        for (let i = 0; i < this.lives; i++) heartStr += '<i class="fas fa-heart"></i> ';
        
        if (this.state === 'START') {
            this.uiLayer.innerHTML = `
                <div class="g-overlay center">
                    <h2>Code Runner</h2>
                    <p>Use Arrows/Swipe to move. Space/Tap to Jump (Double Jump allowed).</p>
                    <p>Collect green commits, avoid red bugs.</p>
                    <button class="btn btn-primary" id="g-start-btn">Start Game</button>
                    <div class="mt-2 text-muted">High Score: ${this.highScore}</div>
                </div>
            `;
            document.getElementById('g-start-btn').addEventListener('click', () => this.startGame());
        } else if (this.state === 'GAMEOVER') {
            this.uiLayer.innerHTML = `
                <div class="g-overlay center">
                    <h2>Game Over</h2>
                    <p>Score: ${Math.floor(this.score)}</p>
                    <p>High Score: ${this.highScore}</p>
                    <button class="btn btn-primary" id="g-restart-btn">Try Again</button>
                </div>
            `;
            document.getElementById('g-restart-btn').addEventListener('click', () => this.startGame());
        } else {
            this.uiLayer.innerHTML = `
                <div class="g-hud">
                    <div class="g-score">Score: <span>${Math.floor(this.score)}</span></div>
                    <div class="g-lives">${heartStr}</div>
                </div>
            `;
        }
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 4, 10);
        this.camera.lookAt(0, 1, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(-10, 20, 10);
        this.scene.add(dirLight);

        // Environment
        this.createGrid();

        // Player (Glowing Developer Cube)
        const pGeo = new THREE.BoxGeometry(1, 1, 1);
        const pMat = new THREE.MeshStandardMaterial({ 
            color: 0x3b82f6, 
            emissive: 0x3b82f6, 
            emissiveIntensity: 0.5,
            wireframe: false
        });
        this.player = new THREE.Mesh(pGeo, pMat);
        this.player.position.y = 0.5;
        this.scene.add(this.player);

        // Point light following player
        this.pLight = new THREE.PointLight(0x3b82f6, 1, 10);
        this.scene.add(this.pLight);

        // Speed Line Particles
        this.initParticles();
    }

    createGrid() {
        this.gridGroup = new THREE.Group();
        this.scene.add(this.gridGroup);

        const material = new THREE.LineBasicMaterial({ color: 0x222233 });
        
        // Create 3 lanes
        for (let i = -1; i <= 1; i++) {
            const geom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i * this.laneWidth, 0, 100),
                new THREE.Vector3(i * this.laneWidth, 0, -200)
            ]);
            this.gridGroup.add(new THREE.Line(geom, material));
        }

        // Moving horizontal lines
        this.hLines = [];
        for (let i = 0; i < 20; i++) {
            const hGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-this.laneWidth*1.5, 0, 0),
                new THREE.Vector3(this.laneWidth*1.5, 0, 0)
            ]);
            const line = new THREE.Line(hGeom, material);
            line.position.z = -i * 10;
            this.gridGroup.add(line);
            this.hLines.push(line);
        }
    }

    initParticles() {
        const pGeom = new THREE.BufferGeometry();
        const pCount = 100;
        const posArray = new Float32Array(pCount * 3);
        
        for(let i=0; i<pCount*3; i+=3) {
            posArray[i] = (Math.random() - 0.5) * 20; // x
            posArray[i+1] = Math.random() * 10;       // y
            posArray[i+2] = -Math.random() * 100;     // z
        }
        
        pGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const pMat = new THREE.PointsMaterial({
            size: 0.2,
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.5
        });
        
        this.particleSystem = new THREE.Points(pGeom, pMat);
        this.scene.add(this.particleSystem);
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            if(!this.container) return;
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });

        document.addEventListener('keydown', (e) => {
            if (this.state !== 'PLAYING') return;
            
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                this.moveLane(-1);
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                this.moveLane(1);
            } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
                this.jump();
                e.preventDefault();
            }
        });

        // Touch Controls
        const el = this.container;
        el.addEventListener('touchstart', (e) => {
            if (this.state !== 'PLAYING') return;
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, {passive: true});

        el.addEventListener('touchend', (e) => {
            if (this.state !== 'PLAYING') return;
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const dx = touchEndX - this.touchStartX;
            const dy = touchEndY - this.touchStartY;
            
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
                // Swipe horizontal
                this.moveLane(dx > 0 ? 1 : -1);
            } else if (dy < -30) {
                // Swipe up
                this.jump();
            } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                // Tap
                this.jump();
            }
        }, {passive: true});
    }

    moveLane(dir) {
        this.playerData.lane += dir;
        if (this.playerData.lane < -1) this.playerData.lane = -1;
        if (this.playerData.lane > 1) this.playerData.lane = 1;
    }

    jump() {
        if (!this.playerData.isJumping) {
            this.playerData.yVelocity = this.jumpForce;
            this.playerData.isJumping = true;
        } else if (this.playerData.canDoubleJump) {
            this.playerData.yVelocity = this.jumpForce * 0.8;
            this.playerData.canDoubleJump = false;
        }
    }

    startGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.lives = 3;
        this.speed = 15;
        this.playerData = { lane: 0, yVelocity: 0, isJumping: false, canDoubleJump: true };
        this.player.position.set(0, 0.5, 0);
        
        // Clear old items
        this.obstacles.forEach(o => this.scene.remove(o.mesh));
        this.collectibles.forEach(c => this.scene.remove(c.mesh));
        this.obstacles = [];
        this.collectibles = [];
        
        this.updateHUD();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem("codeRunnerHighScore", this.highScore);
        }
        this.updateHUD();
    }

    spawnItem() {
        if (Math.random() < 0.6) {
            // Spawn Obstacle (Red Bug)
            const lane = Math.floor(Math.random() * 3) - 1;
            const geo = new THREE.IcosahedronGeometry(0.6, 0); // Spiky bug
            const mat = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true });
            const mesh = new THREE.Mesh(geo, mat);
            
            mesh.position.set(lane * this.laneWidth, 0.5, -100);
            this.scene.add(mesh);
            this.obstacles.push({ mesh, active: true });
        } else {
            // Spawn Collectible (Green Commit)
            const lane = Math.floor(Math.random() * 3) - 1;
            const geo = new THREE.TorusGeometry(0.4, 0.15, 8, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.5 });
            const mesh = new THREE.Mesh(geo, mat);
            
            // Random Y for jump coins
            const isHigh = Math.random() > 0.5;
            mesh.position.set(lane * this.laneWidth, isHigh ? 3 : 0.8, -100);
            
            this.scene.add(mesh);
            this.collectibles.push({ mesh, active: true });
        }
    }

    updatePhysics(dt) {
        if (this.state !== 'PLAYING') return;

        // Player X interpolation (Lane switching)
        const targetX = this.playerData.lane * this.laneWidth;
        this.player.position.x += (targetX - this.player.position.x) * 10 * dt;

        // Player Y physics (Jumping)
        if (this.playerData.isJumping) {
            this.playerData.yVelocity += this.gravity * dt;
            this.player.position.y += this.playerData.yVelocity * dt;

            if (this.player.position.y <= 0.5) {
                this.player.position.y = 0.5;
                this.playerData.isJumping = false;
                this.playerData.canDoubleJump = true;
                this.playerData.yVelocity = 0;
            }
        }

        // Light follow
        this.pLight.position.x = this.player.position.x;
        this.pLight.position.y = this.player.position.y;
        this.pLight.position.z = this.player.position.z + 1;

        // Player Roll animation
        this.player.rotation.x -= this.speed * dt * 0.5;
        if (this.playerData.isJumping) {
            this.player.rotation.y += 10 * dt;
        } else {
            this.player.rotation.y = THREE.MathUtils.lerp(this.player.rotation.y, 0, 10 * dt);
        }

        // Score
        this.score += this.speed * dt * 0.1;
        
        // Speed scaling
        this.speed += 0.1 * dt; // Gradually get faster

        // Grid Animation
        this.hLines.forEach(l => {
            l.position.z += this.speed * dt;
            if (l.position.z > 10) l.position.z -= 200;
        });

        // Particles
        const positions = this.particleSystem.geometry.attributes.position.array;
        for (let i=2; i<positions.length; i+=3) {
            positions[i] += this.speed * dt * 2;
            if (positions[i] > 10) positions[i] = -100;
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;

        // Item Spawning
        this.timeElapsed += dt;
        if (this.timeElapsed > 1.5 - (this.speed * 0.02)) {
            this.spawnItem();
            this.timeElapsed = 0;
        }

        // Items logic
        const pBox = new THREE.Box3().setFromObject(this.player);
        pBox.expandByScalar(-0.1); // Make hitbox slightly forgiving

        // Obstacles (Bugs)
        for(let i = this.obstacles.length - 1; i >= 0; i--) {
            let o = this.obstacles[i];
            if (!o.active) continue;
            
            o.mesh.position.z += this.speed * dt;
            o.mesh.rotation.x += 5 * dt;
            o.mesh.rotation.y += 5 * dt;

            const oBox = new THREE.Box3().setFromObject(o.mesh);
            oBox.expandByScalar(-0.2); // Forgiving hitbox
            
            if (pBox.intersectsBox(oBox)) {
                // Hit!
                o.active = false;
                this.scene.remove(o.mesh);
                this.lives -= 1;
                this.updateHUD();
                
                // Screen flash effect
                this.flashScreen('rgba(239, 68, 68, 0.4)');
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            } else if (o.mesh.position.z > 10) {
                this.scene.remove(o.mesh);
                this.obstacles.splice(i, 1);
            }
        }

        // Collectibles (Commits)
        for(let i = this.collectibles.length - 1; i >= 0; i--) {
            let c = this.collectibles[i];
            if (!c.active) continue;
            
            c.mesh.position.z += this.speed * dt;
            c.mesh.rotation.y += 3 * dt;

            const cBox = new THREE.Box3().setFromObject(c.mesh);
            
            if (pBox.intersectsBox(cBox)) {
                // Collect!
                c.active = false;
                this.scene.remove(c.mesh);
                this.score += 50;
                
                // Flash green
                this.flashScreen('rgba(16, 185, 129, 0.3)');
                
            } else if (c.mesh.position.z > 10) {
                this.scene.remove(c.mesh);
                this.collectibles.splice(i, 1);
            }
        }

        // Update HUD score every few frames roughly
        if (Math.floor(this.score) % 5 === 0) {
            const scoreEl = this.uiLayer.querySelector('.g-score span');
            if (scoreEl) scoreEl.textContent = Math.floor(this.score);
        }
    }

    flashScreen(color) {
        let flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.inset = '0';
        flash.style.backgroundColor = color;
        flash.style.zIndex = '100';
        flash.style.pointerEvents = 'none';
        flash.style.transition = 'opacity 0.3s ease';
        this.container.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        }, 50);
    }

    showStartScreen() {
        this.updateHUD();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const dt = Math.min(this.clock.getDelta(), 0.1); // clamp dt
        this.updatePhysics(dt);
        
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("game3dContainer")) {
        window.portfolioGame = new CodeRunnerGame("game3dContainer");
    }
});
