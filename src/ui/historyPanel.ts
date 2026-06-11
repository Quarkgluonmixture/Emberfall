/** The historical record: notable events grouped by year. */
import type { ChronicleEntry, SimState } from '../core/types';
import { SEASON_NAMES } from '../sim/time';
import { eventIconHtml } from './icons';

const MAX_YEARS_SHOWN = 60;

export class HistoryPanel {
  visible = false;
  private root: HTMLElement;
  private renderedLength = -1;

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
    if (state.chronicle.length === this.renderedLength) return;
    this.renderedLength = state.chronicle.length;

    const major = state.chronicle.filter((e) => e.importance >= 2);
    const byYear = new Map<number, ChronicleEntry[]>();
    for (const e of major) {
      let arr = byYear.get(e.year);
      if (!arr) byYear.set(e.year, (arr = []));
      arr.push(e);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a).slice(0, MAX_YEARS_SHOWN);

    let html = '<h2>THE HISTORICAL RECORD</h2>';
    if (years.length === 0) {
      html += '<div class="entry">The world is young; nothing of note has happened yet.</div>';
    }
    for (const year of years) {
      html += `<div class="year-block"><h4>Year ${year}</h4>`;
      for (const e of byYear.get(year)!) {
        const mark = e.importance === 3 ? '★ ' : '';
        html += `<div class="entry"><span class="when">${SEASON_NAMES[e.season]}</span>${eventIconHtml(e.kind)}${mark}${e.text}</div>`;
      }
      html += '</div>';
    }
    this.root.innerHTML = html;
  }
}
