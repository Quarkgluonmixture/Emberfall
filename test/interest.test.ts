import { describe, expect, it } from 'vitest';
import { RNG } from '../src/core/rng';
import { Terrain } from '../src/core/types';
import { ambientTargets, eventTargets, pickNextTarget } from '../src/showcase/interest';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

function entry(kind: string, importance: 1 | 2 | 3, day: number, x?: number, y?: number) {
  return { kind, importance, day, year: 1, season: 0 as const, text: kind, civId: 0, x, y };
}

describe('interest scoring', () => {
  it('turns located chronicle entries into targets and skips unlocated ones', () => {
    const state = makeState(makeWorld(40, 40, Terrain.Grassland), [makeCiv(0)], []);
    state.day = 12;
    state.chronicle.push(entry('capture', 3, 11, 5, 6), entry('warDeclared', 3, 11));
    const targets = eventTargets(state, 0);
    expect(targets.length).toBe(1);
    expect(targets[0].kind).toBe('capture');
    expect(targets[0].x).toBe(5);
  });

  it('weights dramatic events above minor ones and decays with age', () => {
    const state = makeState(makeWorld(40, 40, Terrain.Grassland), [makeCiv(0)], []);
    state.day = 20;
    state.chronicle.push(entry('capture', 3, 20, 1, 1), entry('flood', 1, 20, 2, 2));
    const [capture, flood] = eventTargets(state, 0);
    expect(capture.score).toBeGreaterThan(flood.score);

    const freshState = makeState(makeWorld(40, 40, Terrain.Grassland), [makeCiv(0)], []);
    freshState.day = 20;
    freshState.chronicle.push(entry('capture', 3, 20, 1, 1));
    const staleState = makeState(makeWorld(40, 40, Terrain.Grassland), [makeCiv(0)], []);
    staleState.day = 45;
    staleState.chronicle.push(entry('capture', 3, 20, 1, 1));
    const freshTarget = eventTargets(freshState, 0)[0];
    const staleTarget = eventTargets(staleState, 0)[0];
    expect(freshTarget.score).toBeGreaterThan(staleTarget.score);
  });

  it('ignores entries older than the age window', () => {
    const state = makeState(makeWorld(40, 40, Terrain.Grassland), [makeCiv(0)], []);
    state.day = 100;
    state.chronicle.push(entry('capture', 3, 10, 1, 1));
    expect(eventTargets(state, 0, 30).length).toBe(0);
  });

  it('offers civ capitals, war frontiers and a wide shot as ambient targets', () => {
    const civs = [makeCiv(0), makeCiv(1)];
    const settlements = [
      makeSettlement(1, 0, 5, 5, { population: 40 }),
      makeSettlement(2, 0, 8, 8, { population: 10 }),
      makeSettlement(3, 1, 25, 25, { population: 30 }),
    ];
    const state = makeState(makeWorld(40, 40, Terrain.Grassland), civs, settlements);
    state.relations[0][1].state = 'war';
    const targets = ambientTargets(state);
    const kinds = targets.map((t) => t.kind);
    expect(kinds.filter((k) => k === 'capital').length).toBe(2);
    expect(kinds).toContain('frontier');
    expect(kinds).toContain('wide');
    // Capital of civ 0 is its largest settlement.
    const capital = targets.find((t) => t.kind === 'capital');
    expect(capital?.x).toBe(5);
    // Frontier is the midpoint of the closest settlement pair.
    const frontier = targets.find((t) => t.kind === 'frontier');
    expect(frontier?.x).toBe(Math.round((8 + 25) / 2));
  });

  it('always picks some target for a living world', () => {
    const state = makeState(
      makeWorld(40, 40, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 10, 10)],
    );
    const target = pickNextTarget(state, new RNG(1), 0, 0);
    expect(target).not.toBeNull();
  });
});
