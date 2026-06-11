/**
 * Master simulation orchestrator. Owns the single deterministic RNG stream and
 * runs all daily systems in a fixed order. No rendering concerns live here.
 */
import { BALANCE } from '../config/balance';
import { RNG } from '../core/rng';
import type { SimState } from '../core/types';
import { generateWorld } from '../world/worldgen';
import { pushEvent } from './chronicle';
import { civsAtWarWith, hasTradePartner, initialRelations, updateDiplomacy } from './diplomacy';
import { generateDailyEvents } from './events';
import { foundCivilizations } from './founding';
import { updateSettlementGrowth } from './growth';
import { accrueCivResources, updateSettlementResources } from './resources';
import { recomputeRoads } from './roads';
import { recomputeTerritory } from './territory';
import { seasonOf } from './time';
import { updateTreaties } from './treaties';

export const SAVE_VERSION = 1;

export class Simulation {
  state: SimState;
  rng: RNG;
  /** EWMA of per-system tick cost in ms, for the debug overlay. */
  timings: Record<string, number> = {};
  lastTickMs = 0;

  constructor(state: SimState) {
    this.state = state;
    this.rng = new RNG(state.seed);
    this.rng.setState(state.rngState);
  }

  /** Build a brand-new world and its founding civilizations. */
  static create(seed: number): Simulation {
    const world = generateWorld(seed);
    const state: SimState = {
      version: SAVE_VERSION,
      seed,
      time: 0,
      day: 0,
      world,
      civs: [],
      settlements: [],
      relations: [],
      chronicle: [],
      ruins: [],
      borders: [],
      terrainMods: [],
      terrainVersion: 0,
      territoryVersion: 0,
      nextSettlementId: 1,
      rngState: new RNG(seed).state(),
      lastRebirthDay: 0,
      roads: new Uint8Array(world.width * world.height),
      roadsVersion: 0,
      roadPaths: [],
    };
    const sim = new Simulation(state);
    foundCivilizations(state, sim.rng);
    state.relations = initialRelations(state.civs, sim.rng);
    recomputeTerritory(state);
    recomputeRoads(state);
    state.rngState = sim.rng.state();
    return sim;
  }

  totalPopulation(civId: number): number {
    let total = 0;
    for (const s of this.state.settlements) {
      if (s.civId === civId) total += s.population;
    }
    return total;
  }

  /** Advance fractional days; whole-day boundaries trigger daily ticks. */
  advance(deltaDays: number): void {
    const target = this.state.time + deltaDays;
    while (this.state.day < Math.floor(target)) {
      this.state.day++;
      this.dayTick();
    }
    this.state.time = target;
  }

  private timed(name: string, fn: () => void): void {
    const t0 = performance.now();
    fn();
    const ms = performance.now() - t0;
    this.timings[name] = (this.timings[name] ?? ms) * 0.9 + ms * 0.1;
  }

  dayTick(): void {
    const t0 = performance.now();
    const state = this.state;
    const rng = this.rng;
    const season = seasonOf(state.day);
    const starving = new Set<number>();

    this.timed('resources', () => {
      const tradeCache = state.civs.map((c) => c.alive && hasTradePartner(state, c.id));
      for (const s of state.settlements) {
        const civ = state.civs[s.civId];
        const r = updateSettlementResources(s, state.world, civ, {
          season,
          hasTradePartner: tradeCache[s.civId],
        });
        if (r.starving) starving.add(s.id);
      }
    });

    this.timed('growth', () => {
      for (const s of state.settlements) {
        const civ = state.civs[s.civId];
        const result = updateSettlementGrowth(s, civ, starving.has(s.id));
        if (result.upgraded) {
          s.lastUpgradeDay = state.day;
          pushEvent(state, rng, result.upgraded, 2, s.civId, {
            name: s.name,
            pop: Math.round(s.population),
            civ: civ.name,
            x: s.x,
            y: s.y,
          });
        }
      }
    });

    this.timed('events', () => generateDailyEvents(state, rng));

    this.timed('treaties', () => updateTreaties(state, rng));

    this.timed('diplomacy', () => {
      const transitions = updateDiplomacy(state, rng);
      for (const t of transitions) {
        const importance = t.kind === 'warDeclared' ? 3 : t.kind === 'relationsCooled' ? 1 : 2;
        const mid = this.frontierMidpoint(t.a, t.b);
        pushEvent(state, rng, t.kind, importance, t.a, {
          civ: state.civs[t.a].name,
          otherCiv: state.civs[t.b].name,
          x: mid?.x,
          y: mid?.y,
        });
      }
      this.updateMilitary();
    });

    if (state.day % BALANCE.territory.recalcDays === 0) {
      this.timed('territory', () => recomputeTerritory(state));
    }
    if (state.day % BALANCE.roads.recalcDays === 0) {
      this.timed('roads', () => recomputeRoads(state));
    }

    const settlementCounts = new Map<number, number>();
    for (const s of state.settlements) {
      settlementCounts.set(s.civId, (settlementCounts.get(s.civId) ?? 0) + 1);
    }
    for (const civ of state.civs) {
      if (!civ.alive) continue;
      if (civ.goldenAgeDays > 0) civ.goldenAgeDays--;
      if (civ.goldenCooldown > 0) civ.goldenCooldown--;
      if (civ.crisisDays > 0) civ.crisisDays--;
      accrueCivResources(civ, this.totalPopulation(civ.id));
      // Morale floors: reborn peoples in their grace years, and any cornered
      // civ down to its last hearths, do not despair into abandonment.
      const inGrace =
        civ.foundedDay > 0 && state.day - civ.foundedDay < BALANCE.rebirth.graceDays;
      const lastStand = (settlementCounts.get(civ.id) ?? 0) <= 2;
      const floor = inGrace
        ? BALANCE.rebirth.graceMoraleFloor
        : lastStand
          ? BALANCE.rebirth.lastStandMoraleFloor
          : 0;
      if (floor > 0) {
        for (const s of state.settlements) {
          if (s.civId === civ.id && s.morale < floor) s.morale = floor;
        }
      }
    }

    state.rngState = rng.state();
    this.lastTickMs = performance.now() - t0;
  }

  /** Midpoint of the closest settlement pair between two civs (their frontier). */
  private frontierMidpoint(a: number, b: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestD2 = Infinity;
    for (const sa of this.state.settlements) {
      if (sa.civId !== a) continue;
      for (const sb of this.state.settlements) {
        if (sb.civId !== b) continue;
        const d2 = (sa.x - sb.x) ** 2 + (sa.y - sb.y) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = { x: Math.round((sa.x + sb.x) / 2), y: Math.round((sa.y + sb.y) / 2) };
        }
      }
    }
    return best;
  }

  /** Military strength trends toward a population-derived target; war erodes it. */
  private updateMilitary(): void {
    const state = this.state;
    const m = BALANCE.military;
    for (const civ of state.civs) {
      if (!civ.alive) continue;
      let target = this.totalPopulation(civ.id) * m.perPop;
      if (civ.traits.includes('warlike')) target *= m.warlikeMult;
      if (civ.crisisDays > 0) target *= m.crisisMult;
      civ.military += (target - civ.military) * 0.02;
      if (civsAtWarWith(state, civ.id).length > 0) {
        civ.military *= 1 - BALANCE.diplomacy.warAttrition;
        for (const s of state.settlements) {
          if (s.civId === civ.id) {
            s.morale = Math.max(0, s.morale - BALANCE.diplomacy.warMoraleLoss);
          }
        }
      }
    }
  }
}
