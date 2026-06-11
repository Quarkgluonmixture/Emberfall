/** Scrolling chronicle feed: the latest lines of the world's story. */
import type { SimState } from '../core/types';
import { SEASON_NAMES } from '../sim/time';

const VISIBLE_ENTRIES = 9;

export class ChroniclePanel {
  private root: HTMLElement;
  private lastLength = -1;

  constructor() {
    this.root = document.getElementById('chronicle')!;
  }

  update(state: SimState): void {
    if (state.chronicle.length === this.lastLength) return;
    this.lastLength = state.chronicle.length;
    const entries = state.chronicle.slice(-VISIBLE_ENTRIES);
    this.root.innerHTML = entries
      .map(
        (e) =>
          `<div class="entry imp${e.importance}"><span class="when">Y${e.year} ${SEASON_NAMES[
            e.season
          ].slice(0, 3)}</span>${e.text}</div>`,
      )
      .join('');
  }
}
