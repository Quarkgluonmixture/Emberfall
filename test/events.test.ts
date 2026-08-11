import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { RNG } from '../src/core/rng';
import { Terrain } from '../src/core/types';
import { collapseCheck, maybeFamine, updateAfflictions, warEvents } from '../src/sim/events';
import { Simulation } from '../src/sim/simulation';
import { serializeState } from '../src/persist/save';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

function alwaysSpreadRng(): RNG {
  return {
    chance: () => true,
    int: (min: number) => min,
    next: () => 0,
  } as unknown as RNG;
}

function plagueChain(order: number[]) {
  const byId = new Map([
    [1, makeSettlement(1, 0, 5, 10, { population: 100, plagueDays: 2 })],
    [2, makeSettlement(2, 0, 15, 10, { population: 100 })],
    [3, makeSettlement(3, 0, 25, 10, { population: 100 })],
  ]);
  return makeState(
    makeWorld(40, 20, Terrain.Grassland),
    [makeCiv(0)],
    order.map((id) => byId.get(id)!),
  );
}

describe('events', () => {
  it('famine begins after sustained hunger', () => {
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 10, 10, { hungerDays: BALANCE.events.famineHungerDays })],
    );
    maybeFamine(state, state.settlements[0], new RNG(1));
    expect(state.settlements[0].famineDays).toBeGreaterThan(0);
    expect(state.chronicle.some((e) => e.kind === 'famine')).toBe(true);
  });

  it('plague kills population while it lasts and ends with an entry', () => {
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 10, 10, { population: 100, plagueDays: 1 })],
    );
    updateAfflictions(state, new RNG(1));
    expect(state.settlements[0].population).toBeLessThan(100);
    expect(state.settlements[0].plagueDays).toBe(0);
    expect(state.chronicle.some((e) => e.kind === 'plagueEnd')).toBe(true);
  });

  it('does not let a new plague infection die or spread again on the same day', () => {
    const state = plagueChain([1, 2, 3]);
    updateAfflictions(state, alwaysSpreadRng());
    const byId = new Map(state.settlements.map((s) => [s.id, s]));

    expect(byId.get(1)!.plagueDays).toBe(1);
    expect(byId.get(1)!.population).toBeLessThan(100);
    // Newly exposed B starts at the full configured minimum duration and takes
    // no mortality until tomorrow.
    expect(byId.get(2)!.plagueDays).toBe(BALANCE.events.plagueDurationMin);
    expect(byId.get(2)!.population).toBe(100);
    // C is outside A's range; B must not become a same-day relay.
    expect(byId.get(3)!.plagueDays).toBe(0);
    expect(state.chronicle.filter((e) => e.kind === 'plague').length).toBe(1);
  });

  it('plague progression is invariant to settlement array order', () => {
    const forward = plagueChain([1, 2, 3]);
    const reverse = plagueChain([3, 2, 1]);
    updateAfflictions(forward, alwaysSpreadRng());
    updateAfflictions(reverse, alwaysSpreadRng());

    const summary = (state: typeof forward) =>
      [...state.settlements]
        .sort((a, b) => a.id - b.id)
        .map((s) => [s.id, s.population, s.plagueDays, s.immunityDays]);
    expect(summary(reverse)).toEqual(summary(forward));
    expect(reverse.chronicle.map((e) => [e.kind, e.params?.name])).toEqual(
      forward.chronicle.map((e) => [e.kind, e.params?.name]),
    );
  });

  it('a final immunity day protects the full day before expiring', () => {
    const source = makeSettlement(1, 0, 5, 10, { plagueDays: 2 });
    const protectedTown = makeSettlement(2, 0, 10, 10, { immunityDays: 1 });
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [makeCiv(0)],
      [source, protectedTown],
    );
    updateAfflictions(state, alwaysSpreadRng());
    expect(protectedTown.immunityDays).toBe(0);
    expect(protectedTown.plagueDays).toBe(0);
  });

  it('collapses dying settlements and fells civs with nothing left', () => {
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 10, 10, { population: 1 })],
    );
    collapseCheck(state, new RNG(1));
    expect(state.settlements.length).toBe(0);
    expect(state.civs[0].alive).toBe(false);
    expect(state.chronicle.some((e) => e.kind === 'collapse')).toBe(true);
    expect(state.chronicle.some((e) => e.kind === 'civFell')).toBe(true);
  });

  it('fells a settlement-less civ even when no natural collapse happened that day', () => {
    const state = makeState(makeWorld(20, 20, Terrain.Grassland), [makeCiv(0)], []);
    collapseCheck(state, new RNG(1));

    expect(state.civs[0].alive).toBe(false);
    expect(state.civs[0].military).toBe(0);
    expect(state.chronicle.filter((e) => e.kind === 'civFell')).toHaveLength(1);
  });

  it('fells a defender immediately when its final settlement is captured', () => {
    const attacker = makeCiv(0, { military: 100 });
    const defender = makeCiv(1, { military: 1 });
    const target = makeSettlement(2, 1, 8, 10, { population: 20 });
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [attacker, defender],
      [makeSettlement(1, 0, 5, 10, { population: 20 }), target],
    );
    state.relations[0][1].state = 'war';
    state.borders = [1]; // pairKey(0, 1) with MAX_CIVS=16

    warEvents(state, alwaysSpreadRng());

    expect(target.civId).toBe(attacker.id);
    expect(defender.alive).toBe(false);
    expect(defender.military).toBe(0);
    expect(state.chronicle.map((e) => e.kind)).toContain('capture');
    expect(state.chronicle.filter((e) => e.kind === 'civFell')).toHaveLength(1);
  });

  it('event generation is fully deterministic for a given seed', () => {
    const a = Simulation.create(99);
    const b = Simulation.create(99);
    a.advance(400);
    b.advance(400);
    expect(serializeState(a.state)).toEqual(serializeState(b.state));
    expect(a.state.chronicle.map((e) => e.text)).toEqual(b.state.chronicle.map((e) => e.text));
  });

  it('a living world produces a varied chronicle over a decade', () => {
    const sim = Simulation.create(1337);
    sim.advance(1200); // 10 years
    const kinds = new Set(sim.state.chronicle.map((e) => e.kind));
    expect(sim.state.chronicle.length).toBeGreaterThan(10);
    // Founding always happens; beyond that at least some emergent variety.
    expect(kinds.has('founding')).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
  });
});
