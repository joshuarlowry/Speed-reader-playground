export class Controls {
  constructor(playbackController) {
    this.playback = playbackController;
    this.controlsVisible = false;
    this.setupElements();
    this.setupEventListeners();
  }

  setupElements() {
    this.readerView = document.getElementById('reader-view');
    this.controlsOverlay = document.getElementById('controls-overlay');
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');
    this.btnRewind = document.getElementById('btn-rewind');
    this.btnForward = document.getElementById('btn-forward');
    this.btnSettings = document.getElementById('btn-settings');
    this.progressScrubber = document.getElementById('progress-scrubber');
    this.settingsModal = document.getElementById('settings-modal');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.wpmSlider = document.getElementById('wpm-slider');
    this.wpmValue = document.getElementById('wpm-value');
  }

  setupEventListeners() {
    // Toggle controls on reader tap
    this.readerView.addEventListener('click', (e) => {
      if (e.target === this.readerView || e.target.closest('.word-container')) {
        this.toggleControls();
      }
    });

    // Play/Pause
    this.btnPlayPause.addEventListener('click', () => {
      if (this.playback.state === 'playing') {
        this.playback.pause();
        this.updatePlayPauseIcon(false);
      } else {
        this.playback.play();
        this.updatePlayPauseIcon(true);
      }
    });

    // Rewind/Forward
    this.btnRewind.addEventListener('click', () => {
      const newIndex = Math.max(0, this.playback.getCurrentIndex() - 10);
      this.playback.setIndex(newIndex);
      this.playback.pause();
      this.updatePlayPauseIcon(false);
    });

    this.btnForward.addEventListener('click', () => {
      if (!this.playback || !this.playback.tokens || this.playback.tokens.length === 0) return;
      const newIndex = Math.min(
        this.playback.tokens.length - 1,
        this.playback.getCurrentIndex() + 10
      );
      this.playback.setIndex(newIndex);
      this.playback.pause();
      this.updatePlayPauseIcon(false);
    });

    // Settings
    this.btnSettings.addEventListener('click', () => {
      this.settingsModal.classList.remove('hidden');
    });

    this.btnCloseSettings.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
    });

    // WPM slider
    this.wpmSlider.addEventListener('input', (e) => {
      const wpm = parseInt(e.target.value);
      this.wpmValue.textContent = wpm;
      this.playback.setWPM(wpm);
    });

    // Progress scrubber
    let isScrubbing = false;
    this.progressScrubber.addEventListener('mousedown', () => {
      isScrubbing = true;
    });
    this.progressScrubber.addEventListener('mouseup', () => {
      isScrubbing = false;
    });
    this.progressScrubber.addEventListener('touchstart', () => {
      isScrubbing = true;
    });
    this.progressScrubber.addEventListener('touchend', () => {
      isScrubbing = false;
    });
    this.progressScrubber.addEventListener('input', () => {
      if (isScrubbing && this.playback && this.playback.tokens && this.playback.tokens.length > 0) {
        const progress = parseFloat(this.progressScrubber.value);
        const total = this.playback.scope
          ? (this.playback.scope.endIndex - this.playback.scope.startIndex)
          : this.playback.tokens.length;
        const newIndex = this.playback.scope
          ? this.playback.scope.startIndex + Math.floor((progress / 100) * total)
          : Math.floor((progress / 100) * total);
        this.playback.setIndex(newIndex);
        this.playback.pause();
        this.updatePlayPauseIcon(false);
      }
    });
  }

  toggleControls() {
    this.controlsVisible = !this.controlsVisible;
    if (this.controlsVisible) {
      this.controlsOverlay.classList.remove('hidden');
    } else {
      this.controlsOverlay.classList.add('hidden');
    }
  }

  showControls() {
    this.controlsVisible = true;
    this.controlsOverlay.classList.remove('hidden');
  }

  hideControls() {
    this.controlsVisible = false;
    this.controlsOverlay.classList.add('hidden');
  }

  updatePlayPauseIcon(isPlaying) {
    if (isPlaying) {
      this.iconPlay.classList.add('hidden');
      this.iconPause.classList.remove('hidden');
    } else {
      this.iconPlay.classList.remove('hidden');
      this.iconPause.classList.add('hidden');
    }
  }

  updateProgress() {
    const progress = this.playback.getProgress();
    this.progressScrubber.value = progress;
  }

  update() {
    this.updatePlayPauseIcon(this.playback.state === 'playing');
    this.updateProgress();
  }
}
