/**
 * Procedural settlement cluster layouts: turns (settlement id, tier,
 * population bucket) into a deterministic arrangement of building pieces
 * (public/assets/pieces/, batch 9). Pure cosmetic layer — seeded by hash2,
 * never touches the simulation RNG; same inputs always give the same village.
 *
 * Layouts only change when the population bucket or tier changes, so clusters
 * are stable frame-to-frame and cheap to rebuild.
 */
import { hash2 } from '../core/rng';
import { Terrain } from '../core/types';

export interface PiecePlacement {
  kind: string;
  /** World-px offset from the settlement center. */
  dx: number;
  dy: number;
  /** Target world-px width. */
  w: number;
  /** Optional target world-px height; when set the sprite scales Y
      independently of width (continuous N-S wall strips span the side). */
  h?: number;
  flip: boolean;
  /** Sprite rotation in radians (vertical wall runs use ±90°). */
  rot?: number;
  /** Draw priority above the dy painter sort (e.g. corner towers = 1 so wall
      ends tuck behind them). Default 0. */
  layer?: number;
  /** Building with windows: gets a warm additive lift copy at night. */
  lift: boolean;
  /** Hosts a small window/lamp glow above the night overlay. */
  lamp: boolean;
}

/** Terrain veto: world-px offset from the settlement center → can build? */
export type Buildable = (dx: number, dy: number) => boolean;

/** World-px footprint width per piece kind (tile = 8 world px). */
const PIECE_W: Record<string, number> = {
  tent_0: 5.5,
  tent_1: 5.5,
  hut_0: 6,
  hut_1: 6,
  hut_2: 6,
  house_0: 7,
  house_1: 7,
  house_2: 7,
  granary: 6,
  shed: 6,
  crates: 3.5,
  shrine: 4.5,
  well: 4,
  stall_0: 5,
  stall_1: 5,
  hall: 12,
  wall_straight: 7,
  wall_tower: 6,
  wall_gate: 8.5,
  /** Dedicated N-S wall art (batch 11) — preferred for side runs when present. */
  wall_vertical: 5,
  palisade_straight: 7,
  palisade_corner: 5.5,
  palisade_vertical: 5,
  lamp: 2.2,
  scaffold: 5,
  campfire: 4,
  ruin_0: 6,
  ruin_1: 6.5,
  ruin_2: 6,
  // Batch 18-20.
  church: 13,
  chapel: 8,
  churchyard: 7,
  graves: 5,
  yard_fence: 4.5,
  yard_garden: 5.5,
  yard_pen: 6,
  yard_wood: 4.5,
  yard_shed: 5.5,
  yard_hay: 6,
  mill: 10,
  jetty: 7,
  millpond: 7,
  // Batch 22: keep is the dominant landmark (taller + wider than the hall).
  keep: 13,
  barracks: 11,
  stable: 8.5,
};

export type HavePiece = (kind: string) => boolean;

/** Global footprint multiplier — buildings sized for readable close-ups. */
const CLUSTER_SCALE = 1.12;

/** World-px width of a piece kind, cluster scale applied. */
function pw(kind: string): number {
  return (PIECE_W[kind] ?? 6) * CLUSTER_SCALE;
}

/** First available kind from a fallback chain, or null. */
function pick(have: HavePiece, ...kinds: string[]): string | null {
  for (const k of kinds) if (have(k)) return k;
  return null;
}

/** Population buckets keep layouts stable while villages grow. */
export function popBucket(population: number): number {
  return Math.floor(population / 35);
}

export function clusterKey(tier: number, population: number): string {
  return `${tier}:${popBucket(population)}`;
}

function collides(placed: PiecePlacement[], dx: number, dy: number, w: number): boolean {
  for (const p of placed) {
    // Slightly elliptical metric: pieces overlap more readily vertically
    // because the 3/4-view sprites are taller than their footprint.
    const ddx = p.dx - dx;
    const ddy = (p.dy - dy) * 1.45;
    const minD = (p.w + w) * 0.5 * 0.92;
    if (ddx * ddx + ddy * ddy < minD * minD) return true;
  }
  return false;
}

const GOLDEN = 2.399963;

/** Place a piece on a jittered golden-angle spiral, skipping collisions. */
function placeSpiral(
  out: PiecePlacement[],
  seed: number,
  slot: number,
  kind: string,
  startR: number,
  opts: { lift?: boolean; lamp?: boolean } = {},
  buildable?: Buildable,
): boolean {
  const w = pw(kind);
  const a0 = hash2(seed, slot, 11) * Math.PI * 2;
  // Hard radius cap: when terrain vetoes everything nearby (rivers, coast),
  // give the piece up rather than exiling it tiles away — a runaway radius
  // blows the wall rectangle up to district size.
  const maxR = startR + 16;
  for (let k = 0; k < 70; k++) {
    const ang = a0 + k * GOLDEN;
    const r = startR + k * 0.5 + hash2(seed, slot, 13 + (k % 5)) * 1.6;
    if (r > maxR) break;
    const dx = Math.cos(ang) * r;
    const dy = Math.sin(ang) * r * 0.72; // squash: settlements read as ovals
    if (buildable && !buildable(dx, dy)) continue;
    if (collides(out, dx, dy, w)) continue;
    out.push({
      kind,
      dx,
      dy,
      w,
      flip: hash2(seed, slot, 17) < 0.5,
      lift: opts.lift ?? false,
      lamp: opts.lamp ?? false,
    });
    return true;
  }
  return false;
}

