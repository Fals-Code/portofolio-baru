class MusicSystem {
    constructor() {
        this.isPlaying = false;
        this.volume = parseFloat(localStorage.getItem("musicVol")) || 0.5;
        this.currentTrackIndex = 0;
        
        // --- CUSTOM MUSIC PLAYLIST ---
        // These are very stable CDN links for Lofi/Ambient tracks
        this.tracks = [
            { 
                title: "Lofi Dreamscape", 
                url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
            },
            { 
                title: "Midnight Chill", 
                url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
            },
            {
                title: "Soft Focus",
                url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
            }
        ];

        this.audio = new Audio();
        // Removed crossOrigin as it's not strictly needed for basic playback 
        // and can cause blocks on some CDNs.
        this.audio.preload = "auto";
        this.audio.loop = true;
        this.audio.volume = this.volume;
        
        // Handle loading errors
        this.audio.onerror = (e) => {
            console.error("MusicSystem: Audio error details:", e);
            // Don't auto-skip on every tiny error, only if it's a fatal source error
            if (this.audio.error && this.audio.error.code !== 4) { // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
                 this.nextTrack();
            }
        };

        this.init();
    }

    init() {
        this.playBtn = document.getElementById("musicPlayBtn");
        this.volumeSlider = document.getElementById("volumeSlider");
        this.visualizer = document.getElementById("musicVisualizer");
        this.label = document.querySelector(".music-label");
        
        if (!this.playBtn) return;

        // Load default track info
        this.updateUI();

        if (this.volumeSlider) this.volumeSlider.value = this.volume;
        
        this.bindEvents();
    }

    bindEvents() {
        this.playBtn.addEventListener("click", () => this.togglePlay());
        
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener("input", (e) => {
                this.volume = e.target.value;
                this.audio.volume = this.volume;
                localStorage.setItem("musicVol", this.volume);
            });
        }
    }

    updateUI() {
        if (this.label) {
            this.label.textContent = this.tracks[0].title;
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        console.log("MusicSystem: Attempting to play...");
        
        if (!this.audio.src || this.audio.src === "") {
            this.audio.src = this.tracks[0].url;
            this.audio.load();
        }
        
        const playPromise = this.audio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("MusicSystem: Playback started.");
                this.isPlaying = true;
                this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                if (this.visualizer) this.visualizer.classList.add("playing");
            }).catch(error => {
                console.error("MusicSystem: Playback failed.", error);
            });
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (this.visualizer) this.visualizer.classList.remove("playing");
    }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
    window.portfolioMusicSystem = new MusicSystem();
});
