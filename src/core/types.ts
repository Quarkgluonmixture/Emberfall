/** Shared data types. Simulation state is plain data — serializable, Pixi-free. */

export enum Terrain {
  Ocean = 0,
  Coast = 1,
  Grassland = 2,
  Forest = 3,
  Mountain = 4,
  River = 5,
  Swamp = 6,
  Desert = 7,
  Tundra = 8,
}

export const TERRAIN_COUNT = 9;

/** 0 spring, 1 summer, 2 autumn, 3 winter */
export type Season = 0 | 1 | 2 | 3;

export interface World {
  width: number;
  height: number;
  seed: number;
  /** Terrain enum per tile, row-major. */
  terrain: Uint8Array;
  elevation: Float32Array;
  moisture: Float32Array;
  temperature: Float32Array;
  /** Owning civ id per tile, -1 for unclaimed. Derived; recomputed periodically. */
  owner: Int16Array;
}

/** 0 camp, 1 village, 2 town */
export type SettlementTier = 0 | 1 | 2;

export interface Settlement {
  id: number;
  civId: number;
  name: string;
  x: number;
  y: number;
  tier: SettlementTier;
  /** Fractional population; display rounded. */
  population: number;
  food: number;
  wood: number;
  stone: number;
  /** 0..100 */
  morale: number;
  foundedDay: number;
  lastUpgradeDay: number;
  lastRaidDay: number;
  /** Remaining affliction days (0 = none). */
  plagueDays: number;
  famineDays: number;
  /** Days of plague immunity remaining after an outbreak burns out. */
  immunityDays: number;
  /** Consecutive days of starvation, for famine escalation. */
  hungerDays: number;
}

export interface Civilization {
  id: number;
  name: string;
  color: number;
  alive: boolean;
  /** Year the civ fell, or -1. */
  fallenYear: number;
  traits: string[];
  knowledge: number;
  faith: number;
  culture: number;
  military: number;
  goldenAgeDays: number;
  goldenCooldown: number;
  crisisDays: number;
}

export type DiplomaticState = 'neutral' | 'trade' | 'alliance' | 'rivalry' | 'war';

export interface Relation {
  /** -100..100 */
  score: number;
  state: DiplomaticState;
  warDays: number;
}

export interface ChronicleEntry {
  day: number;
  year: number;
  season: Season;
  text: string;
  /** 1 minor, 2 notable, 3 historic */
  importance: 1 | 2 | 3;
  kind: string;
  civId: number;
}

export interface SimState {
  version: number;
  seed: number;
  /** Fractional days elapsed. */
  time: number;
  /** Completed whole days. */
  day: number;
  world: World;
  civs: Civilization[];
  settlements: Settlement[];
  /** relations[i][j] === relations[j][i] (shared object). relations[i][i] is unused. */
  relations: Relation[][];
  chronicle: ChronicleEntry[];
  /** Pair keys (i * MAX_CIVS + j, i < j) of civs sharing a border. Derived. */
  borders: number[];
  /** Terrain diffs [tileIndex, terrain] applied on top of the generated world. */
  terrainMods: [number, number][];
  /** Bumped when world.terrain changes so renderers rebuild. */
  terrainVersion: number;
  /** Bumped when world.owner changes. */
  territoryVersion: number;
  nextSettlementId: number;
  rngState: number;
}

export const MAX_CIVS = 16;

export function pairKey(a: number, b: number): number {
  const i = Math.min(a, b);
  const j = Math.max(a, b);
  return i * MAX_CIVS + j;
}
