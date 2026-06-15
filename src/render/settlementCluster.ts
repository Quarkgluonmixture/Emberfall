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
): void {
  const stone = hash2(seed, 900, 1) < 0.6;
  const straight = pick(have, stone ? 'wall_straight' : 'palisade_straight', 'palisade_straight', 'wall_straight');
  if (!straight) return;
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
    // Village: centre well/shrine, granary, 4-10 huts.
    const okV = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);
    const centre = pick(have, hash2(seed, 10, 1) < 0.55 ? 'well' : 'shrine', 'well', 'shrine', 'campfire');
    if (centre && okV(0, 0.8)) put(out, centre, 0, 0.8);
    // Some villages cluster around a small chapel landmark.
    const chapel = pick(have, 'chapel');
    if (chapel && hash2(seed, 14, 1) < 0.45 && okV(0, -4.5)) {
      put(out, chapel, 0, -4.5, { lift: true, lamp: true });
    }
    const granary = pick(have, 'granary', 'shed', 'crates');
    if (granary) placeSpiral(out, seed, 11, granary, 5.2, {}, buildable);
    const count = Math.min(10, 4 + bucket);
    for (let i = 0; i < count; i++) {
      const roll = hash2(seed, 20 + i, 2);
      const hut = pick(have, `hut_${Math.floor(roll * 3)}`, 'hut_0', 'hut_1', 'hut_2');
      if (hut) placeSpiral(out, seed, 20 + i, hut, 5, { lift: true, lamp: i < 2 }, buildable);
    }
    // Farm yards: gardens, pens and woodpiles give the village a worked-land feel.
    for (let i = 0; i < 3; i++) {
      const yk = pick(have, ['yard_garden', 'yard_pen', 'yard_wood'][i]);
      if (yk) placeSpiral(out, seed, 30 + i, yk, 6 + i * 1.5, {}, buildable);
    }
    const lamp = pick(have, 'lamp');
    if (lamp && bucket >= 3 && okV(3.2, 2.6)) put(out, lamp, 3.2, 2.6, { lamp: true });
  } else {
    // Town: hall, market square, 12-30 mixed buildings, lamps, wall chance.
    // Fixed plaza pieces still respect the terrain veto — a coastal plaza
    // must not put its market stalls in the surf.
    const ok = (dx: number, dy: number): boolean => !buildable || buildable(dx, dy);
    const hall = pick(have, 'hall');
    if (hall && ok(0, -4.5)) put(out, hall, 0, -4.5, { lift: true, lamp: true });
    const stallA = pick(have, 'stall_0', 'crates');
    const stallB = pick(have, 'stall_1', 'shed');
    if (stallA && ok(-4.5, 2.4)) put(out, stallA, -4.5, 2.4, { flip: true });
    if (stallB && ok(4.5, 2.6)) put(out, stallB, 4.5, 2.6);
    const shrine = pick(have, 'shrine', 'well');
    const shrineDx = hash2(seed, 40, 2) < 0.5 ? -7 : 7;
    if (shrine && hash2(seed, 40, 1) < 0.6 && ok(shrineDx, -1.5)) put(out, shrine, shrineDx, -1.5);

    // The church: the grandest landmark, set OFF the market to one side, with a
    // churchyard wall and graves beside it (the tall spire poking past the wall
    // is authentic). Placed before houses so the street rows give it room.
    const church = pick(have, 'church', 'chapel');
    const chDx = (hash2(seed, 41, 2) < 0.5 ? -1 : 1) * 9.5;
    if (church && ok(chDx, -8)) {
      put(out, church, chDx, -8, { lift: true, lamp: true });
      const yard = pick(have, 'churchyard');
      if (yard && ok(chDx, -3)) put(out, yard, chDx, -3);
      const graves = pick(have, 'graves');
      const gDx = chDx + (chDx < 0 ? 3.6 : -3.6);
      if (graves && ok(gDx, -3.2)) put(out, graves, gDx, -3.2);
    }

    // Medieval town, ROAD-FIRST (KCD read): a slightly curved main street runs
    // up from the south gate to the market/hall, and houses FRONT it in rows on
    // both sides — closest row tight to the street, then back rows behind, so
    // the town reads as street-frontage-and-plots, not a ring or a blob. The
    // street and the central market stay clear; everything is bounded so houses
    // stay inside the wall, and collisions keep them from overlapping to mush.
    const fixed = out.length;
    const count = Math.min(30, 12 + Math.max(0, bucket - 3) * 2) - fixed;
    const maxRx = 20;
    const maxRy = 13.5;
    const streetX = (dy: number): number => Math.sin(dy * 0.13) * 2.3; // gentle bend
    let placed = 0;
    // Inner rows first (street frontage), then back rows; gate end upward.
    for (let row = 0; row < 3 && placed < count; row++) {
      const off = 5.6 + row * 6.3; // perpendicular distance from the street
      for (const side of [-1, 1] as const) {
        for (let dy = maxRy - 1; dy > -maxRy && placed < count; dy -= 6.1) {
          const yy = dy + (hash2(seed, row * 47 + Math.round(dy + 50), 1) - 0.5) * 2.2;
          const dx = streetX(yy) + side * (off + (hash2(seed, row * 47 + Math.round(dy + 50), 2) - 0.5) * 1.8);
          if (Math.abs(dx) > maxRx || Math.abs(yy) > maxRy) continue;
          const roll = hash2(seed, 50 + placed, 3);
          const kind =
            roll < 0.55
              ? pick(have, `house_${Math.floor(hash2(seed, 50 + placed, 4) * 3)}`, 'house_0', 'hut_0')
              : roll < 0.85
                ? pick(have, `hut_${Math.floor(hash2(seed, 50 + placed, 5) * 3)}`, 'hut_0', 'house_0')
                : pick(have, hash2(seed, 50 + placed, 6) < 0.5 ? 'granary' : 'shed', 'shed', 'granary', 'hut_1');
          if (!kind) break; // no building art at all
          if (buildable && !buildable(dx, yy)) continue;
          if (collides(out, dx, yy, pw(kind))) continue;
          put(out, kind, dx, yy, { lift: true, lamp: placed < 4 });
          placed++;
        }
      }
    }

    // Yard/plot dressing in the gaps behind the houses — gardens, pens, wood,
    // hay, fences — so plots read as lived-in burgage yards, not bare ground.
    const yardKinds = ['yard_garden', 'yard_pen', 'yard_wood', 'yard_hay', 'yard_fence', 'yard_shed'];
    let yards = 0;
    for (let i = 0; i < 50 && yards < 9; i++) {
      const ya = hash2(seed, 200 + i, 1) * Math.PI * 2;
      const yr = 8 + hash2(seed, 200 + i, 2) * 10;
      const ydx = Math.cos(ya) * yr;
      const ydy = Math.sin(ya) * yr * 0.72;
      if (Math.abs(ydx) > maxRx || Math.abs(ydy) > maxRy) continue;
      const yk = pick(have, yardKinds[Math.floor(hash2(seed, 200 + i, 3) * yardKinds.length)]);
      if (!yk) continue;
      if (buildable && !buildable(ydx, ydy)) continue;
      if (collides(out, ydx, ydy, pw(yk))) continue;
      put(out, yk, ydx, ydy, {});
      yards++;
    }

    const lamp = pick(have, 'lamp');
    if (lamp) {
      if (ok(-3.4, 3.4)) put(out, lamp, -3.4, 3.4, { lamp: true });
      if (ok(3.4, -1.8)) put(out, lamp, 3.4, -1.8, { lamp: true });
    }

    if (hash2(seed, 901, 1) < 0.7) {
      // Fit the ring to the ACTUAL built form as an asymmetric box (the church
      // pushes the north face out further than the south), not a centred
      // rectangle — so each town's hull reads as grown around its contents.
      let x0 = -8;
      let x1 = 8;
      let y0 = -6;
      let y1 = 6;
      for (const p of out) {
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
      wallHull(out, seed, { x0, y0, x1, y1 }, have, wallBuildable ?? buildable, roadAt);
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
