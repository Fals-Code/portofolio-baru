class MusicSystem {
    constructor() {
        this.isPlaying = false;
        this.audioCtx = null;
        this.masterGain = null;
        this.oscillators = [];
        this.lfo = null;
        this.filter = null;
        this.volume = 0.5;
        this.fallbackAudio = null;
        this.fallbackUrl = "https://youtu.be/y4zdDXPYo0I?si=XMK_3_7zHfZnrOom";
        
        this.init();
    }

    init() {
        this.playBtn = document.getElementById("musicPlayBtn");
        this.volumeSlider = document.getElementById("volumeSlider");
        this.visualizer = document.getElementById("musicVisualizer");
        
        if (!this.playBtn) return;

        // Restore state
        this.volume = localStorage.getItem("musicVol") || 0.5;
        if (this.volumeSlider) this.volumeSlider.value = this.volume;
        
        this.bindEvents();
    }

    bindEvents() {
        this.playBtn.addEventListener("click", () => this.togglePlay());
        
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener("input", (e) => {
                this.volume = e.target.value;
                localStorage.setItem("musicVol", this.volume);
                this.updateVolume();
            });
        }

        // Auto-pause when tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying) {
                this.pause();
                this.wasAutoPaused = true;
            } else if (!document.hidden && this.wasAutoPaused) {
                this.play();
                this.wasAutoPaused = false;
            }
        });
    }

    initWebAudio() {
        if (this.audioCtx) return true;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Create a lowpass filter for "lofi/ambient" feel
            this.filter = this.audioCtx.createBiquadFilter();
            this.filter.type = "lowpass";
            this.filter.frequency.value = 800;
            this.filter.Q.value = 1;
            
            this.masterGain.connect(this.filter);
            this.filter.connect(this.audioCtx.destination);
            
            // Generate procedural drones
            this.createDrone(220, "sine", 0.3);      // A3
            this.createDrone(277.18, "sine", 0.2);   // C#4
            this.createDrone(329.63, "triangle", 0.15); // E4
            this.createDrone(110, "triangle", 0.4);  // A2
            
            // LFO for filter sweep
            this.lfo = this.audioCtx.createOscillator();
            this.lfo.type = "sine";
            this.lfo.frequency.value = 0.05; // very slow
            
            const lfoGain = this.audioCtx.createGain();
            lfoGain.gain.value = 400; // Modulation depth
            
            this.lfo.connect(lfoGain);
            lfoGain.connect(this.filter.frequency);
            this.lfo.start();
            
            return true;
        } catch (e) {
            console.warn("Web Audio API not fully supported, falling back to HTML5 Audio", e);
            this.initFallback();
            return false;
        }
    }

    initFallback() {
        if (!this.fallbackAudio) {
            this.fallbackAudio = new Audio(this.fallbackUrl);
            this.fallbackAudio.loop = true;
            this.fallbackAudio.volume = this.volume;
        }
    }

    createDrone(freq, type, gainVol) {
        const osc = this.audioCtx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        const gain = this.audioCtx.createGain();
        gain.gain.value = gainVol;
        
        // Slight detune for richness
        osc.detune.value = (Math.random() - 0.5) * 10;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        this.oscillators.push({ osc, gain });
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        const useWebAudio = this.initWebAudio();
        
        if (useWebAudio && this.audioCtx.state === "suspended") {
            this.audioCtx.resume();
        }
        
        if (useWebAudio) {
            if (this.oscillators.length === 0 || !this.oscillators[0].osc.started) {
                 this.oscillators.forEach(node => {
                     try { node.osc.start(); node.osc.started = true; } catch(e){}
                 });
            }
            // Ramp gain up smoothly
            this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.5);
        } else if (this.fallbackAudio) {
            this.fallbackAudio.play().catch(e => console.error("Audio playback failed", e));
        }

        this.isPlaying = true;
        this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.visualizer.classList.add("playing");
        localStorage.setItem("musicPlaying", "true");
    }

    pause() {
        if (this.audioCtx) {
            // Ramp gain down smoothly to avoid clicks
            if(this.masterGain) this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.5);
        } else if (this.fallbackAudio) {
            this.fallbackAudio.pause();
        }

        this.isPlaying = false;
        this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.visualizer.classList.remove("playing");
        localStorage.setItem("musicPlaying", "false");
    }

    updateVolume() {
        if (this.audioCtx && this.masterGain && this.isPlaying) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.1);
        } else if (this.fallbackAudio) {
            this.fallbackAudio.volume = this.volume;
        }
    }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
    window.portfolioMusicSystem = new MusicSystem();
});
