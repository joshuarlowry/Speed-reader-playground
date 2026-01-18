import { getProgress } from '../storage/progress.js';

export class ResumeModal {
  constructor(onResume, onStartOver, onChooseBookmark) {
    this.onResume = onResume;
    this.onStartOver = onStartOver;
    this.onChooseBookmark = onChooseBookmark;
    this.setupElements();
    this.setupEventListeners();
  }

  setupElements() {
    this.modal = document.getElementById('resume-modal');
    this.preview = document.getElementById('resume-preview');
    this.btnResume = document.getElementById('btn-resume');
    this.btnStartOver = document.getElementById('btn-start-over');
    this.btnChooseBookmark = document.getElementById('btn-choose-bookmark');
  }

  setupEventListeners() {
    this.btnResume.addEventListener('click', () => {
      this.hide();
      if (this.onResume) this.onResume();
    });

    this.btnStartOver.addEventListener('click', () => {
      this.hide();
      if (this.onStartOver) this.onStartOver();
    });

    this.btnChooseBookmark.addEventListener('click', () => {
      this.hide();
      if (this.onChooseBookmark) this.onChooseBookmark();
    });
  }

  async show(docId, tokens) {
    const progress = await getProgress(docId);
    
    if (!progress) {
      // No progress, skip modal
      if (this.onStartOver) this.onStartOver();
      return;
    }

    // Build preview text from anchor window
    let previewText = '';
    if (progress.anchorWindow && progress.anchorWindow.length > 0) {
      previewText = progress.anchorWindow.slice(0, 15).join(' ') + '...';
    } else if (tokens && tokens.length > 0) {
      const start = Math.max(0, progress.tokenIndex - 5);
      const end = Math.min(tokens.length, progress.tokenIndex + 10);
      previewText = tokens.slice(start, end).map(t => t.word).join(' ') + '...';
    }

    this.preview.textContent = previewText || 'Resume where you left off';
    this.modal.classList.remove('hidden');
  }

  hide() {
    this.modal.classList.add('hidden');
  }

  getResumeIndex(docId) {
    return getProgress(docId).then(progress => {
      if (!progress) return null;
      return progress.tokenIndex;
    });
  }

  async findAnchorMatch(docId, tokens) {
    const progress = await getProgress(docId);
    if (!progress || !progress.anchorWindow) return null;

    // Try exact index first
    if (progress.tokenIndex < tokens.length) {
      return progress.tokenIndex;
    }

    // Fuzzy match anchor window
    const anchorWords = progress.anchorWindow;
    if (anchorWords.length === 0) return null;

    const tokenWords = tokens.map(t => t.word);
    
    // Find best match
    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i <= tokenWords.length - anchorWords.length; i++) {
      let matches = 0;
      for (let j = 0; j < anchorWords.length && i + j < tokenWords.length; j++) {
        if (tokenWords[i + j] === anchorWords[j]) {
          matches++;
        }
      }
      const score = matches / anchorWords.length;
      if (score > bestScore && score > 0.7) {
        bestScore = score;
        bestMatch = i;
      }
    }

    return bestMatch;
  }
}
