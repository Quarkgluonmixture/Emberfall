/** Territory: tiles claimed by the nearest settlement within its influence radius. */
import { BALANCE } from '../config/balance';
import { pairKey, Terrain, type SimState } from '../core/types';

export function settlementRadius(tier: number, population: number): number {
  const cfg = BALANCE.territory;
  return (
    cfg.radiusByTier[tier] + Math.min(cfg.popRadiusBonusCap, Math.floor(population / 40))
  );
}

/** Recompute tile ownership and the set of bordering civ pairs. */
export function recomputeTerritory(state: SimState): void {
  const world = state.world;
  const { width, height } = world;
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
  state.territoryVersion++;
}
