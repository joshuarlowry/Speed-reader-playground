export class ScopePill {
  constructor() {
    this.indicator = document.getElementById('scope-indicator');
  }

  show(title) {
    if (this.indicator) {
      this.indicator.textContent = title || 'Reading section';
      this.indicator.classList.remove('hidden');
    }
  }

  hide() {
    if (this.indicator) {
      this.indicator.classList.add('hidden');
    }
  }

  update(title) {
    if (title) {
      this.show(title);
    } else {
      this.hide();
    }
  }
}
