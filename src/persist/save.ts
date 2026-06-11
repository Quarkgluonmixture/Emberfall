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
  RuinSite,
  Settlement,
  SimState,
} from '../core/types';
import { SAVE_VERSION, Simulation } from '../sim/simulation';
import { recomputeRoads } from '../sim/roads';
import { recomputeTerritory } from '../sim/territory';
import { generateWorld } from '../world/worldgen';

export const SAVE_KEY = 'emberfall:save:v1';
export const AUTOSAVE_KEY = 'emberfall:autosave:v1';

interface RelationPair {
  a: number;
  b: number;
  score: number;
  state: DiplomaticState;
  warDays: number;
  /** Treaty terms; absent in saves from before the treaty system. */
  truceDays?: number;
  tributeDays?: number;
  tributeFrom?: number;
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
  ruins: RuinSite[];
  terrainMods: [number, number][];
  /** Absent in saves from before the rebirth system. */
  lastRebirthDay?: number;
}

export function serializeState(state: SimState): string {
  const relationPairs: RelationPair[] = [];
  for (let i = 0; i < state.civs.length; i++) {
    for (let j = i + 1; j < state.civs.length; j++) {
      const rel = state.relations[i][j];
      relationPairs.push({
        a: i,
        b: j,
        score: rel.score,
        state: rel.state,
        warDays: rel.warDays,
        truceDays: rel.truceDays,
        tributeDays: rel.tributeDays,
        tributeFrom: rel.tributeFrom,
      });
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
    ruins: state.ruins,
    terrainMods: state.terrainMods,
    lastRebirthDay: state.lastRebirthDay,
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

  // Saves from before the rebirth system lack the founding day.
  for (const c of file.civs) c.foundedDay ??= 0;

  const n = file.civs.length;
  const relations: Relation[][] = Array.from({ length: n }, () => new Array<Relation>(n));
  for (const p of file.relationPairs) {
    const rel: Relation = {
      score: p.score,
      state: p.state,
      warDays: p.warDays,
      truceDays: p.truceDays,
      tributeDays: p.tributeDays,
      tributeFrom: p.tributeFrom,
    };
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
    ruins: file.ruins ?? [],
    borders: [],
    terrainMods: file.terrainMods,
    terrainVersion: 1,
    territoryVersion: 0,
    nextSettlementId: file.nextSettlementId,
    rngState: file.rngState,
    lastRebirthDay: file.lastRebirthDay ?? 0,
    roads: new Uint8Array(world.width * world.height),
    roadsVersion: 0,
    roadPaths: [],
  };
  recomputeTerritory(state);
  recomputeRoads(state);
  return state;
}

export function simulationFromSave(json: string): Simulation {
  return new Simulation(deserializeState(json));
}

export function saveToLocalStorage(state: SimState, key: string = SAVE_KEY): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, serializeState(state));
    // Timestamp lives beside the payload so save data itself stays deterministic.
    localStorage.setItem(`${key}:at`, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function loadFromLocalStorage(key: string = SAVE_KEY): Simulation | null {
  if (typeof localStorage === 'undefined') return null;
  const json = localStorage.getItem(key);
  if (!json) return null;
  try {
    return simulationFromSave(json);
  } catch {
    return null;
  }
}

/** The save slot (manual or auto) with the most recent timestamp. */
export function newestSaveKey(): string | null {
  if (typeof localStorage === 'undefined') return null;
  let best: string | null = null;
  let bestAt = -1;
  for (const key of [SAVE_KEY, AUTOSAVE_KEY]) {
    if (localStorage.getItem(key) === null) continue;
    const at = Number(localStorage.getItem(`${key}:at`) ?? 0);
    if (at > bestAt) {
      bestAt = at;
      best = key;
    }
  }
  return best;
}

export function hasSave(): boolean {
  return newestSaveKey() !== null;
}
