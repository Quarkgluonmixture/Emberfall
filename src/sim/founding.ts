/** Founding of civilizations and settlements. */
import { BALANCE } from '../config/balance';
import {
  CIV_COLORS,
  CIV_NAMES,
  CULTURE_TRAITS,
  SETTLEMENT_PREFIXES,
  SETTLEMENT_SUFFIXES,
} from '../config/civConfig';
import type { RNG } from '../core/rng';
import { Terrain, type Civilization, type Settlement, type SimState, type World } from '../core/types';
import { isBuildable, nearTerrain, terrainAt } from '../world/world';
import { gatherYields } from './resources';
import { pushEvent } from './chronicle';

/** How attractive a tile is as a settlement site. -1 if unbuildable. */
export function scoreSite(world: World, x: number, y: number): number {
  if (!isBuildable(terrainAt(world, x, y))) return -1;
  const y0 = gatherYields(world, x, y, BALANCE.resources.gatherRadius);
  let score = y0.food + y0.wood * 0.5 + y0.stone * 0.3;
  if (nearTerrain(world, x, y, 2, Terrain.River)) score += 4;
  if (nearTerrain(world, x, y, 2, Terrain.Ocean)) score += 1.5;
  return score;
}

/** Find good, mutually-distant starting locations. */
export function findStartSites(
  world: World,
  count: number,
  minDist: number,
  rng: RNG,
): Array<{ x: number; y: number }> {
  const candidates: Array<{ x: number; y: number; score: number }> = [];
  for (let y = 4; y < world.height - 4; y += 2) {
    for (let x = 4; x < world.width - 4; x += 2) {
      const s = scoreSite(world, x, y);
      if (s > 8) candidates.push({ x, y, score: s * rng.range(0.9, 1.1) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const pick = (dist: number): Array<{ x: number; y: number }> => {
    const chosen: Array<{ x: number; y: number }> = [];
    for (const c of candidates) {
      if (chosen.length >= count) break;
      const tooClose = chosen.some((p) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 < dist * dist);
      if (!tooClose) chosen.push({ x: c.x, y: c.y });
    }
    return chosen;
  };

  let sites = pick(minDist);
  if (sites.length < count) sites = pick(minDist * 0.7);
  if (sites.length < count) sites = pick(minDist * 0.45);
  return sites;
}

export function generateSettlementName(rng: RNG, state: SimState): string {
  for (let attempt = 0; attempt < 24; attempt++) {
    const name = rng.pick(SETTLEMENT_PREFIXES) + rng.pick(SETTLEMENT_SUFFIXES);
    if (!state.settlements.some((s) => s.name === name)) return name;
  }
  return rng.pick(SETTLEMENT_PREFIXES) + rng.pick(SETTLEMENT_SUFFIXES) + ` ${state.nextSettlementId}`;
}

export function foundSettlement(
  state: SimState,
  civId: number,
  x: number,
  y: number,
  population: number,
  rng: RNG,
  resources?: { food: number; wood: number },
): Settlement {
  const s: Settlement = {
    id: state.nextSettlementId++,
    civId,
    name: generateSettlementName(rng, state),
    x,
    y,
    tier: 0,
    population,
    food: resources?.food ?? BALANCE.civ.startFood,
    wood: resources?.wood ?? BALANCE.civ.startWood,
    stone: 0,
    morale: 70,
    foundedDay: state.day,
    lastUpgradeDay: -10000,
    lastRaidDay: -10000,
    plagueDays: 0,
    famineDays: 0,
    immunityDays: 0,
    hungerDays: 0,
  };
  state.settlements.push(s);
  return s;
}

/** Create the starting civilizations and their first camps. */
export function foundCivilizations(state: SimState, rng: RNG): void {
  const cfg = BALANCE.civ;
  const sites = findStartSites(state.world, cfg.count, cfg.minSpawnDistance, rng);
  const names = rng.shuffle([...CIV_NAMES]);

  for (let i = 0; i < sites.length; i++) {
    const traits = rng.shuffle([...CULTURE_TRAITS]).slice(0, cfg.traitCount);
    const civ: Civilization = {
      id: i,
      name: names[i % names.length],
      color: CIV_COLORS[i % CIV_COLORS.length],
      alive: true,
      fallenYear: -1,
      foundedDay: 0,
      traits,
      knowledge: 0,
      faith: 0,
      culture: 0,
      military: cfg.startPopulation * BALANCE.military.perPop,
      goldenAgeDays: 0,
      goldenCooldown: 0,
      crisisDays: 0,
    };
    state.civs.push(civ);
    const camp = foundSettlement(state, civ.id, sites[i].x, sites[i].y, cfg.startPopulation, rng);
    pushEvent(state, rng, 'founding', 3, civ.id, {
      civ: civ.name,
      name: camp.name,
      x: camp.x,
      y: camp.y,
    });
  }
}
