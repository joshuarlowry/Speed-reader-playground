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
      this.contentsList.innerHTML = '<p class="p-4 text-muted-foreground text-center">No contents available</p>';
      return;
    }

    for (const item of this.outline) {
      const div = document.createElement('div');
      div.className = `contents-item contents-item-level-${item.level}`;
      
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'contents-item-title-wrapper';
      
      const title = document.createElement('div');
      title.className = 'contents-item-title';
      title.textContent = item.title;
      titleWrapper.appendChild(title);

      div.appendChild(titleWrapper);

      // Clicking the item reads that section (removed jump concept)
      div.addEventListener('click', () => {
        this.onReadSection(item.startIndex, item.endIndex);
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
