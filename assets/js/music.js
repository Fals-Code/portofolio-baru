/**
 * MusicSystem V2 - YouTube IFrame API Integration
 * Handles persistent audio across Barba.js transitions
 */
class MusicSystem {
    constructor() {
        this.player = null;
        this.isPlaying = false;
        this.isReady = false;
        this.volume = parseFloat(localStorage.getItem("musicVol")) || 0.5;
        this.videoId = "y4zdDXPYo0I"; // Coldplay - Viva La Vida
        
        this.init();
    }

    init() {
        this.playBtn = document.getElementById("musicPlayBtn");
        this.volumeSlider = document.getElementById("volumeSlider");
        this.visualizer = document.getElementById("musicVisualizer");
        this.label = document.querySelector(".music-label");

        if (this.volumeSlider) {
            this.volumeSlider.value = this.volume;
            this.volumeSlider.addEventListener("input", (e) => {
                this.volume = parseFloat(e.target.value);
                if (this.player && this.isReady) {
                    this.player.setVolume(this.volume * 100);
                }
                localStorage.setItem("musicVol", this.volume);
            });
        }

        if (this.playBtn) {
            this.playBtn.addEventListener("click", () => this.togglePlay());
        }

        // Initialize YouTube Player when API is ready
        if (window.YT && window.YT.Player) {
            this.onYouTubeIframeAPIReady();
        } else {
            // The global function called by YT API
            window.onYouTubeIframeAPIReady = () => {
                this.onYouTubeIframeAPIReady();
            };
        }
    }

    onYouTubeIframeAPIReady() {
        console.log("MusicSystem: YT API Ready, initializing player...");
        this.player = new YT.Player('youtube-player', {
            height: '10',
            width: '10',
            videoId: this.videoId,
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'disablekb': 1,
                'enablejsapi': 1,
                'origin': window.location.origin,
                'fs': 0,
                'modestbranding': 1,
                'rel': 0,
                'showinfo': 0,
                'iv_load_policy': 3,
                'playlist': this.videoId // Required for looping single video
            },
            events: {
                'onReady': (event) => this.onPlayerReady(event),
                'onStateChange': (event) => this.onPlayerStateChange(event),
                'onError': (error) => console.error("YT Player Error:", error)
            }
        });
    }

    onPlayerReady(event) {
        this.isReady = true;
        this.player.setVolume(this.volume * 100);
        if (this.label) this.label.textContent = "Coldplay - Viva La Vida";
        console.log("MusicSystem: Player is ready.");
    }

    onPlayerStateChange(event) {
        // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.updateUI();
        } else {
            this.isPlaying = false;
            this.updateUI();
        }
    }

    togglePlay() {
        if (!this.isReady) return;
        if (this.isPlaying) {
            this.player.pauseVideo();
        } else {
            this.player.playVideo();
        }
    }

    updateUI() {
        if (!this.playBtn) return;
        if (this.isPlaying) {
            this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            if (this.visualizer) this.visualizer.classList.add("playing");
        } else {
            this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (this.visualizer) this.visualizer.classList.remove("playing");
        }
    }
}

// Global instance to persist across Barba transitions
if (!window.portfolioMusicSystem) {
    window.portfolioMusicSystem = new MusicSystem();
}
