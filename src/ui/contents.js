export class Contents {
  constructor(outline, playbackController, onJump, onReadSection) {
    this.outline = outline;
    this.playback = playbackController;
    this.onJump = onJump;
    this.onReadSection = onReadSection;
    this.previouslyFocusedElement = null;
    this.setupElements();
    this.setupEventListeners();
    this.render();
  }

  setupElements() {
    this.drawer = document.getElementById('contents-drawer');
    this.contentsList = document.getElementById('contents-list');
    this.btnClose = document.getElementById('btn-close-contents');
  }

  setupEventListeners() {
    this.btnClose.addEventListener('click', () => {
      this.hide();
    });

    // Close on backdrop click
    this.drawer.addEventListener('click', (e) => {
      if (e.target === this.drawer) {
        this.hide();
      }
    });
    
    // Keyboard support for escape key
    this.drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  render() {
    this.contentsList.innerHTML = '';

    if (this.outline.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'p-4 text-muted-foreground text-center';
      emptyMsg.textContent = 'No contents available';
      emptyMsg.setAttribute('role', 'status');
      this.contentsList.appendChild(emptyMsg);
      return;
    }

    for (let i = 0; i < this.outline.length; i++) {
      const item = this.outline[i];
      const div = document.createElement('div');
      div.className = `contents-item contents-item-level-${item.level}`;
      div.setAttribute('role', 'listitem');
      div.setAttribute('tabindex', '0');
      div.setAttribute('aria-label', `${item.title}, section ${i + 1} of ${this.outline.length}`);
      
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'contents-item-title-wrapper';
      
      const title = document.createElement('div');
      title.className = 'contents-item-title';
      title.textContent = item.title;
      titleWrapper.appendChild(title);

      div.appendChild(titleWrapper);

      // Click handler
      const handleSelect = () => {
        this.onReadSection(item.startIndex, item.endIndex);
        this.hide();
      };
      
      div.addEventListener('click', handleSelect);
      
      // Keyboard support - Enter and Space to select
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
        // Arrow key navigation
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = div.nextElementSibling;
          if (next && next.classList.contains('contents-item')) {
            next.focus();
          }
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = div.previousElementSibling;
          if (prev && prev.classList.contains('contents-item')) {
            prev.focus();
          }
        }
      });

      this.contentsList.appendChild(div);
    }
  }

  show() {
    // Store the currently focused element to restore later
    this.previouslyFocusedElement = document.activeElement;
    
    this.drawer.classList.remove('hidden');
    
    // Focus the close button or first item for accessibility
    setTimeout(() => {
      if (this.btnClose) {
        this.btnClose.focus();
      }
    }, 50);
  }

  hide() {
    this.drawer.classList.add('hidden');
    
    // Restore focus to the previously focused element
    if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
      this.previouslyFocusedElement.focus();
    }
  }

  updateOutline(outline) {
    this.outline = outline;
    this.render();
  }
}
