import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { updateSettlementGrowth } from '../src/sim/growth';
import { makeCiv, makeSettlement } from './util';

describe('settlement growth', () => {
  it('grows population when fed', () => {
    const s = makeSettlement(1, 0, 5, 5, { population: 10, food: 100 });
    updateSettlementGrowth(s, makeCiv(0), false);
    expect(s.population).toBeGreaterThan(10);
  });

  it('shrinks population and morale while starving', () => {
    const s = makeSettlement(1, 0, 5, 5, { population: 10, food: 0, morale: 70 });
    updateSettlementGrowth(s, makeCiv(0), true);
    expect(s.population).toBeLessThan(10);
    expect(s.morale).toBeLessThan(70);
    expect(s.hungerDays).toBe(1);
  });

  it('upgrades a camp to a village at the population and wood thresholds', () => {
    const cfg = BALANCE.growth;
    const s = makeSettlement(1, 0, 5, 5, {
      population: cfg.villagePop,
      wood: cfg.villageWoodCost + 10,
      food: 200,
    });
    const result = updateSettlementGrowth(s, makeCiv(0), false);
    expect(result.upgraded).toBe('village');
    expect(s.tier).toBe(1);
    expect(s.wood).toBeCloseTo(10, 5);
  });

  it('upgrades a village to a town with stone and wood', () => {
    const cfg = BALANCE.growth;
    const s = makeSettlement(1, 0, 5, 5, {
      tier: 1,
      population: cfg.townPop,
      stone: cfg.townStoneCost + 5,
      wood: cfg.townWoodCost + 5,
      food: 500,
    });
    const result = updateSettlementGrowth(s, makeCiv(0), false);
    expect(result.upgraded).toBe('town');
    expect(s.tier).toBe(2);
  });

  it('does not upgrade without the resource cost', () => {
    const cfg = BALANCE.growth;
    const s = makeSettlement(1, 0, 5, 5, { population: cfg.villagePop + 5, wood: 0 });
    const result = updateSettlementGrowth(s, makeCiv(0), false);
    expect(result.upgraded).toBeNull();
    expect(s.tier).toBe(0);
  });

  it('caps population at the tier limit', () => {
    const cap = BALANCE.growth.tierPopCap[0];
    const s = makeSettlement(1, 0, 5, 5, { population: cap, food: 1000, wood: 0 });
    updateSettlementGrowth(s, makeCiv(0), false);
    expect(s.population).toBeLessThanOrEqual(cap);
  });
});
