import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { RNG } from '../src/core/rng';
import { Terrain } from '../src/core/types';
import { collapseCheck, maybeFamine, updateAfflictions } from '../src/sim/events';
import { Simulation } from '../src/sim/simulation';
import { serializeState } from '../src/persist/save';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

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
