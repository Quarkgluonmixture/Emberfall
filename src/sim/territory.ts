/** Territory: tiles claimed by the nearest settlement within its influence radius. */
import { BALANCE } from '../config/balance';
import { pairKey, Terrain, type SimState } from '../core/types';

export function settlementRadius(tier: number, population: number): number {
  const cfg = BALANCE.territory;
  return cfg.radiusByTier[tier] + Math.min(cfg.popRadiusBonusCap, Math.floor(population / 40));
}

function sameOwner(a: Int16Array, b: Int16Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Recompute tile ownership and the set of bordering civ pairs. */
export function recomputeTerritory(state: SimState): void {
  const world = state.world;
  const { width, height } = world;
  // territoryVersion is a render invalidation token, not a recompute counter.
  // Keep a compact snapshot so the 10-day cadence can be a no-op visually when
  // the actual owner grid and border-pair set are unchanged.
  const previousOwner = world.owner.slice();
  const previousBorders = state.borders;
  world.owner.fill(-1);

  const claims = state.settlements.map((s) => ({
    x: s.x,
    y: s.y,
    civId: s.civId,
    r2: settlementRadius(s.tier, s.population) ** 2,
  }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (world.terrain[i] === Terrain.Ocean) continue;
      let bestD2 = Infinity;
      let bestCiv = -1;
      for (const c of claims) {
        const dx = x - c.x;
        const dy = y - c.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= c.r2 && d2 < bestD2) {
          bestD2 = d2;
          bestCiv = c.civId;
        }
      }
      world.owner[i] = bestCiv;
    }
  }

  const borders = new Set<number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = world.owner[i];
      if (o < 0) continue;
      if (x < width - 1) {
        const o2 = world.owner[i + 1];
        if (o2 >= 0 && o2 !== o) borders.add(pairKey(o, o2));
      }
      if (y < height - 1) {
        const o2 = world.owner[i + width];
        if (o2 >= 0 && o2 !== o) borders.add(pairKey(o, o2));
      }
    }
  }
  state.borders = [...borders].sort((a, b) => a - b);
  if (!sameOwner(previousOwner, world.owner) || !sameNumbers(previousBorders, state.borders)) {
    state.territoryVersion++;
  }
}
