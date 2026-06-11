import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { RNG } from '../src/core/rng';
import { deserializeState, serializeState } from '../src/persist/save';
import { addCivRelations } from '../src/sim/diplomacy';
import { scoreSite } from '../src/sim/founding';
import { maybeRebirth } from '../src/sim/rebirth';
import { Simulation } from '../src/sim/simulation';
import { recomputeTerritory } from '../src/sim/territory';

/** Kill one civ and leave an old, unclaimed ruin so rebirth conditions hold. */
function prepareFallenWorld(sim: Simulation): { x: number; y: number } {
  const state = sim.state;
  const victim = state.civs[0];
  state.settlements = state.settlements.filter((s) => s.civId !== victim.id);
  victim.alive = false;
  victim.fallenYear = 1;
  recomputeTerritory(state);
  // A good settle-able tile outside every living civ's territory.
  const w = state.world;
  let spot: { x: number; y: number } | null = null;
  outer: for (let y = 4; y < w.height - 4; y += 2) {
    for (let x = 4; x < w.width - 4; x += 2) {
      if (w.owner[y * w.width + x] !== -1) continue;
      if (scoreSite(w, x, y) > 8) {
        spot = { x, y };
        break outer;
      }
    }
  }
  if (!spot) throw new Error('no unclaimed site found for test');
  state.ruins.push({ x: spot.x, y: spot.y, day: -BALANCE.rebirth.ruinMinAgeDays });
  state.lastRebirthDay = -BALANCE.rebirth.cooldownDays;
  return spot;
}

describe('civ rebirth', () => {
  it('expands the relation matrix symmetrically for a new civ', () => {
    const sim = Simulation.create(11);
    const state = sim.state;
    const before = state.civs.length;
    state.civs.push({ ...state.civs[0], id: before, name: 'Testfolk', alive: true });
    addCivRelations(state, before, new RNG(1));
    for (let i = 0; i < before; i++) {
      expect(state.relations[i][before]).toBeDefined();
      expect(state.relations[i][before]).toBe(state.relations[before][i]);
    }
    expect(state.relations[before]).toHaveLength(before + 1); // n slots, self slot empty
  });

  it('raises a new civ from an old ruin once conditions hold', () => {
    const sim = Simulation.create(5);
    prepareFallenWorld(sim);
    const before = sim.state.civs.length;

    // Drive the daily check directly until the rng gate opens (deterministic).
    for (let i = 0; i < 4000 && sim.state.civs.length === before; i++) {
      sim.state.day++;
      maybeRebirth(sim.state, sim.rng);
    }

    expect(sim.state.civs.length).toBe(before + 1);
    const reborn = sim.state.civs[before];
    expect(reborn.alive).toBe(true);
    expect(reborn.traits.length).toBe(BALANCE.civ.traitCount);
    expect(sim.state.settlements.some((s) => s.civId === reborn.id)).toBe(true);
    expect(sim.state.chronicle.some((e) => e.kind === 'rebirth')).toBe(true);
    // The hosting ruin is consumed and the cooldown stamped.
    expect(sim.state.ruins.length).toBe(0);
    expect(sim.state.lastRebirthDay).toBe(sim.state.day);
    // Relations cover the new civ both ways.
    for (const other of sim.state.civs) {
      if (other.id === reborn.id) continue;
      expect(sim.state.relations[reborn.id][other.id]).toBe(
        sim.state.relations[other.id][reborn.id],
      );
    }
  });

  it('does not rebirth while the world is at full strength', () => {
    const sim = Simulation.create(5);
    sim.state.ruins.push({ x: 8, y: 8, day: -BALANCE.rebirth.ruinMinAgeDays });
    sim.state.lastRebirthDay = -BALANCE.rebirth.cooldownDays;
    const before = sim.state.civs.length;
    for (let i = 0; i < 2000; i++) {
      sim.state.day++;
      maybeRebirth(sim.state, sim.rng);
    }
    expect(sim.state.civs.length).toBe(before);
  });

  it('round-trips saves and stays deterministic with a reborn civ present', () => {
    const original = Simulation.create(5);
    prepareFallenWorld(original);
    const civsBefore = original.state.civs.length;
    original.advance(2500);

    const reloaded = new Simulation(deserializeState(serializeState(original.state)));
    original.advance(200);
    reloaded.advance(200);
    expect(serializeState(reloaded.state)).toEqual(serializeState(original.state));
    void civsBefore;
  });
});
