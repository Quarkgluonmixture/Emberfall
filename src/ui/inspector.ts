/** Inspection panel for tiles, citizens, settlements and civilizations. */
import { TERRAIN_DEFS } from '../config/terrainConfig';
import { Terrain, type SimState } from '../core/types';
import type { AgentSystem } from '../sim/agents';
import { gatherYields } from '../sim/resources';
import { yearOf } from '../sim/time';
import { BALANCE } from '../config/balance';
import { BiographyPanel } from './biographyPanel';
import { agentStateName, relationName, t, terrainName, tierName, traitName } from './i18n';

export type Selection =
  | { kind: 'tile'; x: number; y: number }
  | { kind: 'settlement'; id: number }
  | { kind: 'civ'; id: number }
  | { kind: 'citizen'; id: number }
  | null;

function row(label: string, value: string | number): string {
  return `<tr><td>${label}</td><td>${value}</td></tr>`;
}

function civLink(state: SimState, civId: number): string {
  const civ = state.civs[civId];
  if (!civ) return '—';
  const color = `#${civ.color.toString(16).padStart(6, '0')}`;
  return `<a href="#" data-civ="${civ.id}" style="color:${color}">${civ.name}</a>`;
}

export class Inspector {
  selection: Selection = null;
  private root: HTMLElement;
  private bio = new BiographyPanel();
  private lastState: SimState | null = null;

