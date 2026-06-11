/** Scrolling chronicle feed: the latest lines of the world's story. */
import type { SimState } from '../core/types';
import { entryText, getLang, seasonName } from './i18n';
import { eventIconHtml } from './icons';

const VISIBLE_ENTRIES = 9;

export class ChroniclePanel {
  private root: HTMLElement;
  private lastLength = -1;
  private lastLang = '';

  constructor() {
    this.root = document.getElementById('chronicle')!;
  }

  update(state: SimState): void {
    if (state.chronicle.length === this.lastLength && getLang() === this.lastLang) return;
    this.lastLength = state.chronicle.length;
    this.lastLang = getLang();
    const entries = state.chronicle.slice(-VISIBLE_ENTRIES);
    this.root.innerHTML = entries
      .map(
        (e) =>
          `<div class="entry imp${e.importance}">${eventIconHtml(e.kind)}<span class="when">Y${
            e.year
          } ${seasonName(e.season)}</span>${entryText(e)}</div>`,
      )
      .join('');
  }
}
