/**
 * Emergent events: famine, plague, migration, border conflict, succession
 * crisis, religious schism, wildfire, flood, golden age, settlement collapse.
 * All randomness flows through the simulation RNG → fully deterministic.
 */
import { BALANCE } from '../config/balance';
import { GOLDEN_AGE_FLAVORS, TRAIT_EFFECTS } from '../config/civConfig';
import type { RNG } from '../core/rng';
import { MAX_CIVS, Terrain, type Settlement, type SimState } from '../core/types';
import { inBounds, nearTerrain } from '../world/world';
import { pushEvent } from './chronicle';
import { foundSettlement, scoreSite } from './founding';
import { recomputeTerritory } from './territory';
import { isFirstDayOfSpring, seasonOf, yearOf } from './time';

/** Mutate terrain and record the diff so saves can replay it onto a fresh world. */
function setTerrainMod(state: SimState, tileIndex: number, terrain: Terrain): void {
  state.world.terrain[tileIndex] = terrain;
  state.terrainMods.push([tileIndex, terrain]);
  if (state.terrainMods.length > 6000) {
    const compact = new Map<number, number>();
    for (const [k, v] of state.terrainMods) compact.set(k, v);
    state.terrainMods = [...compact.entries()];
  }
}

/** Progress ongoing plagues and famines; emit recovery entries when they end. */
export function updateAfflictions(state: SimState, rng: RNG): void {
  const e = BALANCE.events;
  for (const s of state.settlements) {
    if (s.immunityDays > 0) s.immunityDays--;
    if (s.plagueDays > 0) {
      s.population -= s.population * BALANCE.growth.plagueDeathRate;
      s.plagueDays--;
      if (s.plagueDays === 0) {
        s.immunityDays = e.plagueImmunityDays;
        pushEvent(state, rng, 'plagueEnd', 1, s.civId, { name: s.name });
      } else {
        for (const other of state.settlements) {
          if (other.id === s.id || other.plagueDays > 0 || other.immunityDays > 0) continue;
          const d2 = (other.x - s.x) ** 2 + (other.y - s.y) ** 2;
          if (d2 > e.plagueSpreadRange ** 2) continue;
          if (rng.chance(e.plagueSpreadChance)) {
            other.plagueDays = rng.int(e.plagueDurationMin, e.plagueDurationMax);
            pushEvent(state, rng, 'plague', 2, other.civId, { name: other.name });
          }
        }
      }
    }
    if (s.famineDays > 0) {
      s.morale = Math.max(0, s.morale - e.famineMoraleLoss);
      s.famineDays--;
      if (s.famineDays === 0) {
        pushEvent(state, rng, 'famineEnd', 1, s.civId, { name: s.name });
      }
    }
  }
}

export function maybeFamine(state: SimState, s: Settlement, rng: RNG): void {
  const e = BALANCE.events;
  if (s.famineDays === 0 && s.hungerDays >= e.famineHungerDays) {
    s.famineDays = e.famineDuration;
    pushEvent(state, rng, 'famine', 2, s.civId, { name: s.name });
  }
}

export function maybePlague(state: SimState, s: Settlement, rng: RNG): void {
  const e = BALANCE.events;
  if (s.plagueDays === 0 && s.immunityDays === 0 && rng.chance(e.plagueChancePerPop * s.population)) {
    s.plagueDays = rng.int(e.plagueDurationMin, e.plagueDurationMax);
    pushEvent(state, rng, 'plague', 3, s.civId, { name: s.name });
  }
}

function findMigrationSite(
  state: SimState,
  from: Settlement,
  rng: RNG,
): { x: number; y: number } | null {
  const e = BALANCE.events;
  const w = state.world;
  let best: { x: number; y: number; score: number } | null = null;
  for (let dy = -e.migrationMaxRing; dy <= e.migrationMaxRing; dy += 2) {
    for (let dx = -e.migrationMaxRing; dx <= e.migrationMaxRing; dx += 2) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < e.migrationMinRing || d > e.migrationMaxRing) continue;
      const x = from.x + dx;
      const y = from.y + dy;
      if (!inBounds(w, x, y)) continue;
      const owner = w.owner[y * w.width + x];
      if (owner !== -1 && owner !== from.civId) continue;
      const sep2 = e.migrationMinSeparation ** 2;
      if (state.settlements.some((s) => (s.x - x) ** 2 + (s.y - y) ** 2 < sep2)) continue;
      const sc = scoreSite(w, x, y);
      if (sc <= 6) continue;
      const jittered = sc * rng.range(0.9, 1.1);
      if (!best || jittered > best.score) best = { x, y, score: jittered };
    }
  }
  return best;
}

