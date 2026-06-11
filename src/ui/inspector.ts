/** Inspection panel for tiles, citizens, settlements and civilizations. */
import { TERRAIN_DEFS } from '../config/terrainConfig';
import { Terrain, type SimState } from '../core/types';
import type { AgentSystem } from '../sim/agents';
import { gatherYields } from '../sim/resources';
import { yearOf } from '../sim/time';
import { BALANCE } from '../config/balance';
import { BiographyPanel } from './biographyPanel';

export type Selection =
  | { kind: 'tile'; x: number; y: number }
  | { kind: 'settlement'; id: number }
  | { kind: 'civ'; id: number }
  | { kind: 'citizen'; id: number }
  | null;

const TIER_NAMES = ['Camp', 'Village', 'Town'];

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
    return `<h3>${def.name}</h3>
      <div class="sub">Tile ${x}, ${y}</div>
      <table>
      ${row('Owner', owner >= 0 ? civLink(state, owner) : 'Unclaimed')}
      ${row('Elevation', w.elevation[i].toFixed(2))}
      ${row('Moisture', w.moisture[i].toFixed(2))}
      ${row('Temperature', w.temperature[i].toFixed(2))}
      ${row('Area food', yields.food.toFixed(1))}
      ${row('Area wood', yields.wood.toFixed(1))}
      ${row('Area stone', yields.stone.toFixed(1))}
      </table>`;
  }

  private settlementHtml(state: SimState, id: number): string {
    const s = state.settlements.find((x) => x.id === id);
    if (!s) return `<h3>Ruins</h3><div class="sub">This place has been abandoned.</div>`;
    const afflictions = [
      s.plagueDays > 0 ? `plague (${s.plagueDays}d)` : '',
      s.famineDays > 0 ? `famine (${s.famineDays}d)` : '',
      s.hungerDays > 0 ? `hungry ${s.hungerDays}d` : '',
    ]
      .filter(Boolean)
      .join(', ');
    return `<h3>${s.name}</h3>
      <div class="sub">${TIER_NAMES[s.tier]} of ${civLink(state, s.civId)} · founded Y${yearOf(s.foundedDay)}</div>
      <table>
      ${row('Population', Math.round(s.population))}
      ${row('Food', Math.round(s.food))}
      ${row('Wood', Math.round(s.wood))}
      ${row('Stone', Math.round(s.stone))}
      ${row('Morale', Math.round(s.morale))}
      ${row('Afflictions', afflictions || 'none')}
      </table>`;
  }

  private civHtml(state: SimState, id: number): string {
    const civ = state.civs[id];
    if (!civ) return '';
    const settlements = state.settlements.filter((s) => s.civId === id);
    const pop = Math.round(settlements.reduce((sum, s) => sum + s.population, 0));
    const traits = civ.traits.map((t) => `<span class="tag">${t}</span>`).join('');
    const places = settlements
      .map((s) => `<a href="#" data-settlement="${s.id}">${s.name}</a>`)
      .join(', ');
    let relations = '';
    for (const other of state.civs) {
      if (other.id === id) continue;
      const rel = state.relations[id][other.id];
      if (!rel) continue;
      const label = other.alive ? rel.state : 'fallen';
      const terms = other.alive
        ? [
            (rel.truceDays ?? 0) > 0 ? `truce ${rel.truceDays}d` : '',
            (rel.tributeDays ?? 0) > 0
              ? rel.tributeFrom === id
                ? 'paying tribute'
                : 'owed tribute'
              : '',
          ]
            .filter(Boolean)
            .join(' · ')
        : '';
      relations += row(other.name, `${label} (${Math.round(rel.score)})${terms ? ` · ${terms}` : ''}`);
    }
    const status = !civ.alive
      ? `Fell in Year ${civ.fallenYear}`
      : civ.goldenAgeDays > 0
        ? `Golden age (${civ.goldenAgeDays}d)`
        : civ.crisisDays > 0
          ? `Succession crisis (${civ.crisisDays}d)`
          : 'Stable';
    return `<h3>${civ.name}</h3>
      <div class="sub">${status} · <a href="#" data-bio="${civ.id}">read their story</a></div>
      <div>${traits}</div>
      <table>
      ${row('Population', pop)}
      ${row('Military', Math.round(civ.military))}
      ${row('Knowledge', Math.round(civ.knowledge))}
      ${row('Faith', Math.round(civ.faith))}
      ${row('Culture', Math.round(civ.culture))}
      ${row('Settlements', places || '—')}
      ${relations}
      </table>`;
  }

  private citizenHtml(state: SimState, agents: AgentSystem, id: number): string {
    const a = agents.agents.find((x) => x.id === id);
    if (!a) return `<h3>Citizen</h3><div class="sub">They have wandered out of sight.</div>`;
    const home = state.settlements.find((s) => s.id === a.settlementId);
    return `<h3>Citizen of ${civLink(state, a.civId)}</h3>
      <div class="sub">A small life in a large world</div>
      <table>
      ${row('Doing', a.state)}
      ${row('Home', home ? `<a href="#" data-settlement="${home.id}">${home.name}</a>` : 'lost')}
      </table>`;
  }
}
