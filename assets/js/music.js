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
        this.audio.crossOrigin = "anonymous";
        this.audio.loop = true;
        this.audio.volume = this.volume;
        
        // Handle loading errors
        this.audio.onerror = () => {
            console.error("Audio failed to load. Skipping to next track.");
            this.nextTrack();
        };

        this.init();
    }

    init() {
        this.playBtn = document.getElementById("musicPlayBtn");
        this.volumeSlider = document.getElementById("volumeSlider");
        this.visualizer = document.getElementById("musicVisualizer");
        this.label = document.querySelector(".music-label");
        
        if (!this.playBtn) return;

        // Load first track info
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

        // Auto-pause when tab is hidden (Optional, usually better to keep music playing in bg)
        // document.addEventListener('visibilitychange', () => { ... });
    }

    updateUI() {
        if (this.label) {
            this.label.textContent = this.tracks[this.currentTrackIndex].title;
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
        if (!this.audio.src) {
            this.audio.src = this.tracks[this.currentTrackIndex].url;
        }

        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                if (this.visualizer) this.visualizer.classList.add("playing");
            })
            .catch(err => {
                console.warn("Audio playback failed. User interaction might be required.", err);
            });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (this.visualizer) this.visualizer.classList.remove("playing");
    }

    // Call this to change track: window.portfolioMusicSystem.nextTrack()
    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.audio.src = this.tracks[this.currentTrackIndex].url;
        this.updateUI();
        if (this.isPlaying) this.play();
    }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
    window.portfolioMusicSystem = new MusicSystem();
});