export function maybeMigration(state: SimState, rng: RNG): void {
  const e = BALANCE.events;
  for (const s of [...state.settlements]) {
    if (s.population < e.migrationMinPop) continue;
    const crowded = s.population >= BALANCE.growth.tierPopCap[s.tier] * e.migrationCrowding;
    const pressured = crowded || s.famineDays > 0 || s.plagueDays > 0;
    if (!pressured) continue;
    if (s.food < e.migrationFoodCost || s.wood < e.migrationWoodCost) continue;
    const civ = state.civs[s.civId];
    let chance = e.migrationChance;
    if (civ.traits.includes('nomadic')) chance *= TRAIT_EFFECTS.nomadicMigration;
    if (!rng.chance(chance)) continue;
    const site = findMigrationSite(state, s, rng);
    if (!site) continue;
    s.food -= e.migrationFoodCost;
    s.wood -= e.migrationWoodCost;
    const moved = s.population * e.migrationPopFraction;
    s.population -= moved;
    const colony = foundSettlement(state, s.civId, site.x, site.y, moved, rng, {
      food: e.migrationFoodCost,
      wood: e.migrationWoodCost,
    });
    pushEvent(state, rng, 'migration', 2, s.civId, { name: s.name, other: colony.name });
  }
}

/** Skirmishes and settlement captures along borders between warring civs. */
export function warEvents(state: SimState, rng: RNG): void {
  const e = BALANCE.events;
  for (const key of state.borders) {
    const i = Math.floor(key / MAX_CIVS);
    const j = key % MAX_CIVS;
    const a = state.civs[i];
    const b = state.civs[j];
    if (!a || !b || !a.alive || !b.alive) continue;
    const rel = state.relations[i][j];
    if (rel.state !== 'war') continue;
    if (!rng.chance(e.borderConflictChance)) continue;

    const attacker = a.military >= b.military ? a : b;
    const defender = attacker === a ? b : a;
    attacker.military *= 1 - e.skirmishMilitaryLoss * 0.6;
    defender.military *= 1 - e.skirmishMilitaryLoss;

    // The defender settlement closest to any attacker settlement takes the hit.
    let target: Settlement | null = null;
    let bestD2 = Infinity;
    for (const ds of state.settlements) {
      if (ds.civId !== defender.id) continue;
      for (const as of state.settlements) {
        if (as.civId !== attacker.id) continue;
        const d2 = (ds.x - as.x) ** 2 + (ds.y - as.y) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          target = ds;
        }
      }
    }
    if (!target) continue;
    target.population -= target.population * e.skirmishPopLoss;
    target.morale = Math.max(0, target.morale - e.skirmishMoraleLoss);
    target.lastRaidDay = state.day;
    rel.score = Math.max(-100, rel.score - e.skirmishRelationHit);
    pushEvent(state, rng, 'skirmish', 2, attacker.id, {
      civ: attacker.name,
      otherCiv: defender.name,
      name: target.name,
    });

    if (attacker.military > e.captureRatio * defender.military && rng.chance(e.captureChance)) {
      target.civId = attacker.id;
      target.morale = 40;
      target.population -= target.population * e.capturePopLoss;
      pushEvent(state, rng, 'capture', 3, attacker.id, { name: target.name, civ: attacker.name });
      recomputeTerritory(state);
    }
  }
}

