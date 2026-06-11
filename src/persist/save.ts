/**
 * Save/load. The world is regenerated from its seed on load and terrain diffs
 * are replayed, so save files stay small. Relations are stored as the upper
 * triangle and mirrored back into a symmetric matrix.
 */
import type {
  ChronicleEntry,
  Civilization,
  DiplomaticState,
  Relation,
  Settlement,
  SimState,
} from '../core/types';
import { SAVE_VERSION, Simulation } from '../sim/simulation';
import { recomputeTerritory } from '../sim/territory';
import { generateWorld } from '../world/worldgen';

export const SAVE_KEY = 'emberfall:save:v1';

interface RelationPair {
  a: number;
  b: number;
  score: number;
  state: DiplomaticState;
  warDays: number;
}

interface SaveFile {
  version: number;
  seed: number;
  time: number;
  day: number;
  rngState: number;
  nextSettlementId: number;
  civs: Civilization[];
  settlements: Settlement[];
  relationPairs: RelationPair[];
  chronicle: ChronicleEntry[];
  terrainMods: [number, number][];
}

export function serializeState(state: SimState): string {
  const relationPairs: RelationPair[] = [];
  for (let i = 0; i < state.civs.length; i++) {
    for (let j = i + 1; j < state.civs.length; j++) {
      const rel = state.relations[i][j];
      relationPairs.push({ a: i, b: j, score: rel.score, state: rel.state, warDays: rel.warDays });
    }
  }
  const file: SaveFile = {
    version: SAVE_VERSION,
    seed: state.seed,
    time: state.time,
    day: state.day,
    rngState: state.rngState,
    nextSettlementId: state.nextSettlementId,
    civs: state.civs,
    settlements: state.settlements,
    relationPairs,
    chronicle: state.chronicle,
    terrainMods: state.terrainMods,
  };
  return JSON.stringify(file);
}

export function deserializeState(json: string): SimState {
  const file = JSON.parse(json) as SaveFile;
  if (file.version !== SAVE_VERSION) {
    throw new Error(`Unsupported save version ${file.version}`);
  }
  const world = generateWorld(file.seed);
  for (const [i, t] of file.terrainMods) world.terrain[i] = t;

  const n = file.civs.length;
  const relations: Relation[][] = Array.from({ length: n }, () => new Array<Relation>(n));
  for (const p of file.relationPairs) {
    const rel: Relation = { score: p.score, state: p.state, warDays: p.warDays };
    relations[p.a][p.b] = rel;
    relations[p.b][p.a] = rel;
  }

  const state: SimState = {
    version: file.version,
    seed: file.seed,
    time: file.time,
    day: file.day,
    world,
    civs: file.civs,
    settlements: file.settlements,
    relations,
    chronicle: file.chronicle,
    borders: [],
    terrainMods: file.terrainMods,
    terrainVersion: 1,
    territoryVersion: 0,
    nextSettlementId: file.nextSettlementId,
    rngState: file.rngState,
  };
  recomputeTerritory(state);
  return state;
}

export function simulationFromSave(json: string): Simulation {
  return new Simulation(deserializeState(json));
}

export function saveToLocalStorage(state: SimState): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(SAVE_KEY, serializeState(state));
    return true;
  } catch {
    return false;
  }
}

export function loadFromLocalStorage(): Simulation | null {
  if (typeof localStorage === 'undefined') return null;
  const json = localStorage.getItem(SAVE_KEY);
  if (!json) return null;
  try {
    return simulationFromSave(json);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(SAVE_KEY) !== null;
}
