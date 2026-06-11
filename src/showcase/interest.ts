/**
 * Interest scoring for the attract-mode director. Pure functions over
 * SimState — no rendering imports, fully unit-testable.
 */
import type { RNG } from '../core/rng';
import type { SimState } from '../core/types';

export interface InterestTarget {
  /** Tile coordinates. */
  x: number;
  y: number;
  zoom: number;
  score: number;
  /** Seconds the camera should linger. */
  holdTime: number;
  label: string;
  kind: string;
}

/** How camera-worthy each chronicle event kind is. */
export const EVENT_WEIGHTS: Record<string, number> = {
  capture: 10,
  civFell: 9,
  warDeclared: 9,
  collapse: 8,
  goldenAge: 8,
  founding: 7,
  wildfire: 7,
  migration: 6,
  town: 6,
  plague: 6,
  skirmish: 5,
  schism: 5,
  peace: 5,
  alliance: 4,
  succession: 4,
  famine: 4,
  village: 4,
  flood: 3,
  wildfireWild: 3,
  tradeOpened: 3,
};

const EVENT_ZOOM: Record<string, number> = {
  capture: 3.4,
  skirmish: 3.2,
  warDeclared: 2.4,
  wildfire: 2.4,
  wildfireWild: 2.2,
  migration: 2.8,
  goldenAge: 3.4,
  town: 3.6,
  village: 3.4,
  founding: 3.4,
};

/**
 * Targets from recent located chronicle entries. Scores decay with age so
 * the camera prefers what is happening *now*.
 */
export function eventTargets(
  state: SimState,
  sinceIndex: number,
  maxAgeDays = 30,
): InterestTarget[] {
  const out: InterestTarget[] = [];
  for (let i = Math.max(0, sinceIndex); i < state.chronicle.length; i++) {
    const e = state.chronicle[i];
    if (e.x === undefined || e.y === undefined) continue;
    const age = state.day - e.day;
    if (age > maxAgeDays) continue;
    const weight = EVENT_WEIGHTS[e.kind] ?? e.importance * 2;
    const freshness = 1 - age / maxAgeDays;
    out.push({
      x: e.x,
      y: e.y,
      zoom: EVENT_ZOOM[e.kind] ?? 3,
      score: (weight + e.importance) * (0.4 + 0.6 * freshness),
      holdTime: 6 + weight * 0.5,
      label: e.text,
      kind: e.kind,
    });
  }
  return out;
}

/** Evergreen targets: civ capitals, war frontiers, a world establishing shot. */
export function ambientTargets(state: SimState): InterestTarget[] {
  const out: InterestTarget[] = [];

  for (const civ of state.civs) {
    if (!civ.alive) continue;
    let seat = null;
    for (const s of state.settlements) {
      if (s.civId === civ.id && (!seat || s.population > seat.population)) seat = s;
    }
    if (seat) {
      out.push({
        x: seat.x,
        y: seat.y,
        zoom: 3.0 + seat.tier * 0.3,
        score: 3 + seat.tier + (civ.goldenAgeDays > 0 ? 2 : 0),
        holdTime: 9,
        label: `${seat.name}, heart of ${civ.name}`,
        kind: 'capital',
      });
    }
  }

  for (let i = 0; i < state.civs.length; i++) {
    for (let j = i + 1; j < state.civs.length; j++) {
      const a = state.civs[i];
      const b = state.civs[j];
      if (!a?.alive || !b?.alive) continue;
      if (state.relations[i]?.[j]?.state !== 'war') continue;
      let bestD2 = Infinity;
      let mid: { x: number; y: number } | null = null;
      for (const sa of state.settlements) {
        if (sa.civId !== a.id) continue;
        for (const sb of state.settlements) {
          if (sb.civId !== b.id) continue;
          const d2 = (sa.x - sb.x) ** 2 + (sa.y - sb.y) ** 2;
          if (d2 < bestD2) {
            bestD2 = d2;
            mid = { x: Math.round((sa.x + sb.x) / 2), y: Math.round((sa.y + sb.y) / 2) };
          }
        }
      }
      if (mid) {
        out.push({
          x: mid.x,
          y: mid.y,
          zoom: 2.6,
          score: 7,
          holdTime: 10,
          label: `The ${a.name}–${b.name} frontier`,
          kind: 'frontier',
        });
      }
    }
  }

  out.push({
    x: state.world.width / 2,
    y: state.world.height / 2,
    zoom: 0.95,
    score: 2,
    holdTime: 8,
    label: 'The world entire',
    kind: 'wide',
  });
  return out;
}

/**
 * Choose the next shot: recent events compete with ambient views; mild
 * randomness and a travel-distance bonus keep the tour varied.
 */
export function pickNextTarget(
  state: SimState,
  rng: RNG,
  lastX?: number,
  lastY?: number,
): InterestTarget | null {
  const sinceIndex = Math.max(0, state.chronicle.length - 200);
  const all = [...eventTargets(state, sinceIndex), ...ambientTargets(state)];
  if (all.length === 0) return null;
  let best: InterestTarget | null = null;
  let bestScore = -Infinity;
  for (const t of all) {
    const travel =
      lastX === undefined || lastY === undefined
        ? 0
        : Math.min(3, Math.hypot(t.x - lastX, t.y - lastY) / 30);
    const sc = t.score + rng.range(0, 2) + travel;
    if (sc > bestScore) {
      bestScore = sc;
      best = t;
    }
  }
  return best;
}
