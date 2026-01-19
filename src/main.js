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
let uploadArea, readerView, fileInput, btnLoadDemo, wordContainer, wordDisplay;
let scopeEndModal, btnReplayScope, btnNextSection, btnClearScope, btnContents;

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
  btnLoadDemo = document.getElementById('btn-load-demo');
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
    btnLoadDemo.addEventListener('click', loadDemo);

    // Setup scope end modal (these might not exist initially)
    if (btnReplayScope) {
      btnReplayScope.addEventListener('click', () => {
      scopeEndModal.classList.add('hidden');
      if (playbackController && playbackController.scope) {
        playbackController.setIndex(playbackController.scope.startIndex);
        playbackController.clearScope();
        playbackController.play();
        controls.updatePlayPauseIcon(true);
      }
      });
    }

    if (btnNextSection) {
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

    if (btnClearScope) {
      btnClearScope.addEventListener('click', () => {
      scopeEndModal.classList.add('hidden');
      if (playbackController) {
        playbackController.clearScope();
        scopePill.hide();
      }
      });
    }

    // Setup contents button
    if (btnContents) {
      btnContents.addEventListener('click', () => {
      if (contents) {
        contents.show();
      }
      });
    }
  } catch (error) {
    console.error('Initialization error:', error);
    throw error; // Let global error handler catch it
  }
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

    // Initialize playback
    initializePlayback(tokens);

    // Show reader view
    uploadArea.classList.add('hidden');
    readerView.classList.remove('hidden');

    // Check for resume
    const progress = await getProgress(docId);
    if (progress) {
      resumeModal.show(docId, tokens);
    } else {
      startReading(0);
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

  // Create UI components
  controls = new Controls(playbackController);
  contents = new Contents(
    currentOutline,
    playbackController,
    (index) => {
      // On jump
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

async function loadDemo() {
  try {
    const basePath = import.meta.env.BASE_URL || '/';
    const response = await fetch(basePath + 'demo.txt');
    if (!response.ok) {
      throw new Error('Failed to load demo file');
    }
    const text = await response.text();
    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], 'demo.txt', { type: 'text/plain' });
    await loadDocument(file);
  } catch (error) {
    console.error('Error loading demo:', error);
    alert('Error loading demo file: ' + error.message);
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
