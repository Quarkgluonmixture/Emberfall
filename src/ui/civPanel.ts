/** Civilization roster: a living scoreboard of every culture in the world. */
import type { SimState } from '../core/types';
import { t } from './i18n';
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
    let html = `<h3>${t('civs.title')}</h3>`;
    for (const civ of state.civs) {
      const settlements = state.settlements.filter((s) => s.civId === civ.id);
      const pop = Math.round(settlements.reduce((sum, s) => sum + s.population, 0));
      const color = `#${civ.color.toString(16).padStart(6, '0')}`;
      // Recently-raided settlements = frontier under active attack.
      const raided = settlements.filter((s) => state.day - s.lastRaidDay <= 20).length;
      const warSpans = state.civs
        .filter(
          (o) => o.id !== civ.id && o.alive && state.relations[civ.id][o.id]?.state === 'war',
        )
        .map((o) => {
          const rel = state.relations[civ.id][o.id];
          const ratio = o.military > 0 ? civ.military / o.military : 2;
          const col = ratio >= 1.15 ? '#7fc97f' : ratio <= 0.87 ? '#e0705a' : 'var(--ink-dim)';
          const arrow = ratio >= 1.15 ? '▲' : ratio <= 0.87 ? '▼' : '=';
          const title = `${o.name}: ${rel.warDays}d · military ${ratio.toFixed(2)}× · ${raided} raided`;
          return `<span class="war" title="${title}">${o.name} <span style="color:${col}">${arrow}${ratio.toFixed(1)}×</span></span>`;
        });
      const badges = [
        civ.goldenAgeDays > 0 ? `<span style="color:var(--ember)">${eventIconHtml('goldenAge')}</span>` : '',
        civ.crisisDays > 0 ? eventIconHtml('succession') : '',
        warSpans.length > 0 ? `${eventIconHtml('warDeclared')} ${warSpans.join(' ')}` : '',
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
          <span style="color:var(--ink-dim)">${t('civs.fell', civ.fallenYear)}</span>
        </div>`;
      }
    }
    this.root.innerHTML = html;
  }
}
