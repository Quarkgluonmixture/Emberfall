import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/core/types';
import { decorOccupancySignature } from '../src/render/decorLayer';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

describe('decor occupancy cache', () => {
  it('tracks settlement footprint and ruin changes without keying on population', () => {
    const settlement = makeSettlement(1, 0, 4, 4, { population: 20, tier: 0 });
    const state = makeState(makeWorld(12, 12, Terrain.Grassland), [makeCiv(0)], [settlement]);
    const initial = decorOccupancySignature(state);

    settlement.population = 30;
    expect(decorOccupancySignature(state)).toBe(initial);

    settlement.tier = 1;
    const upgraded = decorOccupancySignature(state);
    expect(upgraded).not.toBe(initial);

    state.settlements.push(makeSettlement(2, 0, 7, 7));
    const expanded = decorOccupancySignature(state);
    expect(expanded).not.toBe(upgraded);

    state.ruins.push({ x: 9, y: 3, day: 100 });
    expect(decorOccupancySignature(state)).not.toBe(expanded);
  });
});
