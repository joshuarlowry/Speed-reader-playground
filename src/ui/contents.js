export class Contents {
  constructor(outline, playbackController, onJump, onReadSection) {
    this.outline = outline;
    this.playback = playbackController;
    this.onJump = onJump;
    this.onReadSection = onReadSection;
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
  }

  render() {
    this.contentsList.innerHTML = '';

    if (this.outline.length === 0) {
      this.contentsList.innerHTML = '<p style="padding: 1rem; color: var(--text-muted);">No contents available</p>';
      return;
    }

    for (const item of this.outline) {
      const div = document.createElement('div');
      div.className = `contents-item contents-item-level-${item.level}`;
      
      const title = document.createElement('div');
      title.className = 'contents-item-title';
      title.textContent = item.title;
      div.appendChild(title);

      const actions = document.createElement('div');
      actions.className = 'contents-item-actions';
      
      const btnRead = document.createElement('button');
      btnRead.className = 'btn-secondary';
      btnRead.textContent = 'Read';
      btnRead.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onReadSection(item.startIndex, item.endIndex);
        this.hide();
      });
      actions.appendChild(btnRead);

      const btnJump = document.createElement('button');
      btnJump.className = 'btn-secondary';
      btnJump.textContent = 'Jump';
      btnJump.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onJump(item.startIndex);
        this.hide();
      });
      actions.appendChild(btnJump);

      div.appendChild(actions);
      div.addEventListener('click', () => {
        this.onJump(item.startIndex);
        this.hide();
      });

      this.contentsList.appendChild(div);
    }
  }

  show() {
    this.drawer.classList.remove('hidden');
  }

  hide() {
    this.drawer.classList.add('hidden');
  }

  updateOutline(outline) {
    this.outline = outline;
    this.render();
  }
}