/**
 * Site a watermill on the nearest river bank, with a jetty and millpond
 * reaching toward the water. Pure terrain read — only fires for a settlement
 * actually beside a river (the river often runs right up to the centre, so the
 * bank can be near the core). Ray-march out from centre along many headings;
 * for each, the last dry, un-clobbered tile BEFORE the water is a bank
 * candidate, and the closest such bank wins. Returns whether a mill was placed.
 */
function placeMill(
  out: PiecePlacement[],
  seed: number,
  have: HavePiece,
  buildable: Buildable | undefined,
  riverAt: Buildable | undefined,
  maxR: number,
): boolean {
  const mill = pick(have, 'mill');
  if (!mill || !riverAt) return false;
  const ok = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);
  const a0 = hash2(seed, 77, 1) * Math.PI * 2;
  let best: { dx: number; dy: number; ux: number; uy: number; waterR: number } | null = null;
  for (let a = 0; a < 28; a++) {
    const ang = a0 + a * GOLDEN;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * 0.72;
    // Closest-to-water dry tile that isn't already clobbered by a building —
    // when the river hugs the core, the very edge tile may overlap the centre
    // piece, so fall back to a slightly inner free tile rather than skip the ray.
    let lastFree: { dx: number; dy: number } | null = null;
    for (let r = 4; r <= maxR; r += 2) {
      const dx = ux * r;
      const dy = uy * r;
      if (riverAt(dx, dy)) {
        if (lastFree && (!best || r < best.waterR)) {
          best = { dx: lastFree.dx, dy: lastFree.dy, ux, uy, waterR: r };
        }
        break;
      }
      if (!ok(dx, dy)) {
        lastFree = null; // ocean: can't reach the water along this heading
        continue;
      }
      if (!collides(out, dx, dy, pw(mill))) lastFree = { dx, dy };
    }
  }
  if (!best) return false;
  put(out, mill, best.dx, best.dy, { lift: true, lamp: true });
  const jetty = pick(have, 'jetty');
  if (jetty) put(out, jetty, best.dx + best.ux * 4.5, best.dy + best.uy * 4.5);
  const pond = pick(have, 'millpond');
  if (pond) put(out, pond, best.dx + best.ux * 7, best.dy + best.uy * 7, { layer: -1 });
  return true;
}

function put(
  out: PiecePlacement[],
  kind: string,
  dx: number,
  dy: number,
  opts: {
    lift?: boolean;
    lamp?: boolean;
    flip?: boolean;
    w?: number;
    h?: number;
    rot?: number;
    layer?: number;
  } = {},
): void {
  out.push({
    kind,
    dx,
    dy,
    w: opts.w ?? pw(kind),
    h: opts.h,
    flip: opts.flip ?? false,
    rot: opts.rot,
    layer: opts.layer,
    lift: opts.lift ?? false,
    lamp: opts.lamp ?? false,
  });
}

/** A gate/postern in the wall: world-px centre + outward unit normal. */
interface Gate {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

/** Wall ring extents: world-px coords of the four faces (left/top/right/bottom). */
interface WallBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Irregular defensive hull around a town. Unlike a centred rectangle, the ring
 * is fit to the ACTUAL built form (an asymmetric box — the church spire pushes
 * the north face out further than the south), and gates open where roads truly
 * cross the perimeter: a grand gatehouse on the south face (the only
 * orientation the front-on art reads), and posterns (gaps bracketed by towers)
 * where roads cross the other three faces. Continuous horizontal/vertical art
 * as before; any segment over open sea is skipped.
 */
function wallHull(
  out: PiecePlacement[],
  seed: number,
  box: WallBox,
  have: HavePiece,
  buildable?: Buildable,
  /** Predicate: is the tile at this world-px offset a road? Drives gates. */
  roadAt?: Buildable,
): Gate[] {
  const stone = hash2(seed, 900, 1) < 0.6;
  const straight = pick(have, stone ? 'wall_straight' : 'palisade_straight', 'palisade_straight', 'wall_straight');
  if (!straight) return [];
  const corner = pick(have, stone ? 'wall_tower' : 'palisade_corner', 'palisade_corner', 'wall_tower');
  const gate = stone ? pick(have, 'wall_gate') : null;
  const w = pw(straight);
  const ok = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);

  const { x0, y0, x1, y1 } = box;
  const cornerHalf = corner ? pw(corner) * 0.45 : 0;
  const tuck = cornerHalf * 0.3;
  const gateHalf = gate ? pw(gate) * 0.55 : 3.6;

