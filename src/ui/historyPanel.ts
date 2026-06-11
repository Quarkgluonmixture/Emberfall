/** The historical record: notable events grouped by year. */
import type { ChronicleEntry, SimState } from '../core/types';
import { entryText, getLang, seasonName, t } from './i18n';
import { eventIconHtml } from './icons';

const MAX_YEARS_SHOWN = 60;

export class HistoryPanel {
  visible = false;
  private root: HTMLElement;
  private renderedLength = -1;
  private renderedLang = '';

  constructor() {
    this.root = document.getElementById('history')!;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.classList.toggle('hidden', !this.visible);
    this.renderedLength = -1;
  }

  update(state: SimState): void {
    if (!this.visible) return;
    if (state.chronicle.length === this.renderedLength && getLang() === this.renderedLang) return;
    this.renderedLength = state.chronicle.length;
    this.renderedLang = getLang();

    const major = state.chronicle.filter((e) => e.importance >= 2);
    const byYear = new Map<number, ChronicleEntry[]>();
    for (const e of major) {
      let arr = byYear.get(e.year);
      if (!arr) byYear.set(e.year, (arr = []));
      arr.push(e);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a).slice(0, MAX_YEARS_SHOWN);

    let html = `<h2>${t('history.title')}</h2>`;
    if (years.length === 0) {
      html += `<div class="entry">${t('history.empty')}</div>`;
    }
    for (const year of years) {
      html += `<div class="year-block"><h4>${t('history.year', year)}</h4>`;
      for (const e of byYear.get(year)!) {
        const mark = e.importance === 3 ? '★ ' : '';
        html += `<div class="entry"><span class="when">${seasonName(e.season)}</span>${eventIconHtml(e.kind)}${mark}${entryText(e)}</div>`;
      }
      html += '</div>';
    }
    this.root.innerHTML = html;
  }
}
