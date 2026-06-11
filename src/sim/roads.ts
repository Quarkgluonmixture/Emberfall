/**
 * Roads: a derived overlay traced along trade routes. Within each civ a
 * spanning tree links its settlements; trading civs link their closest pair.
 * Paths come from A* over terrain costs, with a discount for tiles that are
 * already road — so later routes merge into trunk roads instead of braiding.
 * Pure function of SimState (no RNG): rebuilt on a cadence, never saved.
 */
import { BALANCE } from '../config/balance';
import { Terrain, type Settlement, type SimState } from '../core/types';

/** Step cost per tile; Infinity is impassable for roads. */
const ROAD_COST: Record<Terrain, number> = {
  [Terrain.Ocean]: Infinity,
  [Terrain.Coast]: 1.15,
  [Terrain.Grassland]: 1,
  [Terrain.Forest]: 1.8,
  [Terrain.Mountain]: 30, // a pass, if there is no other way
  [Terrain.River]: 6, // a ford or a timber bridge
  [Terrain.Swamp]: 3,
  [Terrain.Desert]: 1.3,
  [Terrain.Tundra]: 1.5,
};

/** Tiles already carrying a road are this much cheaper to walk. */
const ROAD_DISCOUNT = 0.5;

interface Edge {
  a: Settlement;
  b: Settlement;
}

/** Minimal binary heap keyed on f-score. */
class Heap {
  private items: number[] = []; // pairs: [f, node, f, node, ...]
  get size(): number {
    return this.items.length / 2;
  }
  push(f: number, node: number): void {
    const it = this.items;
    it.push(f, node);
    let i = it.length / 2 - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (it[p * 2] <= it[i * 2]) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): number {
    const it = this.items;
    const top = it[1];
    const lastF = it.pop()!;
    const lastN = it.pop()!;
    if (it.length > 0) {
      it[0] = lastN;
      it[1] = lastF;
      // re-fix order: we store [f,node] pairs; keep slot layout consistent
      it[0] = lastF;
      it[1] = lastN;
      let i = 0;
      const n = it.length / 2;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < n && it[l * 2] < it[m * 2]) m = l;
        if (r < n && it[r * 2] < it[m * 2]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(i: number, j: number): void {
    const it = this.items;
    const f = it[i * 2];
    const v = it[i * 2 + 1];
    it[i * 2] = it[j * 2];
    it[i * 2 + 1] = it[j * 2 + 1];
    it[j * 2] = f;
    it[j * 2 + 1] = v;
  }
}

const SQRT2 = Math.SQRT2;

/**
 * A* over the world grid restricted to the endpoints' bounding box (+margin).
 * Returns tile indexes from start to goal, or null when unreachable.
 */
export function findRoadPath(
  state: SimState,
  road: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number[] | null {
  const w = state.world;
  const W = w.width;
  const margin = BALANCE.roads.searchMargin;
  const bx0 = Math.max(0, Math.min(x0, x1) - margin);
  const by0 = Math.max(0, Math.min(y0, y1) - margin);
  const bx1 = Math.min(W - 1, Math.max(x0, x1) + margin);
  const by1 = Math.min(w.height - 1, Math.max(y0, y1) + margin);

  const start = y0 * W + x0;
  const goal = y1 * W + x1;
  const g = new Map<number, number>();
  const came = new Map<number, number>();
  const open = new Heap();
  // Cheapest possible step is a discounted road tile → keep heuristic admissible.
  const h = (x: number, y: number): number => {
    const dx = Math.abs(x - x1);
    const dy = Math.abs(y - y1);
    return (Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy)) * ROAD_DISCOUNT;
  };
  g.set(start, 0);
  open.push(h(x0, y0), start);

  const stepCost = (i: number): number => {
    const c = ROAD_COST[w.terrain[i] as Terrain];
    return road[i] > 0 ? c * ROAD_DISCOUNT : c;
  };

  while (open.size > 0) {
    const cur = open.pop();
    if (cur === goal) {
      const path = [cur];
      let n = cur;
      while (came.has(n)) {
        n = came.get(n)!;
        path.push(n);
      }
      return path.reverse();
    }
    const cx = cur % W;
    const cy = (cur / W) | 0;
    const gc = g.get(cur)!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < bx0 || nx > bx1 || ny < by0 || ny > by1) continue;
        const ni = ny * W + nx;
        const sc = stepCost(ni);
        if (!isFinite(sc)) continue;
        const ng = gc + sc * (dx !== 0 && dy !== 0 ? SQRT2 : 1);
        if (ng >= (g.get(ni) ?? Infinity)) continue;
        g.set(ni, ng);
        came.set(ni, cur);
        open.push(ng + h(nx, ny), ni);
      }
    }
  }
  return null;
}