  // Gate detection: sample along a face, probing just OUTSIDE it for a road
  // tile; merge adjacent hits into one crossing, kept clear of the corners.
  const findGates = (axis: 'h' | 'v', lo: number, hi: number, fixed: number, sign: number): number[] => {
    if (!roadAt || hi - lo < gateHalf * 2) return [];
    const steps = Math.max(6, Math.round((hi - lo) / 2));
    const hits: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = lo + ((hi - lo) * i) / steps;
      const road =
        axis === 'h'
          ? roadAt(p, fixed + sign * 4) || roadAt(p, fixed + sign * 9)
          : roadAt(fixed + sign * 4, p) || roadAt(fixed + sign * 9, p);
      if (road) hits.push(p);
    }
    const gates: number[] = [];
    for (let i = 0; i < hits.length; ) {
      let j = i;
      while (j + 1 < hits.length && hits[j + 1] - hits[j] < gateHalf * 1.5) j++;
      const mid = (hits[i] + hits[j]) / 2;
      if (mid > lo + cornerHalf && mid < hi - cornerHalf) gates.push(mid);
      i = j + 1;
    }
    return gates;
  };

  const innerX0 = x0 + tuck;
  const innerX1 = x1 - tuck;
  const innerY0 = y0 + cornerHalf + 1;
  const innerY1 = y1 - cornerHalf - 1;

  // South (bottom) face carries the main gatehouse — at the road crossing if
  // one exists, else centred. The other three faces get road posterns only.
  const southGates = findGates('h', innerX0, innerX1, y1, 1);
  const mainGate = southGates.length ? southGates : [(x0 + x1) / 2];
  const posternTop = findGates('h', innerX0, innerX1, y0, -1);
  const posternLeft = findGates('v', innerY0, innerY1, x0, -1);
  const posternRight = findGates('v', innerY0, innerY1, x1, 1);

  const nearGate = (gates: number[], p: number, half: number): boolean =>
    gates.some((g) => Math.abs(g - p) < half);

  // Horizontal runs (north y0, south y1), overlapped for continuity; runs reach
  // almost to the corners (small tuck) and corner towers draw on top so the
  // four sides read as one joined ring. Gaps left for gates/posterns.
  const countX = Math.max(2, Math.round((innerX1 - innerX0) / (w * 0.82)));
  for (let i = 0; i <= countX; i++) {
    const dx = innerX0 + ((innerX1 - innerX0) * i) / countX;
    if (!nearGate(posternTop, dx, gateHalf) && ok(dx, y0)) put(out, straight, dx, y0);
    if (!nearGate(mainGate, dx, gateHalf) && ok(dx, y1)) put(out, straight, dx, y1);
  }
  for (const gx of mainGate) if (gate && ok(gx, y1)) put(out, gate, gx, y1);

  // Vertical runs (west x0, east x1). The dedicated N-S art renders as
  // overlapping bottom-anchored CELLS down each side (front cell occludes the
  // one behind → coursed 3/4 depth, same thickness as the horizontal run);
  // without it, a chain of omnidirectional towers / log clumps. Gaps for
  // E/W posterns.
  const vert = pick(have, stone ? 'wall_vertical' : 'palisade_vertical');
  if (vert) {
    const sideW = w * 0.5;
    const stepY = sideW * 1.05;
    const countY = Math.max(1, Math.round((innerY1 - innerY0) / stepY));
    for (let i = 0; i <= countY; i++) {
      const dy = innerY0 + ((innerY1 - innerY0) * i) / countY;
      if (!nearGate(posternLeft, dy, gateHalf) && ok(x0, dy)) put(out, vert, x0, dy, { w: sideW });
      if (!nearGate(posternRight, dy, gateHalf) && ok(x1, dy)) put(out, vert, x1, dy, { w: sideW, flip: true });
    }
  } else {
    const sideKind = stone ? (corner ?? straight) : straight;
    const stepY = stone ? pw(sideKind) * 1.45 : w * 0.55;
    const countY = Math.max(1, Math.round((innerY1 - innerY0) / stepY));
    for (let i = 0; i <= countY; i++) {
      const dy = innerY0 + ((innerY1 - innerY0) * i) / countY;
      if (!nearGate(posternLeft, dy, gateHalf) && ok(x0, dy)) put(out, sideKind, x0, dy);
      if (!nearGate(posternRight, dy, gateHalf) && ok(x1, dy)) put(out, sideKind, x1, dy, { flip: true });
    }
  }

  // Corner towers/posts mask the run joints (drawn on top, layer 1). Posterns
  // are bracketed by a pair of towers so each side gate reads as defended.
  // Flanking towers are clamped inside the corners and de-duplicated against
  // already-placed towers so short faces don't pile towers on top of each other.
  if (corner) {
    const cd = cornerHalf * 1.3;
    const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
    const towers: [number, number][] = [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ];
    for (const gx of posternTop) towers.push([clamp(gx - gateHalf, x0, x1), y0], [clamp(gx + gateHalf, x0, x1), y0]);
    for (const gy of posternLeft) towers.push([x0, clamp(gy - gateHalf, y0, y1)], [x0, clamp(gy + gateHalf, y0, y1)]);
    for (const gy of posternRight) towers.push([x1, clamp(gy - gateHalf, y0, y1)], [x1, clamp(gy + gateHalf, y0, y1)]);
    const placedTowers: [number, number][] = [];
    for (const [cx, cy] of towers) {
      if (placedTowers.some(([px, py]) => Math.abs(px - cx) < cd && Math.abs(py - cy) < cd)) continue;
      if (!ok(cx, cy)) continue;
      placedTowers.push([cx, cy]);
      put(out, corner, cx, cy, { layer: 1 });
    }
  }

  // Report the gates (centre + outward normal) so the caller can grow suburbs.
  const gates: Gate[] = [];
  for (const gx of mainGate) gates.push({ x: gx, y: y1, nx: 0, ny: 1 });
  for (const gx of posternTop) gates.push({ x: gx, y: y0, nx: 0, ny: -1 });
  for (const gy of posternLeft) gates.push({ x: x0, y: gy, nx: -1, ny: 0 });
  for (const gy of posternRight) gates.push({ x: x1, y: gy, nx: 1, ny: 0 });
  return gates;
}

