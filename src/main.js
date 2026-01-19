import { ingestTxt } from './ingest/txt.js';
import { ingestMarkdown } from './ingest/markdown.js';
import { ingestPdf } from './ingest/pdf.js';
import { ingestEpub } from './ingest/epub.js';
import { tokenize } from './reader/tokenize.js';
import { buildOutline } from './outline/outlineBuilder.js';
import { PlaybackController } from './reader/playback.js';
import { renderWord } from './reader/orp.js';
import { saveDocument, getDocument } from './storage/documents.js';
import { saveProgress, getProgress } from './storage/progress.js';
import { Controls } from './ui/controls.js';
import { Contents } from './ui/contents.js';
import { ScopePill } from './ui/scopePill.js';
import { ResumeModal } from './ui/resumeModal.js';

let currentDocId = null;
let currentTokens = null;
let currentOutline = null;
let playbackController = null;
let controls = null;
let contents = null;
let scopePill = null;
let resumeModal = null;

// Wait for DOM to be ready
let uploadArea, readerView, fileInput, wordContainer, wordDisplay;
let scopeEndModal, btnReplayScope, btnNextSection, btnClearScope, btnContents;
let btnBookMenu, bookMenuDropdown, btnCloseBook;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already ready
  init();
}

function getElements() {
  uploadArea = document.getElementById('upload-area');
  readerView = document.getElementById('reader-view');
  fileInput = document.getElementById('file-input');
  wordContainer = document.getElementById('word-container');
  wordDisplay = document.getElementById('word-display');
  scopeEndModal = document.getElementById('scope-end-modal');
  btnReplayScope = document.getElementById('btn-replay-scope');
  btnNextSection = document.getElementById('btn-next-section');
  btnClearScope = document.getElementById('btn-clear-scope');
  btnContents = document.getElementById('btn-contents');
  
  // Verify critical elements exist
  const missing = [];
  if (!uploadArea) missing.push('upload-area');
  if (!readerView) missing.push('reader-view');
  if (!fileInput) missing.push('file-input');
  if (!wordContainer) missing.push('word-container');
  if (!wordDisplay) missing.push('word-display');
  
  if (missing.length > 0) {
    const error = new Error(`Critical DOM elements not found: ${missing.join(', ')}. Check HTML structure.`);
    console.error(error);
    throw error;
  }
}

async function init() {
  try {
    // Get DOM elements
    getElements();
    
    // Setup file input
    fileInput.addEventListener('change', handleFileUpload);
    
    // Setup sample book cards
    setupSampleBooks();

    // Setup scope end modal (these might not exist initially)
    if (btnReplayScope && scopeEndModal) {
      btnReplayScope.addEventListener('click', () => {
        scopeEndModal.classList.add('hidden');
        if (playbackController && playbackController.scope) {
          playbackController.setIndex(playbackController.scope.startIndex);
          playbackController.clearScope();
          playbackController.play();
          controls.updatePlayPauseIcon(true);
          // Ensure controls are visible before fading
          controls.showControls();
          setTimeout(() => {
            controls.fadeControls();
          }, 100);
        }
      });
    }

    if (btnNextSection && scopeEndModal) {
      btnNextSection.addEventListener('click', () => {
        scopeEndModal.classList.add('hidden');
        // Find next section
        if (currentOutline && playbackController && playbackController.scope) {
          const currentEnd = playbackController.scope.endIndex;
          const nextSection = currentOutline.find(item => item.startIndex >= currentEnd);
          if (nextSection) {
            contents.onReadSection(nextSection.startIndex, nextSection.endIndex);
          } else {
            playbackController.clearScope();
            scopePill.hide();
          }
        }
      });
    }

    if (btnClearScope && scopeEndModal) {
      btnClearScope.addEventListener('click', () => {
        scopeEndModal.classList.add('hidden');
        if (playbackController) {
          playbackController.clearScope();
          scopePill.hide();
        }
      });
    }

    // Contents button is now handled by Controls class via btn-contents-quick
    
    // Setup book menu
    btnBookMenu = document.getElementById('btn-book-menu');
    bookMenuDropdown = document.getElementById('book-menu-dropdown');
    btnCloseBook = document.getElementById('btn-close-book');
    
    if (btnBookMenu && bookMenuDropdown) {
      btnBookMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !bookMenuDropdown.classList.contains('hidden');
        if (isOpen) {
          closeBookMenu();
        } else {
          openBookMenu();
        }
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!bookMenuDropdown.classList.contains('hidden') && 
            !bookMenuDropdown.contains(e.target) && 
            e.target !== btnBookMenu) {
          closeBookMenu();
        }
      });
      
      // Close menu on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !bookMenuDropdown.classList.contains('hidden')) {
          closeBookMenu();
        }
      });
    }
    
    if (btnCloseBook) {
      btnCloseBook.addEventListener('click', () => {
        closeBook();
      });
    }
  } catch (error) {
    console.error('Initialization error:', error);
    throw error; // Let global error handler catch it
  }
}

