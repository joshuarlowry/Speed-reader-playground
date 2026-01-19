import { renderWord } from '../reader/orp.js';
import { calculateDelay } from '../reader/timing.js';

export class Controls {
  constructor(playbackController, wordContainer, tokens, onShowContents, outline) {
    this.playback = playbackController;
    this.wordContainer = wordContainer;
    this.tokens = tokens;
    this.onShowContents = onShowContents;
    this.outline = outline || [];
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
    this.btnPrevSection = document.getElementById('btn-prev-section');
    this.btnNextSection = document.getElementById('btn-next-section');
    this.btnSpeedDown = document.getElementById('btn-speed-down');
    this.btnSpeedUp = document.getElementById('btn-speed-up');
    this.btnContentsQuick = document.getElementById('btn-contents-quick');
    this.progressScrubber = document.getElementById('progress-scrubber');
    this.wpmDisplay = document.getElementById('wpm-display');
    this.controlsOverlay = document.getElementById('controls-overlay');
    // Settings modal elements (still used for WPM slider if needed)
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
        this.showControls(); // Show controls when paused
      } else {
        this.playback.play();
        this.updatePlayPauseIcon(true);
        // Small delay to ensure controls are visible before fading
        setTimeout(() => {
          this.fadeControls(); // Fade controls when playing
        }, 100);
      }
    });

    // Rewind/Forward (5 seconds worth of words)
    this.btnRewind.addEventListener('click', () => {
      if (!this.playback || !this.tokens || this.tokens.length === 0) return;
      const currentWPM = this.playback.wpm || 300;
      const wordsPer5Seconds = Math.ceil((currentWPM / 60) * 5); // 5 seconds worth of words
      const newIndex = Math.max(0, this.playback.getCurrentIndex() - wordsPer5Seconds);
      this.playback.setIndex(newIndex);
      this.playback.pause();
      this.updatePlayPauseIcon(false);
      if (this.tokens[newIndex] && this.wordContainer) {
        renderWord(this.tokens[newIndex].word, this.wordContainer);
      }
      this.update();
    });

    this.btnForward.addEventListener('click', () => {
      if (!this.playback || !this.tokens || this.tokens.length === 0) return;
      const currentWPM = this.playback.wpm || 300;
      const wordsPer5Seconds = Math.ceil((currentWPM / 60) * 5); // 5 seconds worth of words
      const newIndex = Math.min(
        this.tokens.length - 1,
        this.playback.getCurrentIndex() + wordsPer5Seconds
      );
      this.playback.setIndex(newIndex);
      this.playback.pause();
      this.updatePlayPauseIcon(false);
      if (this.tokens[newIndex] && this.wordContainer) {
        renderWord(this.tokens[newIndex].word, this.wordContainer);
      }
      this.update();
    });

    // Previous/Next Section
    this.btnPrevSection.addEventListener('click', () => {
      if (!this.playback || !this.outline || this.outline.length === 0) return;
      const currentIndex = this.playback.getCurrentIndex();
      // Find the current section
      let currentSection = null;
      for (let i = this.outline.length - 1; i >= 0; i--) {
        if (currentIndex >= this.outline[i].startIndex) {
          currentSection = this.outline[i];
          break;
        }
      }
      // Find previous section
      if (currentSection) {
        const currentSectionIndex = this.outline.findIndex(s => s.startIndex === currentSection.startIndex);
        if (currentSectionIndex > 0) {
          const prevSection = this.outline[currentSectionIndex - 1];
          this.playback.setIndex(prevSection.startIndex);
          this.playback.pause();
          this.updatePlayPauseIcon(false);
          if (this.tokens[prevSection.startIndex] && this.wordContainer) {
            renderWord(this.tokens[prevSection.startIndex].word, this.wordContainer);
          }
          this.update();
        }
      } else if (this.outline.length > 0) {
        // Not in any section, go to first
        const firstSection = this.outline[0];
        this.playback.setIndex(firstSection.startIndex);
        this.playback.pause();
        this.updatePlayPauseIcon(false);
        if (this.tokens[firstSection.startIndex] && this.wordContainer) {
          renderWord(this.tokens[firstSection.startIndex].word, this.wordContainer);
        }
        this.update();
      }
    });

    this.btnNextSection.addEventListener('click', () => {
      if (!this.playback || !this.outline || this.outline.length === 0) return;
      const currentIndex = this.playback.getCurrentIndex();
      // Find next section
      const nextSection = this.outline.find(s => s.startIndex > currentIndex);
      if (nextSection) {
        this.playback.setIndex(nextSection.startIndex);
        this.playback.pause();
        this.updatePlayPauseIcon(false);
        if (this.tokens[nextSection.startIndex] && this.wordContainer) {
          renderWord(this.tokens[nextSection.startIndex].word, this.wordContainer);
        }
        this.update();
      }
    });

    // Speed controls
    this.btnSpeedDown.addEventListener('click', () => {
      const currentWPM = this.playback.wpm || 300;
      const newWPM = Math.max(100, currentWPM - 50);
      this.playback.setWPM(newWPM);
      this.updateWPMDisplay(newWPM);
    });

    this.btnSpeedUp.addEventListener('click', () => {
      const currentWPM = this.playback.wpm || 300;
      const newWPM = Math.min(1000, currentWPM + 50);
      this.playback.setWPM(newWPM);
      this.updateWPMDisplay(newWPM);
    });

    // Contents quick access
    this.btnContentsQuick.addEventListener('click', () => {
      if (this.onShowContents) {
        this.onShowContents();
      } else {
        // Fallback: trigger contents button in settings
        const contentsButton = document.getElementById('btn-contents');
        if (contentsButton) {
          contentsButton.click();
        }
      }
    });

    // WPM slider (if settings modal is still accessible)
    if (this.wpmSlider) {
      this.wpmSlider.addEventListener('input', (e) => {
        const wpm = parseInt(e.target.value);
        this.updateWPMDisplay(wpm);
        this.playback.setWPM(wpm);
      });
    }

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
    if (this.controlsOverlay) {
      this.controlsOverlay.classList.remove('hidden');
      this.controlsOverlay.classList.remove('faded');
    }
  }

  hideControls() {
    this.controlsVisible = false;
    if (this.controlsOverlay) {
      this.controlsOverlay.classList.add('hidden');
    }
  }

  fadeControls() {
    if (this.controlsOverlay) {
      this.controlsOverlay.classList.remove('hidden');
      this.controlsOverlay.classList.add('faded');
    }
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

  updateWPMDisplay(wpm) {
    if (this.wpmDisplay) {
      this.wpmDisplay.textContent = wpm;
    }
    if (this.wpmValue) {
      this.wpmValue.textContent = wpm;
    }
    if (this.wpmSlider) {
      this.wpmSlider.value = wpm;
    }
  }

  update() {
    this.updatePlayPauseIcon(this.playback.state === 'playing');
    this.updateProgress();
    // Update WPM display
    const currentWPM = this.playback.wpm || 300;
    this.updateWPMDisplay(currentWPM);
    
    // Auto-fade when playing
    if (this.playback.state === 'playing') {
      this.fadeControls();
    } else {
      this.showControls();
    }
  }
}