/**
 * Grow sparse extramural suburbs outward from a town's gates — a few poorer
 * dwellings with a garden/paddock clinging to each approach road, so a walled
 * town doesn't stop cleanly at the wall. Bounded (|dx|,|dy| ≤ maxAbs) so the
 * footprint stays compact and the ring isn't re-enclosed.
 */
function placeSuburbs(
  out: PiecePlacement[],
  seed: number,
  have: HavePiece,
  buildable: Buildable | undefined,
  gates: Gate[],
  maxAbs: number,
): void {
  const ok = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);
  let gi = 0;
  for (const g of gates) {
    gi++;
    if (hash2(seed, 300 + gi, 0) < 0.25) continue; // not every gate sprawls
    const tx = -g.ny; // tangent along the wall face
    const ty = g.nx;
    // A ragged line of 2-4 dwellings accreting outward along the approach road.
    const n = 2 + Math.floor(hash2(seed, 300 + gi, 1) * 3);
    let dist = 4;
    for (let k = 0; k < n; k++) {
      const kind = pick(
        have,
        hash2(seed, 300 + gi, 2 + k) < 0.6 ? 'hut_0' : 'shed',
        'hut_0',
        'hut_1',
        'hut_2',
        'shed',
        'house_0',
      );
      if (!kind) break;
      const half = pw(kind) * 0.5;
      dist += half;
      const lat = (hash2(seed, 300 + gi, 10 + k) - 0.5) * 6;
      const dx = g.x + g.nx * dist + tx * lat;
      const dy = g.y + g.ny * dist + ty * lat;
      dist += half + 2;
      if (Math.abs(dx) > maxAbs || Math.abs(dy) > maxAbs) break;
      if (!ok(dx, dy) || collides(out, dx, dy, pw(kind))) continue;
      put(out, kind, dx, dy, { lift: true });
      if (hash2(seed, 300 + gi, 20 + k) < 0.6) {
        const yk = pick(have, 'yard_garden', 'yard_pen', 'yard_fence', 'yard_wood');
        if (yk) {
          const ydx = dx + tx * (half + 2.5);
          const ydy = dy + ty * (half + 2.5);
          if (
            Math.abs(ydx) <= maxAbs &&
            Math.abs(ydy) <= maxAbs &&
            ok(ydx, ydy) &&
            !collides(out, ydx, ydy, pw(yk))
          ) {
            put(out, yk, ydx, ydy, {});
          }
        }
      }
    }
  }
}

/** Terrain-derived identity that biases a settlement's civic mix + rear yards. */
export type SettlementRole = 'market' | 'abbey' | 'fort' | 'forest';

/** Rear-yard palette per role (cloister gardens vs austere stores vs woodpiles). */
const ROLE_YARDS: Record<SettlementRole, string[]> = {
  market: ['yard_pen', 'yard_wood', 'yard_garden', 'yard_hay', 'yard_fence', 'yard_shed'],
  abbey: ['yard_garden', 'yard_garden', 'yard_hay', 'yard_fence', 'yard_wood'],
  fort: ['yard_wood', 'yard_hay', 'yard_shed', 'yard_pen'],
  forest: ['yard_wood', 'yard_wood', 'yard_pen', 'yard_hay'],
};

/** Sample world-px offset → Terrain (out-of-bounds reads as Ocean). */
export type TerrainProbe = (dx: number, dy: number) => Terrain;

/**
 * A settlement's dominant identity, derived purely from static terrain + a
 * seed hash (cosmetic — never the sim stream). Mountains breed forts, deep
 * woods breed forest hamlets, and the rest split between abbey/market by hash.
 * Riverside mills are orthogonal (placed by `placeMill` from `riverAt`).
 */
function deriveRole(
  seed: number,
  tier: number,
  terrainAt?: TerrainProbe,
): SettlementRole {
  let mountain = 0;
  let forest = 0;
  if (terrainAt) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang) * 0.72;
      for (const r of [14, 22, 30]) {
        const t = terrainAt(ux * r, uy * r);
        if (t === Terrain.Mountain) mountain++;
        else if (t === Terrain.Forest) forest++;
      }
    }
  }
  const h = hash2(seed, 88, 1);
  if (mountain >= 4 || h < 0.12) return 'fort';
  if (tier === 1 && forest >= 7) return 'forest';
  if (h < 0.3) return 'abbey';
  return 'market';
}

/** Public role lookup (same seed + derivation as the cluster) so the macro LOD
    layer can show a glyph that matches the settlement's built role. */
export function settlementRole(id: number, tier: number, terrainAt?: TerrainProbe): SettlementRole {
  const seed = 0x5e771e ^ Math.imul(id + 1, 2654435761);
  return deriveRole(seed, tier, terrainAt);
}

/**
 * Direction (radians) toward nearby commanding terrain — heights (mountains)
 * first, else a coast/water approach — or null on open flat land. A castle
 * keep is sited toward this so it reads as overlooking the ground it controls.
 * Pure static-terrain read.
 */
