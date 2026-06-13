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
    // The feed is the world's saga, not its weather: show only notable beats
    // (importance ≥ 2) so a fall, a war, a golden age lingers instead of being
    // shoved offscreen by routine texture. Epochal beats get an ember mark.
    const entries = state.chronicle.filter((e) => e.importance >= 2).slice(-VISIBLE_ENTRIES);
    this.root.innerHTML = entries
      .map(
        (e) =>
          `<div class="entry imp${e.importance}">${eventIconHtml(e.kind)}<span class="when">Y${
            e.year
          } ${seasonName(e.season)}</span>${e.importance === 3 ? '★ ' : ''}${entryText(e)}</div>`,
      )
      .join('');
  }
}
