/** Shared fixtures: hand-built worlds and states for focused unit tests. */
import {
  Terrain,
  type Civilization,
  type Relation,
  type Settlement,
  type SimState,
  type World,
} from '../src/core/types';

export function makeWorld(width: number, height: number, fill: Terrain): World {
  const size = width * height;
  return {
    width,
    height,
    seed: 1,
    terrain: new Uint8Array(size).fill(fill),
    elevation: new Float32Array(size).fill(0.5),
    moisture: new Float32Array(size).fill(0.5),
    temperature: new Float32Array(size).fill(0.5),
    owner: new Int16Array(size).fill(-1),
  };
}

export function makeCiv(id: number, overrides: Partial<Civilization> = {}): Civilization {
  return {
    id,
    name: `Civ${id}`,
    color: 0xffffff,
    alive: true,
    fallenYear: -1,
    traits: [],
    knowledge: 0,
    faith: 0,
    culture: 0,
    military: 10,
    goldenAgeDays: 0,
    goldenCooldown: 0,
    crisisDays: 0,
    ...overrides,
  };
}

export function makeSettlement(
  id: number,
  civId: number,
  x: number,
  y: number,
  overrides: Partial<Settlement> = {},
): Settlement {
  return {
    id,
    civId,
    name: `S${id}`,
    x,
    y,
    tier: 0,
    population: 12,
    food: 50,
    wood: 30,
    stone: 0,
    morale: 70,
    foundedDay: 0,
    lastUpgradeDay: -10000,
    lastRaidDay: -10000,
    plagueDays: 0,
    famineDays: 0,
    immunityDays: 0,
    hungerDays: 0,
    ...overrides,
  };
}

export function makeState(
  world: World,
  civs: Civilization[],
  settlements: Settlement[],
): SimState {
  const n = civs.length;
  const relations: Relation[][] = Array.from({ length: n }, () => new Array<Relation>(n));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const rel: Relation = { score: 0, state: 'neutral', warDays: 0 };
      relations[i][j] = rel;
      relations[j][i] = rel;
    }
  }
  return {
    version: 1,
    seed: world.seed,
    time: 10,
    day: 10,
    world,
    civs,
    settlements,
    relations,
    chronicle: [],
    ruins: [],
    borders: [],
    terrainMods: [],
    terrainVersion: 0,
    territoryVersion: 0,
    nextSettlementId: 100,
    rngState: 1,
  };
}
