/** The historical record: a legible saga, not an event ledger.
 *  - "Saga" mode shows only the epochal spine (importance 3: foundings, wars,
 *    treaties, conquests, golden ages, civ falls, rebirths).
 *  - "Full record" adds the notable regional beats (importance 2).
 *  Either way, when one kind repeats within a year it collapses to a single
 *  summary line ("7 towns rose") so a churning world still reads as history. */
import type { ChronicleEntry, SimState } from '../core/types';
import { entryText, getLang, seasonName, t } from './i18n';
import { eventIconHtml } from './icons';
import { bindSingletonClick } from './singletonEvent';

const MAX_YEARS_SHOWN = 60;
/** Repeats of one kind within a year collapse once they reach this count. */
const AGGREGATE_AT = 3;
/** Kinds with a dedicated "{n} …" summary string in i18n. */
const AGGREGATABLE = new Set([
  'town',
  'collapse',
  'warDeclared',
  'treatySigned',
  'peace',
  'rivalry',
  'succession',
  'schism',
  'wildfire',
  'capture',
]);

type Mode = 'saga' | 'full';

export class HistoryPanel {
  visible = false;
  private root: HTMLElement;
  private mode: Mode = 'saga';
  private renderedChronicle: SimState['chronicle'] | null = null;
  private renderedLength = -1;
  private renderedLang = '';
  private renderedMode: Mode | '' = '';
  private state: SimState | null = null;

  constructor(private onFocus?: (x: number, y: number) => void) {
    this.root = document.getElementById('history')!;
    // A restarted world creates a fresh controller around the same DOM root.
    // Keep the DOM state aligned with the new controller and replace, rather
    // than stack, the root click handler.
    this.root.classList.toggle('hidden', true);
    bindSingletonClick(this.root, (e) => {
      const target = e.target as HTMLElement;
      const tab = target?.closest('[data-mode]') as HTMLElement | null;
      if (tab) {
        const next = tab.dataset.mode as Mode;
        if (next && next !== this.mode) {
          this.mode = next;
          this.renderedLength = -1; // force re-render
          if (this.state) this.render(this.state);
        }
        return;
      }
      const row = target?.closest('[data-x]') as HTMLElement | null;
      if (row && this.onFocus) this.onFocus(Number(row.dataset.x), Number(row.dataset.y));
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.classList.toggle('hidden', !this.visible);
    this.renderedLength = -1;
  }

  update(state: SimState): void {
    this.state = state;
    if (!this.visible) return;
    if (
      state.chronicle === this.renderedChronicle &&
      state.chronicle.length === this.renderedLength &&
      getLang() === this.renderedLang &&
      this.mode === this.renderedMode
    )
      return;
    this.render(state);
  }

  private render(state: SimState): void {
    this.renderedChronicle = state.chronicle;
    this.renderedLength = state.chronicle.length;
    this.renderedLang = getLang();
    this.renderedMode = this.mode;

    const minImp = this.mode === 'saga' ? 3 : 2;
    const kept = state.chronicle.filter((e) => e.importance >= minImp);
    const byYear = new Map<number, ChronicleEntry[]>();
    for (const e of kept) {
      let arr = byYear.get(e.year);
      if (!arr) byYear.set(e.year, (arr = []));
      arr.push(e);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a).slice(0, MAX_YEARS_SHOWN);

    const tab = (m: Mode, key: string) =>
      `<span class="saga-tab${this.mode === m ? ' active' : ''}" data-mode="${m}">${t(key)}</span>`;
    let html = `<h2>${t('history.title')}</h2>`;
    html += `<div class="saga-tabs">${tab('saga', 'history.saga')}${tab('full', 'history.full')}</div>`;

    if (years.length === 0) {
      html += `<div class="entry">${t('history.empty')}</div>`;
    }
    for (const year of years) {
      html += `<div class="year-block"><h4>${t('history.year', year)}</h4>`;
      const entries = byYear.get(year)!;
      const counts = new Map<string, number>();
      for (const e of entries) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
      const collapsed = new Set(
        [...counts].filter(([k, n]) => n >= AGGREGATE_AT && AGGREGATABLE.has(k)).map(([k]) => k),
      );
      // Summary lines for the collapsed kinds, then the rest in order.
      for (const kind of collapsed) {
        html += `<div class="entry agg">${eventIconHtml(kind)}${t(`history.agg.${kind}`, counts.get(kind)!)}</div>`;
      }
      for (const e of entries) {
        if (collapsed.has(e.kind)) continue;
        const mark = e.importance === 3 ? '★ ' : '';
        const loc =
          e.x !== undefined && e.y !== undefined ? ` data-x="${e.x}" data-y="${e.y}"` : '';
        html += `<div class="entry${loc ? ' focusable' : ''}"${loc}><span class="when">${seasonName(e.season)}</span>${eventIconHtml(e.kind)}${mark}${entryText(e)}</div>`;
      }
      html += '</div>';
    }
    this.root.innerHTML = html;
  }
}