function commandingDir(terrainAt?: TerrainProbe): number | null {
  if (!terrainAt) return null;
  let mx = 0;
  let my = 0;
  let mn = 0;
  let wx = 0;
  let wy = 0;
  let wn = 0;
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * 0.72;
    for (const r of [16, 24, 32]) {
      const t = terrainAt(ux * r, uy * r);
      if (t === Terrain.Mountain) {
        mx += ux;
        my += uy;
        mn++;
      } else if (t === Terrain.Ocean || t === Terrain.Coast) {
        wx += ux;
        wy += uy;
        wn++;
      }
    }
  }
  if (mn >= 2) return Math.atan2(my, mx); // commands the heights
  if (wn >= 4) return Math.atan2(wy, wx); // commands a coast/approach
  return null;
}

/**
 * Whether a settlement is a lordly seat (castle): a fort, or a town on
 * commanding terrain (by seed hash). Terrain-derived + read-only — no SimState,
 * so saves/determinism/seed-gallery are untouched. Drives the keep + macro glyph.
 */
export function isLordlySeat(id: number, tier: number, terrainAt?: TerrainProbe): boolean {
  if (tier < 2) return false;
  const seed = 0x5e771e ^ Math.imul(id + 1, 2654435761);
  if (deriveRole(seed, tier, terrainAt) === 'fort') return true;
  return commandingDir(terrainAt) != null && hash2(seed, 92, 1) < 0.3;
}

/**
 * Lay burgage plots along a gently bent main street: each parcel is a
 * street-front dwelling with a chain of rear yards (gardens, pens, woodpiles…)
 * running back off the street, role-biased. Parcels tile the frontage at a
 * fixed interval so the settlement reads as owned strips with consistent
 * frontage and rear land — the connective tissue between "sprite cluster" and
 * "medieval town". Returns the number of dwellings placed.
 */
function burgagePlots(
  out: PiecePlacement[],
  seed: number,
  have: HavePiece,
  buildable: Buildable | undefined,
  role: SettlementRole,
  cfg: {
    maxRx: number;
    maxRy: number;
    frontStep: number;
    count: number;
    bend: number;
    streetHalf: number;
    lampN: number;
    hutBias: boolean;
    /** Plot depth back from the street; the rear boundary fence aligns here so
        the plots read as long owned strips, not ragged clutter. */
    plotDepth: number;
    /** Reserved zone (market square / abbey precinct / muster yard) — kept
        clear of dwellings so the role's civic space reads. */
    reserve?: (dx: number, dy: number) => boolean;
  },
): number {
  const ok = (dx: number, dy: number): boolean =>
    (!buildable || buildable(dx, dy)) && !(cfg.reserve && cfg.reserve(dx, dy));
  const sx = (dy: number): number => Math.sin(dy * cfg.bend) * 2.2;
  const yards = ROLE_YARDS[role];
  const backLine = cfg.streetHalf + cfg.plotDepth;
  let placed = 0;
  let lamps = 0;
  for (const side of [-1, 1] as const) {
    for (let fy = cfg.maxRy - 1.5; fy > -cfg.maxRy + 1 && placed < cfg.count; fy -= cfg.frontStep) {
      const key = side * 131 + Math.round(fy + 60);
      const y = fy + (hash2(seed, key, 1) - 0.5) * 1.4;
      const roll = hash2(seed, key, 2);
      // Villages skew to huts; towns front the street with houses.
      const houseCut = cfg.hutBias ? 0.3 : 0.6;
      const hutCut = cfg.hutBias ? 0.85 : 0.88;
      const hKind =
        roll < houseCut
          ? pick(have, `house_${Math.floor(hash2(seed, key, 3) * 3)}`, 'house_0', 'hut_0')
          : roll < hutCut
            ? pick(have, `hut_${Math.floor(hash2(seed, key, 4) * 3)}`, 'hut_0', 'house_0')
            : pick(have, hash2(seed, key, 5) < 0.5 ? 'granary' : 'shed', 'shed', 'granary', 'hut_1');
      if (!hKind) break; // no dwelling art at all
      const hHalf = pw(hKind) * 0.5;
      const hx = sx(y) + side * (cfg.streetHalf + hHalf + hash2(seed, key, 6) * 0.6);
      if (Math.abs(hx) > cfg.maxRx || Math.abs(y) > cfg.maxRy) continue;
      if (!ok(hx, y) || collides(out, hx, y, pw(hKind))) continue;
      put(out, hKind, hx, y, { lift: true, lamp: lamps < cfg.lampN });
      if (lamps < cfg.lampN) lamps++;
      placed++;
      // Rear yards FILL the strip from the house back toward a fixed back line,
      // so each plot is a long narrow tail of owned land.
      let depth = cfg.streetHalf + hHalf * 2 + 1.0;
      for (let k = 0; k < 3 && depth < backLine - 1.5; k++) {
        const yi = Math.floor(hash2(seed, key, 20 + k) * yards.length);
        const yk = pick(have, yards[yi], ...yards);
        if (!yk) break;
        const yHalf = pw(yk) * 0.5;
        const ydx = sx(y) + side * (depth + yHalf);
        const ydy = y + (hash2(seed, key, 30 + k) - 0.5) * 1.8;
        depth += yHalf * 2 + 0.8;
        if (Math.abs(ydx) > cfg.maxRx || Math.abs(ydy) > cfg.maxRy) break;
        if (!ok(ydx, ydy) || collides(out, ydx, ydy, pw(yk))) continue;
        put(out, yk, ydx, ydy, {});
      }
      // Rear boundary fence at the FIXED back line — aligned across plots so the
      // strips read as owned parcels with a common rear edge.
      const fence = pick(have, 'yard_fence');
      if (fence) {
        const fdx = sx(y) + side * backLine;
        if (
          Math.abs(fdx) <= cfg.maxRx &&
          Math.abs(y) <= cfg.maxRy &&
          ok(fdx, y) &&
          !collides(out, fdx, y, pw(fence))
        ) {
          put(out, fence, fdx, y, {});
        }
      }
    }
  }
  return placed;
}

