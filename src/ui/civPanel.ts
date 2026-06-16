/** Civilization roster: a living scoreboard that explains WHY each culture is
    thriving or failing, plus the world's live story threads. */
import type { Civilization, SimState } from '../core/types';
import { t } from './i18n';
import { eventIconHtml } from './icons';

type Tone = 'good' | 'bad' | 'warn' | 'neutral';

interface Status {
  key: string;
  icon: string;
  tone: Tone;
  /** Hover detail: the cause chain behind the status. */
  detail: string;
}

export class CivPanel {
  private root: HTMLElement;

  constructor(onSelect: (civId: number) => void) {
    this.root = document.getElementById('civpanel')!;
    this.root.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('[data-civ]') as HTMLElement | null;
      if (row) onSelect(Number(row.dataset.civ));
    });
  }

  /** The most salient thing happening to a civ right now, with a cause hint. */
  private status(state: SimState, civ: Civilization): Status {
    const own = state.settlements.filter((s) => s.civId === civ.id);
    const enemies = state.civs.filter(
      (o) => o.id !== civ.id && o.alive && state.relations[civ.id][o.id]?.state === 'war',
    );
    const raided = own.filter((s) => state.day - s.lastRaidDay <= 20).length;
    const famine = own.filter((s) => s.famineDays > 0).length;
    const plague = own.filter((s) => s.plagueDays > 0).length;

    if (civ.goldenAgeDays > 0) {
      return { key: 'civs.status.golden', icon: 'goldenAge', tone: 'good', detail: `${own.length}⌂` };
    }
    if (civ.crisisDays > 0) {
      return { key: 'civs.status.crisis', icon: 'succession', tone: 'bad', detail: '' };
    }
    if (enemies.length) {
      const eMil = Math.max(...enemies.map((o) => o.military));
      const ratio = eMil > 0 ? civ.military / eMil : 2;
      const foe = enemies.map((o) => o.name).join(', ');
      const detail = `${foe} · ${ratio.toFixed(1)}× mil${raided ? ` · ${raided} raided` : ''}`;
      if (ratio <= 0.85) return { key: 'civs.status.losing', icon: 'warDeclared', tone: 'bad', detail };
      if (ratio >= 1.18) return { key: 'civs.status.winning', icon: 'warDeclared', tone: 'good', detail };
      return { key: 'civs.status.war', icon: 'warDeclared', tone: 'warn', detail };
    }
    if (plague > 0) {
      return { key: 'civs.status.plague', icon: 'plague', tone: 'bad', detail: `${plague}⌂` };
    }
    if (famine > 0) {
      return { key: 'civs.status.famine', icon: 'famine', tone: 'bad', detail: `${famine}⌂` };
    }
    if (raided > 0) {
      return { key: 'civs.status.raided', icon: 'warDeclared', tone: 'warn', detail: `${raided}⌂` };
    }
    return { key: 'civs.status.peace', icon: '', tone: 'neutral', detail: '' };
  }

  /** The world's 2-3 loudest live threads: wars, golden ages, crises. */
  private threads(state: SimState): string {
    const live = state.civs.filter((c) => c.alive);
    const byId = (id: number): Civilization | undefined => state.civs[id];
    const out: string[] = [];
    // Active wars, fiercest (longest-running) first.
    const wars: { a: Civilization; b: Civilization; days: number }[] = [];
    for (let i = 0; i < state.civs.length; i++) {
      for (let j = i + 1; j < state.civs.length; j++) {
        const a = byId(i);
        const b = byId(j);
        if (!a?.alive || !b?.alive) continue;
        const rel = state.relations[i]?.[j];
        if (rel?.state === 'war') wars.push({ a, b, days: rel.warDays });
      }
    }
    wars.sort((x, y) => y.days - x.days);
    for (const w of wars.slice(0, 2)) {
      out.push(`${eventIconHtml('warDeclared')} ${w.a.name} <span class="dim">vs</span> ${w.b.name}`);
    }
    const golden = live.find((c) => c.goldenAgeDays > 0);
    if (golden && out.length < 3) {
      out.push(`${eventIconHtml('goldenAge', 'good')} ${golden.name} <span class="dim">${t('civs.status.golden')}</span>`);
    }
    // A crisis thread (succession / famine / plague), if room.
    for (const c of live) {
      if (out.length >= 3) break;
      if (c.crisisDays > 0) {
        out.push(`${eventIconHtml('succession', 'bad')} ${c.name} <span class="dim">${t('civs.status.crisis')}</span>`);
        break;
      }
      const fam = state.settlements.some((s) => s.civId === c.id && s.famineDays > 0);
      if (fam) {
        out.push(`${eventIconHtml('famine', 'bad')} ${c.name} <span class="dim">${t('civs.status.famine')}</span>`);
        break;
      }
    }
    const body = out.length
      ? out.map((l) => `<div class="thread">${l}</div>`).join('')
      : `<div class="thread dim">${t('civs.now.empty')}</div>`;
    return `<div class="now"><div class="now-h">${t('civs.now')}</div>${body}</div>`;
  }

  update(state: SimState): void {
    let html = `<h3>${t('civs.title')}</h3>`;
    html += this.threads(state);
    for (const civ of state.civs) {
      const settlements = state.settlements.filter((s) => s.civId === civ.id);
      const pop = Math.round(settlements.reduce((sum, s) => sum + s.population, 0));
      const color = `#${civ.color.toString(16).padStart(6, '0')}`;
      if (civ.alive) {
        const st = this.status(state, civ);
        const icon = st.icon ? eventIconHtml(st.icon, st.tone) : '';
        const statusHtml = `<span class="status ${st.tone}" title="${st.detail}">${icon}${t(st.key)}</span>`;
        html += `<div class="civ-row" data-civ="${civ.id}">
          <span class="chip" style="background:${color}"></span>
          <span class="cname">${civ.name}</span>
          <span class="dim">${pop} · ${settlements.length}⌂</span>
          ${statusHtml}
        </div>`;
      } else {
        html += `<div class="civ-row fallen" data-civ="${civ.id}">
          <span class="chip" style="background:${color}"></span>
          <span class="cname">${civ.name}</span>
          <span class="dim">${t('civs.fell', civ.fallenYear)}</span>
        </div>`;
      }
    }
    this.root.innerHTML = html;
  }
}
