/**
 * Per-civilization biography: the story of one people, assembled from the
 * chronicle. Opened from the inspector's civ view; renders a static snapshot
 * and is rebuilt on every open. Creates its own DOM node so no bootstrap
 * wiring is needed.
 */
import type { ChronicleEntry, SimState } from '../core/types';
import { SEASON_NAMES, yearOf } from '../sim/time';
import { eventIconHtml } from './icons';

const MAX_YEAR_BLOCKS = 80;

/** Minor (importance 1) kinds that still belong in a life's story. */
const PERSONAL_MINOR_KINDS = new Set(['resettleRuin', 'tributeEnds', 'peace']);

export class BiographyPanel {
  private root: HTMLElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'biography';
    this.root.className = 'panel hidden';
    document.getElementById('ui')!.appendChild(this.root);
    this.root.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('close')) {
        this.close();
        e.preventDefault();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  close(): void {
    this.root.classList.add('hidden');
  }

  open(state: SimState, civId: number): void {
    const civ = state.civs[civId];
    if (!civ) return;

    const entries = state.chronicle.filter(
      (e) =>
        (e.civId === civId || e.text.includes(civ.name)) &&
        (e.importance >= 2 || PERSONAL_MINOR_KINDS.has(e.kind)),
    );

    const byYear = new Map<number, ChronicleEntry[]>();
    for (const e of entries) {
      let arr = byYear.get(e.year);
      if (!arr) byYear.set(e.year, (arr = []));
      arr.push(e);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a).slice(0, MAX_YEAR_BLOCKS);

    const color = `#${civ.color.toString(16).padStart(6, '0')}`;
    const settlements = state.settlements.filter((s) => s.civId === civId);
    const pop = Math.round(settlements.reduce((sum, s) => sum + s.population, 0));
    const born =
      civ.foundedDay > 0 ? `Risen from the ruins in Year ${yearOf(civ.foundedDay)}` : 'One of the first peoples';
    const fate = civ.alive
      ? `${pop} souls across ${settlements.length} settlement${settlements.length === 1 ? '' : 's'}`
      : `Fell in Year ${civ.fallenYear}`;
    const count = (kind: string): number => entries.filter((e) => e.kind === kind).length;
    const deeds = [
      ['wars', count('warDeclared')],
      ['treaties', count('treatySigned')],
      ['golden ages', count('goldenAge')],
      ['towns raised', count('town')],
      ['colonies', count('migration') + count('resettleRuin')],
    ]
      .filter(([, n]) => (n as number) > 0)
      .map(([label, n]) => `${n} ${label}`)
      .join(' · ');

    let html = `<span class="close">✕</span>
      <h2><span class="chip" style="background:${color}"></span>${civ.name}</h2>
      <div class="bio-sub">${born} · ${fate}</div>
      <div class="bio-sub">${civ.traits.map((t) => `<span class="tag">${t}</span>`).join('')}
        ${deeds ? `<span class="bio-deeds">${deeds}</span>` : ''}</div>`;

    if (years.length === 0) {
      html += '<div class="entry">Their story is yet unwritten.</div>';
    }
    for (const year of years) {
      html += `<div class="year-block"><h4>Year ${year}</h4>`;
      for (const e of byYear.get(year)!) {
        const mark = e.importance === 3 ? '★ ' : '';
        html += `<div class="entry"><span class="when">${SEASON_NAMES[e.season]}</span>${eventIconHtml(
          e.kind,
        )}${mark}${e.text}</div>`;
      }
      html += '</div>';
    }

    this.root.innerHTML = html;
    this.root.classList.remove('hidden');
    this.root.scrollTop = 0;
  }
}