/**
 * Lay out an abbey's sacred precinct as a CLOISTER QUADRANGLE: the church on the
 * north range, an OPEN garth (cloister green) at the centre, plain service
 * ranges framing it east/west, a cemetery and orchard in the corners, all
 * enclosed by a wall with a south gate. The open centre + ordered frame read as
 * a monastic precinct, not a church mobbed by houses. Returns a reserve
 * predicate so the lay town sits OUTSIDE, along the approach.
 */
function placeAbbeyPrecinct(
  out: PiecePlacement[],
  seed: number,
  have: HavePiece,
  buildable: Buildable | undefined,
): (dx: number, dy: number) => boolean {
  const ok = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);
  const side = hash2(seed, 41, 2) < 0.5 ? -1 : 1;
  const pcx = side * 6; // precinct off to one side; the lay town fills the rest
  const pcy = -2;
  const half = 6;
  const x0 = pcx - half;
  const x1 = pcx + half;
  const y0 = pcy - half;
  const y1 = pcy + half;

  // Church dominates the north range.
  const church = pick(have, 'church', 'chapel');
  if (church && ok(pcx, y0 + 1.5)) put(out, church, pcx, y0 + 1.5, { lift: true, lamp: true });
  // Open cloister garth at the centre (kept calm — just a green).
  const garth = pick(have, 'yard_garden');
  if (garth && ok(pcx, pcy + 0.5)) put(out, garth, pcx, pcy + 0.5);
  // Plain service ranges frame the garth east + west (dorter/refectory stand-ins).
  const eRange = pick(have, 'shed', 'granary', 'crates');
  if (eRange && ok(x1 - 1.8, pcy)) put(out, eRange, x1 - 1.8, pcy, { flip: true });
  const wRange = pick(have, 'granary', 'shed', 'crates');
  if (wRange && ok(x0 + 1.8, pcy)) put(out, wRange, x0 + 1.8, pcy);
  // Cemetery (north corner, by the church) + kitchen orchard (south corner).
  const graves = pick(have, 'graves');
  if (graves && ok(pcx - side * 3.6, y0 + 2.6)) put(out, graves, pcx - side * 3.6, y0 + 2.6);
  const orchard = pick(have, 'yard_hay', 'yard_garden');
  if (orchard && ok(pcx + side * 3.6, y1 - 2.6)) put(out, orchard, pcx + side * 3.6, y1 - 2.6);

  // Precinct wall: a fence ring with a gate gap on the south face (the approach).
  const fence = pick(have, 'yard_fence');
  if (fence) {
    const step = pw(fence) * 1.05;
    for (let x = x0; x <= x1 + 0.01; x += step) {
      if (ok(x, y0) && !collides(out, x, y0, pw(fence))) put(out, fence, x, y0, {});
      if (Math.abs(x - pcx) > 2.6 && ok(x, y1) && !collides(out, x, y1, pw(fence))) {
        put(out, fence, x, y1, {});
      }
    }
    for (let y = y0 + step; y < y1 - 0.01; y += step) {
      if (ok(x0, y) && !collides(out, x0, y, pw(fence))) put(out, fence, x0, y, {});
      if (ok(x1, y) && !collides(out, x1, y, pw(fence))) put(out, fence, x1, y, {});
    }
  }
  return (dx, dy) => dx > x0 - 2 && dx < x1 + 2 && dy > y0 - 2 && dy < y1 + 2;
}

/**
 * Build the cluster layout for a living settlement. `have` reports which
 * piece textures actually loaded, so layouts degrade gracefully while some
 * art is still missing (granary → shed → hut, shrine/well → campfire…).
 */
