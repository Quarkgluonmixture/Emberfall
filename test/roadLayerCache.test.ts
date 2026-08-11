import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/core/types';
import { settlementTierSignature } from '../src/render/roadLayer';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

describe('road visual cache key', () => {
  it('changes when a settlement tier changes even if the road mask does not', () => {
    const settlement = makeSettlement(1, 0, 4, 4, { tier: 0 });
    const state = makeState(
      makeWorld(10, 10, Terrain.Grassland),
      [makeCiv(0)],
      [settlement],
    );
    const before = settlementTierSignature(state);
    settlement.tier = 2;
    expect(settlementTierSignature(state)).not.toBe(before);
  });
});
