import { renderWord } from './orp.js';
import { calculateDelay } from './timing.js';

export class PlaybackController {
  constructor(tokens, onWord, onPause, onScopeEnd, onComplete) {
    this.tokens = tokens;
    this.onWord = onWord;
    this.onPause = onPause;
    this.onScopeEnd = onScopeEnd;
    this.onComplete = onComplete;
    
    this.state = 'idle'; // idle | playing | paused | scopeEnd
    this.currentIndex = 0;
    this.scope = null; // { startIndex, endIndex }
    this.wpm = 300;
    this.rafId = null;
    this.startTime = 0;
    this.targetTime = 0;
    this.pauseTime = null;
  }

  setWPM(wpm) {
    this.wpm = wpm;
  }

  setScope(startIndex, endIndex) {
    this.scope = { startIndex, endIndex };
    // Clamp current index to scope
    if (this.currentIndex < startIndex) {
      this.currentIndex = startIndex;
    } else if (this.currentIndex >= endIndex) {
      this.currentIndex = startIndex;
    }
  }

  clearScope() {
    this.scope = null;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  setIndex(index) {
    this.currentIndex = Math.max(0, Math.min(index, this.tokens.length - 1));
  }

  play() {
    if (this.state === 'playing') return;
    
    this.state = 'playing';
    // If resuming, adjust targetTime by elapsed pause duration
    if (this.targetTime && this.pauseTime) {
      const pauseDuration = performance.now() - this.pauseTime;
      this.targetTime += pauseDuration;
      this.pauseTime = null;
    } else {
      // Starting fresh
      this.scheduleNext();
    }
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.pauseTime = performance.now();
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.onPause) this.onPause(this.currentIndex);
    }
  }

  stop() {
    this.state = 'idle';
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.currentIndex = 0;
    this.targetTime = 0;
    this.pauseTime = null;
  }

  scheduleNext() {
    if (this.state !== 'playing') return;

    // Check scope bounds
    if (this.scope) {
      if (this.currentIndex >= this.scope.endIndex) {
        this.state = 'scopeEnd';
        if (this.onScopeEnd) this.onScopeEnd();
        return;
      }
    }

    // Check if complete
    if (this.currentIndex >= this.tokens.length) {
      this.state = 'idle';
      if (this.onComplete) this.onComplete();
      return;
    }

    // Get current word
    const token = this.tokens[this.currentIndex];
    const word = token.word;

    // Calculate delay
    const isParagraphBreak = this.currentIndex > 0 && 
      this.tokens[this.currentIndex - 1].isParagraphBreak === true;
    const delay = calculateDelay(word, this.wpm, isParagraphBreak);

    // Render word
    if (this.onWord) {
      this.onWord(word, this.currentIndex);
    }

    // Schedule next word using RAF for accurate timing
    this.startTime = performance.now();
    this.targetTime = this.startTime + delay;
    
    const scheduleFrame = () => {
      if (this.state !== 'playing') return;
      
      const now = performance.now();
      if (now >= this.targetTime) {
        // Time to move to next word
        this.currentIndex++;
        this.rafId = requestAnimationFrame(() => this.scheduleNext());
      } else {
        // Keep waiting
        this.rafId = requestAnimationFrame(scheduleFrame);
      }
    };
    
    this.rafId = requestAnimationFrame(scheduleFrame);
  }

  getProgress() {
    const total = this.scope 
      ? (this.scope.endIndex - this.scope.startIndex)
      : this.tokens.length;
    const current = this.scope
      ? (this.currentIndex - this.scope.startIndex)
      : this.currentIndex;
    return total > 0 ? (current / total) * 100 : 0;
  }
}