  constructor() {
    this.root = document.getElementById('inspector')!;
    this.root.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.classList.contains('close')) {
        this.select(null);
        e.preventDefault();
        return;
      }
      const bioEl = t.closest('[data-bio]') as HTMLElement | null;
      if (bioEl) {
        if (this.lastState) this.bio.open(this.lastState, Number(bioEl.dataset.bio));
        e.preventDefault();
        return;
      }
      const civEl = t.closest('[data-civ]') as HTMLElement | null;
      if (civEl) {
        this.select({ kind: 'civ', id: Number(civEl.dataset.civ) });
        e.preventDefault();
        return;
      }
      const setEl = t.closest('[data-settlement]') as HTMLElement | null;
      if (setEl) {
        this.select({ kind: 'settlement', id: Number(setEl.dataset.settlement) });
        e.preventDefault();
      }
    });
  }

  select(sel: Selection): void {
    this.selection = sel;
    this.root.classList.toggle('hidden', sel === null);
  }

  update(state: SimState, agents: AgentSystem): void {
    this.lastState = state;
    if (!this.selection) return;
    let html = '';
    switch (this.selection.kind) {
      case 'tile':
        html = this.tileHtml(state, this.selection.x, this.selection.y);
        break;
      case 'settlement':
        html = this.settlementHtml(state, this.selection.id);
        break;
      case 'civ':
        html = this.civHtml(state, this.selection.id);
        break;
      case 'citizen':
        html = this.citizenHtml(state, agents, this.selection.id);
        break;
    }
    this.root.innerHTML = `<span class="close">✕</span>${html}`;
  }

  private tileHtml(state: SimState, x: number, y: number): string {
    const w = state.world;
    const i = y * w.width + x;
    const terr = w.terrain[i] as Terrain;
    const def = TERRAIN_DEFS[terr];
    const owner = w.owner[i];
    const yields = gatherYields(w, x, y, BALANCE.resources.gatherRadius);
    return `<h3>${terrainName(def.name)}</h3>
      <div class="sub">${t('inspector.tile')} ${x}, ${y}</div>
      <table>
      ${row(t('inspector.owner'), owner >= 0 ? civLink(state, owner) : t('inspector.unclaimed'))}
      ${row(t('inspector.elevation'), w.elevation[i].toFixed(2))}
      ${row(t('inspector.moisture'), w.moisture[i].toFixed(2))}
      ${row(t('inspector.temperature'), w.temperature[i].toFixed(2))}
      ${row(t('inspector.areaFood'), yields.food.toFixed(1))}
      ${row(t('inspector.areaWood'), yields.wood.toFixed(1))}
      ${row(t('inspector.areaStone'), yields.stone.toFixed(1))}
      </table>`;
  }

  private settlementHtml(state: SimState, id: number): string {
    const s = state.settlements.find((x) => x.id === id);
    if (!s) return `<h3>${t('inspector.ruins')}</h3><div class="sub">${t('inspector.ruinsSub')}</div>`;
    const afflictions = [
      s.plagueDays > 0 ? `${t('inspector.plague')} (${s.plagueDays}d)` : '',
      s.famineDays > 0 ? `${t('inspector.famine')} (${s.famineDays}d)` : '',
      s.hungerDays > 0 ? `${t('inspector.hungry')} ${s.hungerDays}d` : '',
    ]
      .filter(Boolean)
      .join(', ');
    return `<h3>${s.name}</h3>
      <div class="sub">${tierName(s.tier)} ${t('inspector.of')} ${civLink(state, s.civId)} · ${t('inspector.founded', yearOf(s.foundedDay))}</div>
      <table>
      ${row(t('inspector.population'), Math.round(s.population))}
      ${row(t('inspector.food'), Math.round(s.food))}
      ${row(t('inspector.wood'), Math.round(s.wood))}
      ${row(t('inspector.stone'), Math.round(s.stone))}
      ${row(t('inspector.morale'), Math.round(s.morale))}
      ${row(t('inspector.afflictions'), afflictions || t('inspector.none'))}
      </table>`;
  }

  private civHtml(state: SimState, id: number): string {
    const civ = state.civs[id];
    if (!civ) return '';
    const settlements = state.settlements.filter((s) => s.civId === id);
    const pop = Math.round(settlements.reduce((sum, s) => sum + s.population, 0));
    const traits = civ.traits.map((tr) => `<span class="tag">${traitName(tr)}</span>`).join('');
    const places = settlements
      .map((s) => `<a href="#" data-settlement="${s.id}">${s.name}</a>`)
      .join(', ');
    let relations = '';
    for (const other of state.civs) {
      if (other.id === id) continue;
      const rel = state.relations[id][other.id];
      if (!rel) continue;
      const label = other.alive ? relationName(rel.state) : t('inspector.fallen');
      const terms = other.alive
        ? [
            (rel.truceDays ?? 0) > 0 ? `${t('inspector.truce')} ${rel.truceDays}d` : '',
            (rel.tributeDays ?? 0) > 0
              ? rel.tributeFrom === id
                ? t('inspector.payingTribute')
                : t('inspector.owedTribute')
              : '',
          ]
            .filter(Boolean)
            .join(' · ')
        : '';
      relations += row(other.name, `${label} (${Math.round(rel.score)})${terms ? ` · ${terms}` : ''}`);
    }
    const status = !civ.alive
      ? `${t('inspector.fellInYear')} ${civ.fallenYear} ${t('inspector.fellInYearSuffix')}`.trim()
      : civ.goldenAgeDays > 0
        ? `${t('inspector.goldenAge')} (${civ.goldenAgeDays}d)`
        : civ.crisisDays > 0
          ? `${t('inspector.crisis')} (${civ.crisisDays}d)`
          : t('inspector.stable');
    return `<h3>${civ.name}</h3>
      <div class="sub">${status} · <a href="#" data-bio="${civ.id}">${t('inspector.readStory')}</a></div>
      <div>${traits}</div>
      <table>
      ${row(t('inspector.population'), pop)}
      ${row(t('inspector.military'), Math.round(civ.military))}
      ${row(t('inspector.knowledge'), Math.round(civ.knowledge))}
      ${row(t('inspector.faith'), Math.round(civ.faith))}
      ${row(t('inspector.culture'), Math.round(civ.culture))}
      ${row(t('inspector.settlements'), places || '—')}
      ${relations}
      </table>`;
  }

  private citizenHtml(state: SimState, agents: AgentSystem, id: number): string {
    const a = agents.agents.find((x) => x.id === id);
    if (!a) return `<h3>${t('inspector.citizen')}</h3><div class="sub">${t('inspector.citizenGone')}</div>`;
    const home = state.settlements.find((s) => s.id === a.settlementId);
    return `<h3>${t('inspector.citizenOf')} ${civLink(state, a.civId)}</h3>
      <div class="sub">${t('inspector.citizenSub')}</div>
      <table>
      ${row(t('inspector.doing'), agentStateName(a.state))}
      ${row(t('inspector.home'), home ? `<a href="#" data-settlement="${home.id}">${home.name}</a>` : t('inspector.lost'))}
      </table>`;
  }
}