/** Deterministic edge list: per-civ spanning trees + trade links between civs. */
function roadEdges(state: SimState): Edge[] {
  const cfg = BALANCE.roads;
  const edges: Edge[] = [];
  const byCiv = new Map<number, Settlement[]>();
  for (const s of state.settlements) {
    if (!state.civs[s.civId]?.alive) continue;
    let list = byCiv.get(s.civId);
    if (!list) byCiv.set(s.civId, (list = []));
    list.push(s);
  }

  // In-civ spanning tree: greedily connect the nearest unconnected settlement.
  for (const [, list] of [...byCiv.entries()].sort((a, b) => a[0] - b[0])) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.id - b.id);
    const connected = [list[0]];
    const rest = list.slice(1);
    while (rest.length > 0) {
      let bi = 0;
      let bc: Settlement = connected[0];
      let bd = Infinity;
      for (let i = 0; i < rest.length; i++) {
        for (const c of connected) {
          const d = (rest[i].x - c.x) ** 2 + (rest[i].y - c.y) ** 2;
          if (d < bd) {
            bd = d;
            bi = i;
            bc = c;
          }
        }
      }
      const next = rest.splice(bi, 1)[0];
      if (bd <= cfg.maxCivEdge ** 2) edges.push({ a: bc, b: next });
      connected.push(next);
    }
  }

  // Trade and alliance partners: link the closest settlement pair.
  for (let i = 0; i < state.civs.length; i++) {
    for (let j = i + 1; j < state.civs.length; j++) {
      if (!state.civs[i].alive || !state.civs[j].alive) continue;
      const st = state.relations[i]?.[j]?.state;
      if (st !== 'trade' && st !== 'alliance') continue;
      const la = byCiv.get(i) ?? [];
      const lb = byCiv.get(j) ?? [];
      let ba: Settlement | null = null;
      let bb: Settlement | null = null;
      let bd = cfg.maxTradeEdge ** 2;
      for (const a of la) {
        for (const b of lb) {
          const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (d < bd) {
            bd = d;
            ba = a;
            bb = b;
          }
        }
      }
      if (ba && bb) edges.push({ a: ba, b: bb });
    }
  }
  return edges;
}

/** Rebuild `state.roads` / `state.roadPaths`; bumps roadsVersion on change. */
export function recomputeRoads(state: SimState): void {
  const w = state.world;
  const road = new Uint8Array(w.width * w.height);
  const paths: { a: number; b: number; tiles: number[] }[] = [];

  for (const e of roadEdges(state)) {
    const path = findRoadPath(state, road, e.a.x, e.a.y, e.b.x, e.b.y);
    if (!path) continue;
    paths.push({ a: e.a.id, b: e.b.id, tiles: path });
    for (const i of path) {
      if (road[i] < 3) road[i]++;
    }
  }

  // Only bump the version (and re-bake renderers) when something changed.
  const prev = state.roads;
  let changed = prev.length !== road.length;
  if (!changed) {
    for (let i = 0; i < road.length; i++) {
      if (prev[i] !== road[i]) {
        changed = true;
        break;
      }
    }
  }
  state.roadPaths = paths;
  if (changed) {
    state.roads = road;
    state.roadsVersion++;
  }
}
