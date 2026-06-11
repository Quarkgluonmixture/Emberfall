import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/core/types';
import { findRoadPath, recomputeRoads } from '../src/sim/roads';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

describe('roads', () => {
  it('A* routes around impassable water through a land gap', () => {
    const world = makeWorld(40, 20, Terrain.Grassland);
    // Vertical ocean wall at x=20 with a single gap at y=10.
    for (let y = 0; y < 20; y++) {
      if (y !== 10) world.terrain[y * 40 + 20] = Terrain.Ocean;
    }
    const state = makeState(world, [makeCiv(0)], []);
    const path = findRoadPath(state, state.roads, 5, 10, 35, 10);
    expect(path).not.toBeNull();
    expect(path![0]).toBe(10 * 40 + 5);
    expect(path![path!.length - 1]).toBe(10 * 40 + 35);
    // Must pass through the gap tile.
    expect(path).toContain(10 * 40 + 20);
    // Never steps on ocean.
    for (const i of path!) expect(world.terrain[i]).not.toBe(Terrain.Ocean);
  });

  it('links a civ’s settlements into one network and bumps the version once', () => {
    const world = makeWorld(60, 20, Terrain.Grassland);
    const state = makeState(
      world,
      [makeCiv(0)],
      [makeSettlement(1, 0, 5, 10), makeSettlement(2, 0, 25, 10), makeSettlement(3, 0, 45, 10)],
    );
    recomputeRoads(state);
    expect(state.roadsVersion).toBe(1);
    expect(state.roadPaths.length).toBe(2);
    let tiles = 0;
    for (const v of state.roads) if (v > 0) tiles++;
    expect(tiles).toBeGreaterThanOrEqual(40); // spans both gaps

    // Unchanged world → same network, no version churn.
    recomputeRoads(state);
    expect(state.roadsVersion).toBe(1);
  });

  it('adds an inter-civ road only when the pair trades', () => {
    const world = makeWorld(40, 20, Terrain.Grassland);
    const state = makeState(
      world,
      [makeCiv(0), makeCiv(1)],
      [makeSettlement(1, 0, 5, 10), makeSettlement(2, 1, 30, 10)],
    );
    recomputeRoads(state);
    expect(state.roadPaths.length).toBe(0);
    expect(state.roadsVersion).toBe(0); // nothing built, no churn

    state.relations[0][1].state = 'trade';
    recomputeRoads(state);
    expect(state.roadPaths.length).toBe(1);
    expect(state.roadsVersion).toBe(1);
  });

  it('is deterministic for identical state', () => {
    const world = makeWorld(50, 30, Terrain.Grassland);
    for (let x = 0; x < 50; x++) world.terrain[14 * 50 + x] = Terrain.River;
    const mk = () =>
      makeState(
        world,
        [makeCiv(0)],
        [makeSettlement(1, 0, 10, 5), makeSettlement(2, 0, 40, 25), makeSettlement(3, 0, 12, 26)],
      );
    const a = mk();
    const b = mk();
    recomputeRoads(a);
    recomputeRoads(b);
    expect([...a.roads]).toEqual([...b.roads]);
    expect(a.roadPaths).toEqual(b.roadPaths);
  });
});
