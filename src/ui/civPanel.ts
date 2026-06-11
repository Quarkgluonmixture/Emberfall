/** Civilization roster: a living scoreboard of every culture in the world. */
import type { SimState } from '../core/types';
import { eventIconHtml } from './icons';

export class CivPanel {
  private root: HTMLElement;

  constructor(onSelect: (civId: number) => void) {
    this.root = document.getElementById('civpanel')!;
    this.root.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('[data-civ]') as HTMLElement | null;
      if (row) onSelect(Number(row.dataset.civ));
    });
  }

  update(state: SimState): void {
    let html = '<h3>CIVILIZATIONS</h3>';
    for (const civ of state.civs) {
      const settlements = state.settlements.filter((s) => s.civId === civ.id);
      const pop = Math.round(settlements.reduce((sum, s) => sum + s.population, 0));
      const color = `#${civ.color.toString(16).padStart(6, '0')}`;
      const wars = state.civs
        .filter(
          (o) => o.id !== civ.id && o.alive && state.relations[civ.id][o.id]?.state === 'war',
        )
        .map((o) => o.name);
      const badges = [
        civ.goldenAgeDays > 0 ? `<span style="color:var(--ember)">${eventIconHtml('goldenAge')}</span>` : '',
        civ.crisisDays > 0 ? eventIconHtml('succession') : '',
        wars.length > 0 ? `<span class="war">${eventIconHtml('warDeclared')} ${wars.join(', ')}</span>` : '',
      ]
        .filter(Boolean)
        .join(' ');
      if (civ.alive) {
        html += `<div class="civ-row" data-civ="${civ.id}">
          <span class="chip" style="background:${color}"></span>
          <span>${civ.name}</span>
          <span style="color:var(--ink-dim)">${pop} · ${settlements.length}⌂</span>
          ${badges}
        </div>`;
      } else {
        html += `<div class="civ-row fallen" data-civ="${civ.id}">
          <span class="chip" style="background:${color}"></span>
          <span>${civ.name}</span>
          <span style="color:var(--ink-dim)">fell Y${civ.fallenYear}</span>
        </div>`;
      }
    }
    this.root.innerHTML = html;
  }
}
