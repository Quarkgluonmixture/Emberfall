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
  flip: boolean;
  /** Building with windows: gets a warm additive lift copy at night. */
  lift: boolean;
  /** Hosts a small window/lamp glow above the night overlay. */
  lamp: boolean;
}

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
  palisade_straight: 7,
  palisade_corner: 5.5,
  lamp: 2.2,
  scaffold: 5,
  campfire: 4,
  ruin_0: 6,
  ruin_1: 6.5,
  ruin_2: 6,
};

export type HavePiece = (kind: string) => boolean;

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
): boolean {
  const w = PIECE_W[kind] ?? 6;
  const a0 = hash2(seed, slot, 11) * Math.PI * 2;
  for (let k = 0; k < 70; k++) {
    const ang = a0 + k * GOLDEN;
    const r = startR + k * 0.5 + hash2(seed, slot, 13 + (k % 5)) * 1.6;
    const dx = Math.cos(ang) * r;
    const dy = Math.sin(ang) * r * 0.72; // squash: settlements read as ovals
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
  opts: { lift?: boolean; lamp?: boolean; flip?: boolean; w?: number } = {},
): void {
  out.push({
    kind,
    dx,
    dy,
    w: opts.w ?? PIECE_W[kind] ?? 6,
    flip: opts.flip ?? false,
    lift: opts.lift ?? false,
    lamp: opts.lamp ?? false,
  });
}

/** Defensive ring around a town: wall pieces along an ellipse, gate south. */
function wallRing(out: PiecePlacement[], seed: number, radius: number, have: HavePiece): void {
  const stone = hash2(seed, 900, 1) < 0.6;
  const straight = pick(have, stone ? 'wall_straight' : 'palisade_straight', 'palisade_straight', 'wall_straight');
  if (!straight) return;
  const corner = pick(have, stone ? 'wall_tower' : 'palisade_corner', 'palisade_corner', 'wall_tower');
  const gate = stone ? pick(have, 'wall_gate') : null;

  const rx = radius;
  const ry = radius * 0.72;
  const circumference = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const segments = Math.max(8, Math.round(circumference / 6.4));
  // The gate sits due south (screen-down); skip wall segments under it.
  const gateAng = Math.PI / 2;
  for (let i = 0; i < segments; i++) {
    const ang = (i / segments) * Math.PI * 2;
    const dx = Math.cos(ang) * rx;
    const dy = Math.sin(ang) * ry;
    const dGate = Math.abs(Math.atan2(Math.sin(ang - gateAng), Math.cos(ang - gateAng)));
    if (dGate < 0.55 / (radius / 14)) continue;
    // Corner towers on the diagonals.
    const diag = Math.min(
      Math.abs(Math.atan2(Math.sin(ang - Math.PI / 4), Math.cos(ang - Math.PI / 4))),
      Math.abs(Math.atan2(Math.sin(ang - (3 * Math.PI) / 4), Math.cos(ang - (3 * Math.PI) / 4))),
      Math.abs(Math.atan2(Math.sin(ang + Math.PI / 4), Math.cos(ang + Math.PI / 4))),
      Math.abs(Math.atan2(Math.sin(ang + (3 * Math.PI) / 4), Math.cos(ang + (3 * Math.PI) / 4))),
    );
    const kind = corner && diag < Math.PI / segments ? corner : straight;
    put(out, kind, dx, dy, { flip: Math.cos(ang) < 0 });
  }
  if (gate) put(out, gate, Math.cos(gateAng) * rx, Math.sin(gateAng) * ry);
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
): PiecePlacement[] {
  const seed = 0x5e771e ^ Math.imul(id + 1, 2654435761);
  const out: PiecePlacement[] = [];
  const bucket = popBucket(population);

  if (tier === 0) {
    // Camp: a fire, one or two tents, maybe crates.
    const fire = pick(have, 'campfire');
    if (fire) put(out, fire, 0, 1.2);
    const tent = pick(have, hash2(seed, 1, 1) < 0.5 ? 'tent_0' : 'tent_1', 'tent_0', 'tent_1');
    if (tent) placeSpiral(out, seed, 2, tent, 4.2, { lift: true, lamp: true });
    if (bucket >= 1) {
      const tent2 = pick(have, tent === 'tent_0' ? 'tent_1' : 'tent_0', 'tent_0');
      if (tent2) placeSpiral(out, seed, 3, tent2, 4.6, { lift: true });
    }
    const crates = pick(have, 'crates');
    if (crates && hash2(seed, 4, 1) < 0.6) placeSpiral(out, seed, 4, crates, 3.6);
  } else if (tier === 1) {
    // Village: centre well/shrine, granary, 4-10 huts.
    const centre = pick(have, hash2(seed, 10, 1) < 0.55 ? 'well' : 'shrine', 'well', 'shrine', 'campfire');
    if (centre) put(out, centre, 0, 0.8);
    const granary = pick(have, 'granary', 'shed', 'crates');
    if (granary) placeSpiral(out, seed, 11, granary, 5.2);
    const count = Math.min(10, 4 + bucket);
    for (let i = 0; i < count; i++) {
      const roll = hash2(seed, 20 + i, 2);
      const hut = pick(have, `hut_${Math.floor(roll * 3)}`, 'hut_0', 'hut_1', 'hut_2');
      if (hut) placeSpiral(out, seed, 20 + i, hut, 5, { lift: true, lamp: i < 2 });
    }
    const lamp = pick(have, 'lamp');
    if (lamp && bucket >= 3) put(out, lamp, 3.2, 2.6, { lamp: true });
  } else {
    // Town: hall, market square, 12-30 mixed buildings, lamps, wall chance.
    const hall = pick(have, 'hall');
    if (hall) put(out, hall, 0, -4.5, { lift: true, lamp: true });
    const stallA = pick(have, 'stall_0', 'crates');
    const stallB = pick(have, 'stall_1', 'shed');
    if (stallA) put(out, stallA, -4.5, 2.4, { flip: true });
    if (stallB) put(out, stallB, 4.5, 2.6);
    const shrine = pick(have, 'shrine', 'well');
    if (shrine && hash2(seed, 40, 1) < 0.6) put(out, shrine, hash2(seed, 40, 2) < 0.5 ? -7 : 7, -1.5);

    const fixed = out.length;
    const count = Math.min(30, 12 + Math.max(0, bucket - 3) * 2) - fixed;
    for (let i = 0; i < count; i++) {
      const roll = hash2(seed, 50 + i, 3);
      const kind =
        roll < 0.55
          ? pick(have, `house_${Math.floor(hash2(seed, 50 + i, 4) * 3)}`, 'house_0', 'hut_0')
          : roll < 0.85
            ? pick(have, `hut_${Math.floor(hash2(seed, 50 + i, 5) * 3)}`, 'hut_0', 'house_0')
            : pick(have, hash2(seed, 50 + i, 6) < 0.5 ? 'granary' : 'shed', 'shed', 'granary', 'hut_1');
      if (kind) placeSpiral(out, seed, 50 + i, kind, 7.5, { lift: true, lamp: i < 4 });
    }

    const lamp = pick(have, 'lamp');
    if (lamp) {
      put(out, lamp, -3.4, 3.4, { lamp: true });
      put(out, lamp, 3.4, -1.8, { lamp: true });
    }

    if (hash2(seed, 901, 1) < 0.7) {
      let maxR = 0;
      for (const p of out) maxR = Math.max(maxR, Math.hypot(p.dx, p.dy / 0.72) + p.w * 0.5);
      wallRing(out, seed, maxR + 3.5, have);
    }
  }

  // Painter's order: back to front.
  out.sort((a, b) => a.dy - b.dy);
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
