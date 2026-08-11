/** Scrolling chronicle feed: the latest lines of the world's story. */
import type { SimState } from '../core/types';
import { entryText, getLang, seasonName } from './i18n';
import { eventIconHtml } from './icons';
import { bindSingletonClick } from './singletonEvent';

const VISIBLE_ENTRIES = 9;

export class ChroniclePanel {
  private root: HTMLElement;
  private lastLength = -1;
  private lastLang = '';

  constructor(private onFocus?: (x: number, y: number) => void) {
    this.root = document.getElementById('chronicle')!;
    bindSingletonClick(this.root, (e) => {
      const el = (e.target as HTMLElement)?.closest('[data-x]') as HTMLElement | null;
      if (el && this.onFocus) this.onFocus(Number(el.dataset.x), Number(el.dataset.y));
    });
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
      .map((e) => {
        const loc =
          e.x !== undefined && e.y !== undefined ? ` data-x="${e.x}" data-y="${e.y}"` : '';
        const cls = `entry imp${e.importance}${loc ? ' focusable' : ''}`;
        return `<div class="${cls}"${loc}>${eventIconHtml(e.kind)}<span class="when">Y${
          e.year
        } ${seasonName(e.season)}</span>${e.importance === 3 ? '★ ' : ''}${entryText(e)}</div>`;
      })
      .join('');
  }
}