export function maybeSuccessionCrisis(state: SimState, rng: RNG): void {
  const e = BALANCE.events;
  for (const civ of state.civs) {
    if (!civ.alive || civ.crisisDays > 0) continue;
    if (!rng.chance(e.successionChance)) continue;
    civ.crisisDays = e.successionDuration;
    for (const s of state.settlements) {
      if (s.civId === civ.id) s.morale = Math.max(0, s.morale - e.successionMoraleLoss);
    }
    pushEvent(state, rng, 'succession', 2, civ.id, { civ: civ.name });
  }
}

export function maybeSchism(state: SimState, rng: RNG): void {
  const e = BALANCE.events;
  for (const civ of state.civs) {
    if (!civ.alive || civ.faith < e.schismMinFaith) continue;
    if (!rng.chance(e.schismChance)) continue;
    civ.faith *= e.schismFaithKeep;
    for (const s of state.settlements) {
      if (s.civId === civ.id) s.morale = Math.max(0, s.morale - e.schismMoraleLoss);
    }
    for (const other of state.civs) {
      if (other.id === civ.id || !other.alive || !other.traits.includes('devout')) continue;
      const rel = state.relations[civ.id][other.id];
      if (rel && rel.score > 0) rel.score = Math.max(-100, rel.score - e.schismRelationHit);
    }
    pushEvent(state, rng, 'schism', 2, civ.id, { civ: civ.name });
  }
}

export function maybeWildfire(state: SimState, rng: RNG): void {
  if (seasonOf(state.day) !== 1) return; // summer only
  const e = BALANCE.events;
  if (!rng.chance(e.wildfireChance)) return;
  const world = state.world;

  let start = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = rng.int(0, world.width - 1);
    const y = rng.int(0, world.height - 1);
    const i = y * world.width + x;
    if (world.terrain[i] === Terrain.Forest) {
      start = i;
      break;
    }
  }
  if (start < 0) return;

  const targetSize = rng.int(e.wildfireMinTiles, e.wildfireMaxTiles);
  const queue = [start];
  const seen = new Set<number>([start]);
  const burned: number[] = [];
  while (queue.length > 0 && burned.length < targetSize) {
    const cur = queue.shift()!;
    if (world.terrain[cur] !== Terrain.Forest) continue;
    burned.push(cur);
    const x = cur % world.width;
    const y = Math.floor(cur / world.width);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (!inBounds(world, nx, ny)) continue;
      const ni = ny * world.width + nx;
      if (!seen.has(ni)) {
        seen.add(ni);
        queue.push(ni);
      }
    }
  }
  if (burned.length === 0) return;
  for (const i of burned) setTerrainMod(state, i, Terrain.Grassland);
  state.terrainVersion++;

  const bx = start % world.width;
  const by = Math.floor(start / world.width);
  let near: Settlement | null = null;
  let nearDist = Infinity;
  for (const s of state.settlements) {
    const d = Math.sqrt((s.x - bx) ** 2 + (s.y - by) ** 2);
    if (d < nearDist) {
      nearDist = d;
      near = s;
    }
  }
  if (near && nearDist <= e.wildfireNearSettlement) {
    near.wood *= 1 - e.wildfireWoodLossFraction;
    near.morale = Math.max(0, near.morale - e.wildfireMoraleLoss);
    pushEvent(state, rng, 'wildfire', 2, near.civId, { name: near.name });
  } else {
    pushEvent(state, rng, 'wildfireWild', 1, -1, {});
  }
}

/** Once a year (first day of spring) some grassland beside forests regrows. */
export function regrowForests(state: SimState, rng: RNG): void {
  if (!isFirstDayOfSpring(state.day)) return;
  const world = state.world;
  let changed = 0;
  for (let attempt = 0; attempt < BALANCE.events.regrowthTiles; attempt++) {
    const x = rng.int(1, world.width - 2);
    const y = rng.int(1, world.height - 2);
    const i = y * world.width + x;
    if (world.terrain[i] !== Terrain.Grassland) continue;
    let forestNeighbors = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (world.terrain[i + dy * world.width + dx] === Terrain.Forest) forestNeighbors++;
      }
    }
    if (forestNeighbors >= 2) {
      setTerrainMod(state, i, Terrain.Forest);
      changed++;
    }
  }
  if (changed > 0) state.terrainVersion++;
}