function openBookMenu() {
  if (bookMenuDropdown && btnBookMenu) {
    bookMenuDropdown.classList.remove('hidden');
    btnBookMenu.setAttribute('aria-expanded', 'true');
  }
}

function closeBookMenu() {
  if (bookMenuDropdown && btnBookMenu) {
    bookMenuDropdown.classList.add('hidden');
    btnBookMenu.setAttribute('aria-expanded', 'false');
  }
}

function closeBook() {
  // Save progress before closing
  saveCurrentProgress();
  
  // Stop playback
  if (playbackController) {
    playbackController.pause();
  }
  
  // Reset state
  currentDocId = null;
  currentTokens = null;
  currentOutline = null;
  playbackController = null;
  controls = null;
  contents = null;
  scopePill = null;
  resumeModal = null;
  
  // Close menu
  closeBookMenu();
  
  // Hide reader view, show upload area
  if (readerView) readerView.classList.add('hidden');
  if (uploadArea) uploadArea.classList.remove('hidden');
  
  // Hide controls overlay
  const controlsOverlay = document.getElementById('controls-overlay');
  if (controlsOverlay) controlsOverlay.classList.add('hidden');
  
  // Clear word display
  if (wordDisplay) wordDisplay.innerHTML = '';
  
  // Reset file input so the same file can be re-selected
  if (fileInput) fileInput.value = '';
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  await loadDocument(file);
}

async function loadDocument(file) {
  try {
    // Determine file type
    const ext = file.name.split('.').pop().toLowerCase();
    let markers;

    // Ingest file
    if (ext === 'txt') {
      markers = await ingestTxt(file);
    } else if (ext === 'md') {
      markers = await ingestMarkdown(file);
    } else if (ext === 'pdf') {
      markers = await ingestPdf(file);
    } else if (ext === 'epub') {
      markers = await ingestEpub(file);
    } else {
      alert('Unsupported file type');
      return;
    }

    // Tokenize
    const { tokens, markerPositions } = tokenize(markers);
    
    // Check for empty document
    if (!tokens || tokens.length === 0) {
      alert('Document appears to be empty or could not be parsed.');
      return;
    }
    
    currentTokens = tokens;

    // Build outline
    currentOutline = buildOutline(markerPositions, tokens.length);

    // Save document
    const content = markers.map(m => m.content || '').join(' ');
    const docId = await saveDocument({
      name: file.name,
      type: ext,
      size: file.size,
      content
    });
    currentDocId = docId;

    // Initialize playback (creates playbackController, contents, controls, scopePill)
    initializePlayback(tokens);

    // Show reader view
    uploadArea.classList.add('hidden');
    readerView.classList.remove('hidden');

    // Default behavior: if there are sections, auto-scope to first section
    // If no sections, check for resume or start from beginning
    if (currentOutline && currentOutline.length > 0) {
      // Has sections - set scope to first section and start reading
      const firstSection = currentOutline[0];
      playbackController.setScope(firstSection.startIndex, firstSection.endIndex);
      playbackController.setIndex(firstSection.startIndex);
      if (scopePill) {
        scopePill.show(firstSection.title);
      }
      if (tokens[firstSection.startIndex]) {
        renderWord(tokens[firstSection.startIndex].word, wordContainer);
      }
      if (controls) {
        controls.update();
      }
    } else {
      // No sections - check for resume or start from beginning
      const progress = await getProgress(docId);
      if (progress) {
        resumeModal.show(docId, tokens);
      } else {
        startReading(0);
      }
    }
  } catch (error) {
    console.error('Error loading document:', error);
    alert('Error loading document: ' + error.message);
  }
}

