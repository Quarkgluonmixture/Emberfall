/**
 * Hybrid-simulation detail layer: individual citizen agents materialize for
 * settlements near the camera while distant settlements stay aggregated.
 * Agents are a visual expansion of the authoritative aggregate state — they
 * use their own cosmetic RNG and never write back into SimState.
 */
import { BALANCE } from '../config/balance';
import { RNG } from '../core/rng';
import { Terrain, type Settlement, type SimState } from '../core/types';
import { inBounds, terrainAt } from '../world/world';
import { civsAtWarWith } from './diplomacy';

export type AgentState =
  | 'idle'
  | 'walking'
  | 'gathering'
  | 'building'
  | 'farming'
  | 'trading'
  | 'fleeing'
  | 'resting'
  | 'fighting';

export interface Agent {
  id: number;
  civId: number;
  settlementId: number;
  /** World-pixel position. */
  x: number;
  y: number;
  tx: number;
  ty: number;
  state: AgentState;
  /** Activity adopted once the walk target is reached. */
  pendingState: AgentState;
  /** Seconds remaining in the current activity. */
  timer: number;
  /** Animation phase offset. */
  phase: number;
  speed: number;
  /** Remaining waypoints (world px) when following a road. */
  route?: { x: number; y: number }[];
}

export interface ViewBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const ts = BALANCE.map.tileSize;

export class AgentSystem {
  agents: Agent[] = [];
  private nextId = 1;
  private rng = new RNG(0xa9e47);

  /** Materialize/remove agents for settlements inside the (tile-space) view. */
  sync(state: SimState, view: ViewBounds | null): void {
    if (!view) {
      this.agents = [];
      return;
    }
    const cfg = BALANCE.agents;
    const margin = cfg.viewMargin;
    const visible = state.settlements.filter(
      (s) =>
        s.x >= view.x0 - margin &&
        s.x <= view.x1 + margin &&
        s.y >= view.y0 - margin &&
        s.y <= view.y1 + margin,
    );
    const visibleIds = new Set(visible.map((s) => s.id));
    this.agents = this.agents.filter((a) => visibleIds.has(a.settlementId));

    const cx = (view.x0 + view.x1) / 2;
    const cy = (view.y0 + view.y1) / 2;
    visible.sort(
      (a, b) => (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2),
    );

    const counts = new Map<number, number>();
    for (const a of this.agents) {
      counts.set(a.settlementId, (counts.get(a.settlementId) ?? 0) + 1);
    }
    let total = this.agents.length;
    for (const s of visible) {
      const want = Math.min(
        cfg.perSettlementCap,
        Math.ceil(s.population * cfg.populationFraction),
      );
      let have = counts.get(s.id) ?? 0;
      while (have < want && total < cfg.maxAgents) {
        this.agents.push(this.spawn(s));
        have++;
        total++;
      }
      if (have > want) {
        let excess = have - want;
        this.agents = this.agents.filter((a) => {
          if (excess > 0 && a.settlementId === s.id) {
            excess--;
            total--;
            return false;
          }
          return true;
        });
      }
    }
  }

  private spawn(s: Settlement): Agent {
    const px = (s.x + 0.5) * ts;
    const py = (s.y + 0.5) * ts;
    return {
      id: this.nextId++,
      civId: s.civId,
      settlementId: s.id,
      x: px + this.rng.range(-ts, ts),
      y: py + this.rng.range(-ts, ts),
      tx: px,
      ty: py,
      state: 'idle',
      pendingState: 'idle',
      timer: this.rng.range(0, 2),
      phase: this.rng.range(0, Math.PI * 2),
      speed: BALANCE.agents.walkSpeed * this.rng.range(0.8, 1.2),
    };
  }

  /** Advance agents by dt seconds. `darkness` 0..1 drives the rest cycle. */
  update(dt: number, state: SimState, darkness: number): void {
    if (dt <= 0) return;
    for (const a of this.agents) {
      a.phase += dt * 6;
      if (a.state === 'walking' || a.state === 'fleeing' || a.state === 'trading') {
        const dx = a.tx - a.x;
        const dy = a.ty - a.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const speed = a.state === 'fleeing' ? a.speed * 1.8 : a.speed;
        if (d < speed * dt + 0.5) {
          if (a.route && a.route.length > 0) {
            const next = a.route.shift()!;
            a.tx = next.x;
            a.ty = next.y;
          } else {
            a.x = a.tx;
            a.y = a.ty;
            a.route = undefined;
            a.state = a.pendingState;
            a.timer = this.rng.range(
              BALANCE.agents.workDurationMin,
              BALANCE.agents.workDurationMax,
            );
          }
        } else {
          a.x += (dx / d) * speed * dt;
          a.y += (dy / d) * speed * dt;
        }
      } else {
        if (a.state === 'fighting') {
          a.x += Math.sin(a.phase * 2.5) * dt * 5;
        }
        a.timer -= dt;
        if (a.timer <= 0) this.chooseTask(a, state, darkness);
      }
    }
  }

