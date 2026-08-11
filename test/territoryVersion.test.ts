import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/core/types';
import { recomputeTerritory } from '../src/sim/territory';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

describe('territory render invalidation', () => {
  it('does not churn territoryVersion when a scheduled recompute changes nothing', () => {
    const state = makeState(
      makeWorld(30, 30, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 15, 15)],
    );

    recomputeTerritory(state);
    expect(state.territoryVersion).toBe(1);
    const owner = [...state.world.owner];
    const borders = [...state.borders];

    recomputeTerritory(state);
    expect(state.territoryVersion).toBe(1);
    expect([...state.world.owner]).toEqual(owner);
    expect(state.borders).toEqual(borders);
  });

  it('bumps the version when a settlement footprint really changes', () => {
    const settlement = makeSettlement(1, 0, 15, 15, { tier: 0 });
    const state = makeState(
      makeWorld(30, 30, Terrain.Grassland),
      [makeCiv(0)],
      [settlement],
    );

    recomputeTerritory(state);
    const before = [...state.world.owner];
    settlement.tier = 2;
    recomputeTerritory(state);

    expect(state.territoryVersion).toBe(2);
    expect([...state.world.owner]).not.toEqual(before);
  });
});