function initializePlayback(tokens) {
  // Create playback controller
  playbackController = new PlaybackController(
    tokens,
      (word, index) => {
      // On word
      renderWord(word, wordContainer);
      controls.updateProgress();
      
      // Save progress periodically
      if (index % 50 === 0) {
        saveCurrentProgress();
      }
    },
    (index) => {
      // On pause
      controls.update();
    },
    () => {
      // On scope end
      scopeEndModal.classList.remove('hidden');
    },
    () => {
      // On complete
      playbackController.pause();
      controls.update();
    }
  );

  contents = new Contents(
    currentOutline,
    playbackController,
    (index) => {
      // On jump (removed - no longer used, but kept for compatibility)
      const safeIndex = Math.max(0, Math.min(index, tokens.length - 1));
      playbackController.setIndex(safeIndex);
      playbackController.pause();
      controls.update();
      if (tokens[safeIndex]) {
        renderWord(tokens[safeIndex].word, wordContainer);
      }
    },
    (startIndex, endIndex) => {
      // On read section
      const safeStart = Math.max(0, Math.min(startIndex, tokens.length - 1));
      const safeEnd = Math.max(safeStart + 1, Math.min(endIndex, tokens.length));
      playbackController.setScope(safeStart, safeEnd);
      playbackController.setIndex(safeStart);
      playbackController.pause();
      controls.update();
      
      // Find section title
      const section = currentOutline.find(item => 
        item.startIndex === startIndex
      );
      if (section) {
        scopePill.show(section.title);
      }
      
      if (tokens[safeStart]) {
        renderWord(tokens[safeStart].word, wordContainer);
      }
    }
  );
  
  // Create controls with contents callback and outline
  controls = new Controls(
    playbackController, 
    wordContainer, 
    tokens,
    () => contents.show(),
    currentOutline // pass outline
  );
  
  scopePill = new ScopePill();
  resumeModal = new ResumeModal(
    async () => {
      // On resume
      const progress = await getProgress(currentDocId);
      if (progress) {
        let resumeIndex = progress.tokenIndex;
        
        // Try anchor matching if index is out of bounds
        if (resumeIndex >= tokens.length) {
          resumeIndex = await resumeModal.findAnchorMatch(currentDocId, tokens);
          if (resumeIndex === null) resumeIndex = 0;
        }
        
        startReading(resumeIndex);
      } else {
        startReading(0);
      }
    },
    () => {
      // On start over
      startReading(0);
    },
    () => {
      // On choose bookmark
      // TODO: Implement bookmark selection
      startReading(0);
    }
  );
}

function startReading(index) {
  if (!playbackController || !currentTokens || currentTokens.length === 0) return;
  const safeIndex = Math.max(0, Math.min(index, currentTokens.length - 1));
  playbackController.setIndex(safeIndex);
  renderWord(currentTokens[safeIndex].word, wordContainer);
  controls.update();
}

async function saveCurrentProgress() {
  if (!currentDocId || !playbackController) return;
  
  const index = playbackController.getCurrentIndex();
  const anchorWindow = currentTokens
    .slice(Math.max(0, index - 5), Math.min(currentTokens.length, index + 10))
    .map(t => t.word);
  
  await saveProgress(currentDocId, index, anchorWindow);
}

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      const basePath = import.meta.env.BASE_URL || '/';
      navigator.serviceWorker.register(basePath + 'sw.js')
        .catch(err => {
          console.log('SW registration failed:', err);
          // Don't show this as a critical error - app can work without SW
        });
    } catch (err) {
      console.error('SW registration error:', err);
    }
  });
}

// Sample books configuration
const SAMPLE_BOOKS = {
  'pride-and-prejudice': {
    file: 'jane-austen_pride-and-prejudice.epub',
    title: 'Pride and Prejudice',
    author: 'Jane Austen'
  },
  'brooklyn-murders': {
    file: 'g-d-h-cole_the-brooklyn-murders.epub',
    title: 'The Brooklyn Murders',
    author: 'G.D.H. Cole'
  }
};

function setupSampleBooks() {
  const bookCards = document.querySelectorAll('.book-card');
  bookCards.forEach(card => {
    card.addEventListener('click', () => {
      const bookId = card.dataset.book;
      if (bookId && SAMPLE_BOOKS[bookId]) {
        loadSampleBook(bookId);
      }
    });
  });
}

async function loadSampleBook(bookId) {
  const book = SAMPLE_BOOKS[bookId];
  if (!book) return;
  
  try {
    const basePath = import.meta.env.BASE_URL || '/';
    const response = await fetch(basePath + 'books/' + book.file);
    if (!response.ok) {
      throw new Error(`Failed to load ${book.title}`);
    }
    const blob = await response.blob();
    const file = new File([blob], book.file, { type: 'application/epub+zip' });
    await loadDocument(file);
  } catch (error) {
    console.error('Error loading sample book:', error);
    alert('Error loading book: ' + error.message);
  }
}

// Auto-save progress on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveCurrentProgress();
  }
});

// Auto-save on unload
window.addEventListener('beforeunload', () => {
  saveCurrentProgress();
});