  private chooseTask(a: Agent, state: SimState, darkness: number): void {
    const cfg = BALANCE.agents;
    const s = state.settlements.find((x) => x.id === a.settlementId);
    if (!s) {
      a.state = 'idle';
      a.timer = 5;
      return;
    }
    const hx = (s.x + 0.5) * ts;
    const hy = (s.y + 0.5) * ts;

    // Danger: plague or a recent raid sends people scattering.
    const danger = s.plagueDays > 0 || state.day - s.lastRaidDay < cfg.raidFearDays;
    if (danger && this.rng.chance(0.3)) {
      const ang = this.rng.range(0, Math.PI * 2);
      this.walkTo(
        a,
        hx + Math.cos(ang) * cfg.fleeDistance * ts,
        hy + Math.sin(ang) * cfg.fleeDistance * ts,
        'fleeing',
        state,
      );
      a.state = 'fleeing';
      return;
    }

    // Night: head home and rest by the fires.
    if (darkness > 0.55) {
      this.walkTo(a, hx + this.rng.range(-ts, ts), hy + this.rng.range(-ts, ts), 'resting', state);
      return;
    }

    // War: some citizens take up arms at the frontier.
    const wars = civsAtWarWith(state, a.civId);
    if (wars.length > 0 && this.rng.chance(0.15)) {
      const enemy = this.nearestSettlement(state, wars, s.x, s.y, cfg.fightRange);
      if (enemy) {
        const mx = ((s.x + enemy.x) / 2 + 0.5) * ts;
        const my = ((s.y + enemy.y) / 2 + 0.5) * ts;
        this.walkTo(a, mx + this.rng.range(-ts * 2, ts * 2), my + this.rng.range(-ts * 2, ts * 2), 'fighting', state);
        return;
      }
    }

    // Construction pulse after an upgrade.
    if (state.day - s.lastUpgradeDay < cfg.buildPulseDays && this.rng.chance(0.3)) {
      this.walkTo(a, hx + this.rng.range(-ts * 1.5, ts * 1.5), hy + this.rng.range(-ts * 1.5, ts * 1.5), 'building', state);
      return;
    }

    // Caravans: follow a road out of town when one exists — kin towns at home,
    // partner cities abroad. Without a road, amble toward a trade partner.
    if (this.rng.chance(0.1)) {
      const touching = state.roadPaths.filter((p) => p.a === s.id || p.b === s.id);
      if (touching.length > 0) {
        const pick = touching[this.rng.int(0, touching.length - 1)];
        const tiles = pick.a === s.id ? pick.tiles : [...pick.tiles].reverse();
        const W = state.world.width;
        const route: { x: number; y: number }[] = [];
        for (let i = 1; i < tiles.length; i += 2) {
          route.push({ x: ((tiles[i] % W) + 0.5) * ts, y: (((tiles[i] / W) | 0) + 0.5) * ts });
        }
        const last = tiles[tiles.length - 1];
        route.push({ x: ((last % W) + 0.5) * ts, y: (((last / W) | 0) + 0.5) * ts });
        const first = route.shift()!;
        a.route = route;
        a.tx = first.x;
        a.ty = first.y;
        a.pendingState = 'trading';
        a.state = 'trading';
        return;
      }
      const partners = this.tradePartners(state, a.civId);
      const partner =
        partners.length > 0
          ? this.nearestSettlement(state, partners, s.x, s.y, cfg.tradeRange)
          : null;
      if (partner && partner.id !== s.id) {
        const f = this.rng.range(0.3, 0.7);
        a.tx = (s.x + (partner.x - s.x) * f + 0.5) * ts;
        a.ty = (s.y + (partner.y - s.y) * f + 0.5) * ts;
        a.pendingState = 'trading';
        a.state = 'trading';
        return;
      }
    }

    // Otherwise: work the land.
    const radius = BALANCE.resources.gatherRadius;
    for (let attempt = 0; attempt < 6; attempt++) {
      const dx = this.rng.int(-radius, radius);
      const dy = this.rng.int(-radius, radius);
      const x = s.x + dx;
      const y = s.y + dy;
      if (!inBounds(state.world, x, y)) continue;
      const terr = terrainAt(state.world, x, y);
      let job: AgentState | null = null;
      if (terr === Terrain.Grassland || terr === Terrain.Coast || terr === Terrain.Desert) {
        job = 'farming';
      } else if (terr === Terrain.Forest || terr === Terrain.Swamp || terr === Terrain.Tundra) {
        job = 'gathering';
      }
      if (job) {
        this.walkTo(
          a,
          (x + 0.5) * ts + this.rng.range(-3, 3),
          (y + 0.5) * ts + this.rng.range(-3, 3),
          job,
          state,
        );
        return;
      }
    }
    a.state = 'idle';
    a.timer = this.rng.range(2, 5);
  }

  private walkTo(a: Agent, tx: number, ty: number, then: AgentState, state: SimState): void {
    const w = state.world;
    tx = Math.min((w.width - 0.5) * ts, Math.max(0.5 * ts, tx));
    ty = Math.min((w.height - 0.5) * ts, Math.max(0.5 * ts, ty));
    a.route = undefined;
    a.tx = tx;
    a.ty = ty;
    a.pendingState = then;
    if (a.state !== 'fleeing') a.state = 'walking';
  }

  private tradePartners(state: SimState, civId: number): number[] {
    const out: number[] = [];
    for (const other of state.civs) {
      if (other.id === civId || !other.alive) continue;
      const st = state.relations[civId][other.id]?.state;
      if (st === 'trade' || st === 'alliance') out.push(other.id);
    }
    return out;
  }

  private nearestSettlement(
    state: SimState,
    civIds: number[],
    x: number,
    y: number,
    maxDist: number,
  ): Settlement | null {
    let best: Settlement | null = null;
    let bestD2 = maxDist * maxDist;
    for (const s of state.settlements) {
      if (!civIds.includes(s.civId)) continue;
      const d2 = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = s;
      }
    }
    return best;
  }

  /** Find an agent near a world-pixel position (for click inspection). */
  findNear(px: number, py: number, radius: number): Agent | null {
    let best: Agent | null = null;
    let bestD2 = radius * radius;
    for (const a of this.agents) {
      const d2 = (a.x - px) ** 2 + (a.y - py) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = a;
      }
    }
    return best;
  }
}