export function maybeFlood(state: SimState, rng: RNG): void {
  if (seasonOf(state.day) !== 0) return; // spring melt
  const e = BALANCE.events;
  for (const s of state.settlements) {
    if (!nearTerrain(state.world, s.x, s.y, e.floodRiverRange, Terrain.River)) continue;
    if (!rng.chance(e.floodChance)) continue;
    s.food *= e.floodFoodKeep;
    s.wood *= e.floodWoodKeep;
    s.morale = Math.max(0, s.morale - e.floodMoraleLoss);
    pushEvent(state, rng, 'flood', 1, s.civId, { name: s.name });
  }
}

export function maybeGoldenAge(state: SimState, rng: RNG): void {
  const e = BALANCE.events;
  for (const civ of state.civs) {
    if (!civ.alive || civ.goldenAgeDays > 0 || civ.goldenCooldown > 0 || civ.crisisDays > 0) {
      continue;
    }
    const towns = state.settlements.filter((s) => s.civId === civ.id);
    if (towns.length === 0) continue;
    const prosperous = towns.every(
      (s) => s.hungerDays === 0 && s.famineDays === 0 && s.plagueDays === 0,
    );
    if (!prosperous) continue;
    if (!rng.chance(e.goldenAgeChance)) continue;
    civ.goldenAgeDays = e.goldenAgeDuration;
    civ.goldenCooldown = e.goldenAgeCooldown;
    pushEvent(state, rng, 'goldenAge', 3, civ.id, {
      civ: civ.name,
      flavor: rng.pick(GOLDEN_AGE_FLAVORS),
    });
  }
}

/** Random diplomatic incidents that nudge relation scores. */
export function diplomaticIncidents(state: SimState, rng: RNG): void {
  const d = BALANCE.diplomacy;
  for (let i = 0; i < state.civs.length; i++) {
    for (let j = i + 1; j < state.civs.length; j++) {
      if (!state.civs[i].alive || !state.civs[j].alive) continue;
      if (!rng.chance(d.incidentChance)) continue;
      const magnitude = rng.range(d.incidentMagnitudeMin, d.incidentMagnitudeMax);
      const bad = rng.chance(0.6);
      const rel = state.relations[i][j];
      rel.score = Math.min(100, Math.max(-100, rel.score + (bad ? -magnitude : magnitude)));
      if (magnitude > 5) {
        pushEvent(state, rng, bad ? 'incidentBad' : 'incidentGood', 1, i, {
          civ: state.civs[i].name,
          otherCiv: state.civs[j].name,
        });
      }
    }
  }
}

/** Abandon dying settlements; a civ with no settlements falls. */
export function collapseCheck(state: SimState, rng: RNG): void {
  const cfg = BALANCE.growth;
  const dead = state.settlements.filter(
    (s) => s.population < cfg.collapsePop || s.morale <= cfg.collapseMorale,
  );
  if (dead.length === 0) return;
  for (const s of dead) {
    pushEvent(state, rng, 'collapse', 3, s.civId, { name: s.name });
  }
  const deadIds = new Set(dead.map((s) => s.id));
  state.settlements = state.settlements.filter((s) => !deadIds.has(s.id));
  for (const civ of state.civs) {
    if (civ.alive && !state.settlements.some((s) => s.civId === civ.id)) {
      civ.alive = false;
      civ.fallenYear = yearOf(state.day);
      civ.military = 0;
      pushEvent(state, rng, 'civFell', 3, civ.id, { civ: civ.name });
    }
  }
  recomputeTerritory(state);
}

/** Run all event systems for the current day. */
export function generateDailyEvents(state: SimState, rng: RNG): void {
  updateAfflictions(state, rng);
  for (const s of state.settlements) {
    maybeFamine(state, s, rng);
    maybePlague(state, s, rng);
  }
  maybeMigration(state, rng);
  diplomaticIncidents(state, rng);
  warEvents(state, rng);
  maybeSuccessionCrisis(state, rng);
  maybeSchism(state, rng);
  maybeGoldenAge(state, rng);
  maybeWildfire(state, rng);
  regrowForests(state, rng);
  maybeFlood(state, rng);
  collapseCheck(state, rng);
}
