/** Seed gallery: curated worlds to visit. */
import { SEED_GALLERY } from '../config/seedGallery';

export class SeedGalleryPanel {
  visible = false;
  private root: HTMLElement;

  constructor(onPick: (seed: number) => void) {
    this.root = document.getElementById('gallery')!;
    this.root.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest('[data-seed]') as HTMLElement | null;
      if (card) {
        onPick(Number(card.dataset.seed));
        this.toggle(false);
      }
    });
  }

  toggle(force?: boolean): void {
    this.visible = force ?? !this.visible;
    this.root.classList.toggle('hidden', !this.visible);
    if (this.visible) this.render();
  }

  private render(): void {
    let html = '<h2>CHOOSE A WORLD</h2><div class="gallery-grid">';
    for (const s of SEED_GALLERY) {
      html += `<div class="seed-card" data-seed="${s.seed}">
        <div class="seed-name">${s.name}</div>
        <div class="seed-num">seed ${s.seed}</div>
        <div class="seed-desc">${s.description}</div>
      </div>`;
    }
    html += '</div><div class="gallery-hint">Opening a world starts it fresh — save your current one first.</div>';
    this.root.innerHTML = html;
  }
}