export function layoutCluster(
  id: number,
  tier: number,
  population: number,
  have: HavePiece,
  buildable?: Buildable,
  /** Looser veto for the wall RING only: walls may cross a river (the ring
      stays closed) but still open to the open sea. Defaults to `buildable`. */
  wallBuildable?: Buildable,
  /** Predicate: is the tile at this world-px offset a road? Aligns town gates
      to roads that actually enter the wall. */
  roadAt?: Buildable,
  /** Predicate: is the tile at this world-px offset a river? Sites a watermill
      on the bank for settlements beside running water. */
  riverAt?: Buildable,
  /** Sample world-px offset → Terrain. Derives the settlement's role (forts in
      the mountains, hamlets in the woods). */
  terrainAt?: TerrainProbe,
): PiecePlacement[] {
  const seed = 0x5e771e ^ Math.imul(id + 1, 2654435761);
  const out: PiecePlacement[] = [];
  const bucket = popBucket(population);

  if (tier === 0) {
    // Camp: a fire, one or two tents, maybe crates.
    const fire = pick(have, 'campfire');
    if (fire) put(out, fire, 0, 1.2);
    const tent = pick(have, hash2(seed, 1, 1) < 0.5 ? 'tent_0' : 'tent_1', 'tent_0', 'tent_1');
    if (tent) placeSpiral(out, seed, 2, tent, 4.2, { lift: true, lamp: true }, buildable);
    if (bucket >= 1) {
      const tent2 = pick(have, tent === 'tent_0' ? 'tent_1' : 'tent_0', 'tent_0');
      if (tent2) placeSpiral(out, seed, 3, tent2, 4.6, { lift: true }, buildable);
    }
    const crates = pick(have, 'crates');
    if (crates && hash2(seed, 4, 1) < 0.6) placeSpiral(out, seed, 4, crates, 3.6, {}, buildable);
  } else if (tier === 1) {
    // Village: a centre well/shrine (or chapel for an abbey/forest hamlet),
    // a granary, an optional riverside mill, then cottages on tofts — each a
    // hut fronting a short lane with a rear yard, role-biased.
    const okV = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);
    const role = deriveRole(seed, tier, terrainAt);
    const centre = pick(have, hash2(seed, 10, 1) < 0.55 ? 'well' : 'shrine', 'well', 'shrine', 'campfire');
    if (centre && okV(0, 0.8)) put(out, centre, 0, 0.8);
    const chapel = pick(have, 'chapel');
    if (chapel && (role === 'abbey' || hash2(seed, 14, 1) < 0.4) && okV(0, -4.5)) {
      put(out, chapel, 0, -4.5, { lift: true, lamp: true });
    }
    const granary = pick(have, 'granary', 'shed', 'crates');
    if (granary) placeSpiral(out, seed, 11, granary, 5.0, {}, buildable);
    placeMill(out, seed, have, buildable, riverAt, 22);
    const count = Math.min(11, 4 + bucket);
    burgagePlots(out, seed, have, buildable, role, {
      maxRx: 13,
      maxRy: 9,
      frontStep: 4.8,
      count,
      bend: 0.16,
      streetHalf: 2.2,
      lampN: 2,
      hutBias: true,
      plotDepth: 7,
    });
    const lamp = pick(have, 'lamp');
    if (lamp && bucket >= 3 && okV(3.2, 2.6)) put(out, lamp, 3.2, 2.6, { lamp: true });
  } else {
    // Town: the spatial GRAMMAR comes from the role, not just the props —
    // a market square, a walled abbey precinct, or a fort's muster yard — then
    // burgage plots front the main street and part around that civic space.
    const ok = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);
    const role = deriveRole(seed, tier, terrainAt);

    // The off-market parish church (market/fort/forest); abbeys build a precinct.
    const placeSideChurch = (force: boolean): void => {
      const church = pick(have, 'church', 'chapel');
      const want = force || hash2(seed, 41, 1) < 0.55;
      const chDx = (hash2(seed, 41, 2) < 0.5 ? -1 : 1) * 9.5;
      if (church && want && ok(chDx, -8)) {
        put(out, church, chDx, -8, { lift: true, lamp: true });
        const yard = pick(have, 'churchyard');
        if (yard && ok(chDx, -3)) put(out, yard, chDx, -3);
        const graves = pick(have, 'graves');
        const gDx = chDx + (chDx < 0 ? 3.6 : -3.6);
        if (graves && ok(gDx, -3.2)) put(out, graves, gDx, -3.2);
      }
    };

    // Castle / lordly seat: a fort, or a town commanding nearby heights/coast.
    // The keep is sited toward the commanded feature so it reads as overlooking
    // the ground it controls. Terrain-derived — no SimState.
    const cmdDir = commandingDir(terrainAt);
    const wantsKeep = role === 'fort' || (cmdDir != null && hash2(seed, 92, 1) < 0.3);

    let reserve: ((dx: number, dy: number) => boolean) | undefined;
    if (role === 'abbey') {
      // The church + cloister precinct IS the core (no moot hall).
      reserve = placeAbbeyPrecinct(out, seed, have, buildable);
    } else {
      // A castle's stronghold is a stone keep (sited toward the commanded
      // terrain); other towns get a civic hall.
      if (wantsKeep) {
        const keep = pick(have, 'keep', 'hall');
        const kx = cmdDir != null ? Math.cos(cmdDir) * 4.5 : 0;
        const ky = -4.5 + (cmdDir != null ? Math.sin(cmdDir) * 3 : 0);
        if (keep && ok(kx, ky)) put(out, keep, kx, ky, { lift: true, lamp: true });
      } else {
        const hall = pick(have, 'hall');
        if (hall && ok(0, -4.5)) put(out, hall, 0, -4.5, { lift: true, lamp: true });
      }
      if (role === 'market') {
        // The street widens mid-town into an open market square ringed by
        // stalls; burgage frontage parts around the reserved square.
        const mqy = 3.5;
        reserve = (dx, dy) => Math.abs(dx) < 5.5 && dy > mqy - 4.5 && dy < mqy + 4.5;
        const s0 = pick(have, 'stall_0', 'crates');
        if (s0 && ok(-3, mqy - 1)) put(out, s0, -3, mqy - 1, { flip: true });
        const s1 = pick(have, 'stall_1', 'shed');
        if (s1 && ok(3, mqy)) put(out, s1, 3, mqy);
        const c = pick(have, 'crates');
        if (c && ok(0.5, mqy + 2.4)) put(out, c, 0.5, mqy + 2.4);
        const shrine = pick(have, 'shrine', 'well');
        if (shrine && hash2(seed, 40, 1) < 0.6 && ok(-7, -1.5)) put(out, shrine, -7, -1.5);
        placeSideChurch(false);
      } else if (role === 'fort') {
        // A muster yard: open defended ground just inside the south gate,
        // flanked by the barracks and stable; fewer civilian plots overall.
        const myY = 7;
        reserve = (dx, dy) => Math.abs(dx) < 5.5 && dy > myY - 4 && dy < myY + 4;
        const barracks = pick(have, 'barracks', 'shed', 'granary');
        if (barracks && ok(-5, myY)) put(out, barracks, -5, myY, { lift: true });
        const stable = pick(have, 'stable', 'shed', 'crates');
        if (stable && ok(5, myY - 0.3)) put(out, stable, 5, myY - 0.3, { lift: true, flip: true });
        placeSideChurch(false);
      } else {
        placeSideChurch(false);
      }
    }

    // A riverside town earns a watermill on the bank — reserved before the
    // plots so dwellings flow around it; the wall (below) encloses it.
    placeMill(out, seed, have, buildable, riverAt, 30);

    // Burgage plots front the main street as long owned strips, parting around
    // the role's reserved civic space. Forts hold fewer civilian plots.
    const count =
      role === 'fort'
        ? Math.min(18, 9 + Math.max(0, bucket - 3) * 2)
        : Math.min(28, 12 + Math.max(0, bucket - 3) * 2);
    burgagePlots(out, seed, have, buildable, role, {
      maxRx: 20,
      maxRy: 13.5,
      frontStep: 4.8,
      count,
      bend: 0.12,
      streetHalf: 2.7,
      lampN: 4,
      hutBias: false,
      plotDepth: 10.5,
      reserve,
    });

    const lamp = pick(have, 'lamp');
    if (lamp) {
      if (ok(-3.4, 3.4)) put(out, lamp, -3.4, 3.4, { lamp: true });
      if (ok(3.4, -1.8)) put(out, lamp, 3.4, -1.8, { lamp: true });
    }

    // Fit a ring to the ACTUAL built form as an asymmetric box (the church
    // pushes the north face out further than the south), not a centred
    // rectangle — so each town's hull reads as grown around its contents.
    let x0 = -8;
    let x1 = 8;
    let y0 = -6;
    let y1 = 6;
    for (const p of out) {
      // Water structures sit on the river; they must not bulge the ring out
      // over the water — only the dry built form sizes the wall.
      if (p.kind === 'jetty' || p.kind === 'millpond') continue;
      x0 = Math.min(x0, p.dx - p.w * 0.5);
      x1 = Math.max(x1, p.dx + p.w * 0.5);
      y0 = Math.min(y0, p.dy - p.w * 0.35);
      y1 = Math.max(y1, p.dy + p.w * 0.35);
    }
    const pad = 3.5;
    const cxb = (x0 + x1) / 2;
    const cyb = (y0 + y1) / 2;
    // Clamp each face's distance from the built-form centre so a stray far
    // building can't inflate the ring to district size.
    x0 = Math.max(cxb - 26, x0 - pad);
    x1 = Math.min(cxb + 26, x1 + pad);
    y0 = Math.max(cyb - 19, y0 - pad * 0.85);
    y1 = Math.min(cyb + 19, y1 + pad * 0.85);
    // A fort or commanding castle always walls; other roles by chance.
    if (wantsKeep || hash2(seed, 901, 1) < 0.7) {
      const gates = wallHull(out, seed, { x0, y0, x1, y1 }, have, wallBuildable ?? buildable, roadAt);
      // Extramural sprawl spilling out of the gates (poorer dwellings + yards),
      // bounded so the footprint stays compact.
      placeSuburbs(out, seed, have, buildable, gates, 26);
    }
  }

  // Painter's order: back to front, then explicit layer (corner towers on top).
  out.sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0) || a.dy - b.dy);
  return out;
}

/** Scattered broken pieces where a settlement once stood. */
export function layoutRuin(x: number, y: number, have: HavePiece): PiecePlacement[] {
  const seed = 0xdead ^ Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663);
  const out: PiecePlacement[] = [];
  const count = 2 + Math.floor(hash2(seed, 0, 0) * 2);
  for (let i = 0; i < count; i++) {
    const kind = pick(have, `ruin_${Math.floor(hash2(seed, i, 1) * 3)}`, 'ruin_0', 'ruin_1', 'ruin_2');
    if (kind) placeSpiral(out, seed, i, kind, i === 0 ? 0 : 4);
  }
  out.sort((a, b) => a.dy - b.dy);
  return out;
}

/** Visual footprint half-extents of a layout (for ground patch, label, glow). */
export function clusterExtent(placements: PiecePlacement[]): { rx: number; ry: number } {
  let rx = 6;
  let ry = 4;
  for (const p of placements) {
    rx = Math.max(rx, Math.abs(p.dx) + p.w * 0.5);
    ry = Math.max(ry, Math.abs(p.dy) + p.w * 0.35);
  }
  return { rx, ry };
}
