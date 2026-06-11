import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { Terrain } from '../src/core/types';
import { accrueCivResources, gatherYields, updateSettlementResources } from '../src/sim/resources';
import { makeCiv, makeSettlement, makeWorld } from './util';

describe('resources', () => {
  it('sums tile yields within the gather radius', () => {
    const world = makeWorld(20, 20, Terrain.Grassland);
    const y = gatherYields(world, 10, 10, BALANCE.resources.gatherRadius);
    expect(y.food).toBeGreaterThan(20); // 29 grassland tiles × 1.0 food
    expect(y.wood).toBeGreaterThan(0);
  });

  it('produces a food surplus on fertile land', () => {
    const world = makeWorld(20, 20, Terrain.Grassland);
    const s = makeSettlement(1, 0, 10, 10, { food: 50 });
    const civ = makeCiv(0);
    const { starving } = updateSettlementResources(s, world, civ, {
      season: 0,
      hasTradePartner: false,
    });
    expect(starving).toBe(false);
    expect(s.food).toBeGreaterThan(50);
  });

  it('starves settlements on barren land once stores run out', () => {
    const world = makeWorld(20, 20, Terrain.Desert);
    const s = makeSettlement(1, 0, 10, 10, { food: 0 });
    const civ = makeCiv(0);
    const { starving } = updateSettlementResources(s, world, civ, {
      season: 0,
      hasTradePartner: false,
    });
    expect(starving).toBe(true);
    expect(s.food).toBe(0);
  });

  it('respects storage caps', () => {
    const world = makeWorld(20, 20, Terrain.Grassland);
    const cap = BALANCE.resources.foodStorage[0];
    const s = makeSettlement(1, 0, 10, 10, { food: cap });
    updateSettlementResources(s, world, makeCiv(0), { season: 1, hasTradePartner: false });
    expect(s.food).toBeLessThanOrEqual(cap);
  });

  it('produces less food in winter than in summer', () => {
    const world = makeWorld(20, 20, Terrain.Grassland);
    const summer = makeSettlement(1, 0, 10, 10, { food: 100 });
    const winter = makeSettlement(2, 0, 10, 10, { food: 100 });
    updateSettlementResources(summer, world, makeCiv(0), { season: 1, hasTradePartner: false });
    updateSettlementResources(winter, world, makeCiv(0), { season: 3, hasTradePartner: false });
    expect(summer.food).toBeGreaterThan(winter.food);
  });

  it('accrues civ knowledge, faith and culture from population', () => {
    const civ = makeCiv(0);
    accrueCivResources(civ, 100);
    expect(civ.knowledge).toBeGreaterThan(0);
    expect(civ.faith).toBeGreaterThan(0);
    expect(civ.culture).toBeGreaterThan(0);
  });

  it('scholarly civs accrue knowledge faster', () => {
    const plain = makeCiv(0);
    const scholar = makeCiv(1, { traits: ['scholarly'] });
    accrueCivResources(plain, 100);
    accrueCivResources(scholar, 100);
    expect(scholar.knowledge).toBeGreaterThan(plain.knowledge);
  });
});
