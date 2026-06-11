import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { RNG } from '../src/core/rng';
import { pairKey, Terrain, type SimState } from '../src/core/types';
import { updateDiplomacy } from '../src/sim/diplomacy';
import { updateTreaties } from '../src/sim/treaties';
import { deserializeState, serializeState } from '../src/persist/save';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

const d = BALANCE.diplomacy;

/** Two civs locked in a lopsided war: civ 1 is clearly losing. */
function warState(): SimState {
  const civs = [makeCiv(0, { military: 100 }), makeCiv(1, { military: 20 })];
  const settlements = [
    makeSettlement(1, 0, 2, 2),
    makeSettlement(2, 0, 4, 2),
    makeSettlement(3, 0, 6, 2),
    makeSettlement(4, 1, 2, 8, { food: 100, wood: 50 }),
    makeSettlement(5, 1, 4, 8),
    makeSettlement(6, 1, 6, 8),
  ];
  const state = makeState(makeWorld(10, 12, Terrain.Grassland), civs, settlements);
  const rel = state.relations[0][1];
  rel.score = -80;
  rel.state = 'war';
  rel.warDays = d.treatyMinWarDays + 1;
  return state;
}

describe('treaties', () => {
  it('a losing side sues for peace: treaty sets truce and tribute terms', () => {
    const state = warState();
    const rel = state.relations[0][1];
    const rng = new RNG(7);
    for (let day = 0; day < 500 && rel.state === 'war'; day++) {
      updateTreaties(state, rng);
    }
    expect(rel.state).toBe('neutral');
    expect(rel.score).toBe(d.treatyScore);
    expect(rel.truceDays).toBe(d.treatyTruceDays);
    expect(rel.tributeDays).toBe(d.treatyTributeDays);
    expect(rel.tributeFrom).toBe(1);
    expect(state.chronicle.some((e) => e.kind === 'treatySigned')).toBe(true);
  });

  it('an even war does not end in a treaty', () => {
    const state = warState();
    state.civs[1].military = 90; // nearly matched, neither side cornered
    const rel = state.relations[0][1];
    const rng = new RNG(7);
    for (let day = 0; day < 500; day++) updateTreaties(state, rng);
    expect(rel.state).toBe('war');
    expect(state.chronicle.some((e) => e.kind === 'treatySigned')).toBe(false);
  });

  it('a cornered civ may sue even when its army is not outmatched', () => {
    const state = warState();
    state.civs[1].military = 90;
    state.settlements = state.settlements.filter((s) => s.civId === 0 || s.id === 4);
    const rel = state.relations[0][1];
    const rng = new RNG(7);
    for (let day = 0; day < 500 && rel.state === 'war'; day++) {
      updateTreaties(state, rng);
    }
    expect(rel.state).toBe('neutral');
  });

  it('truce blocks a new war until it expires', () => {
    const civs = [makeCiv(0, { traits: ['warlike'] }), makeCiv(1, { traits: ['warlike'] })];
    const state = makeState(makeWorld(10, 10, Terrain.Grassland), civs, []);
    state.borders = [pairKey(0, 1)];
    const rel = state.relations[0][1];
    rel.score = d.treatyScore;
    rel.truceDays = 100;
    const rng = new RNG(11);
    for (let day = 0; day < 100; day++) {
      updateDiplomacy(state, rng);
      expect(rel.state).not.toBe('war');
    }
    expect(rel.truceDays).toBe(0);
    rel.score = -70; // grudges return once the truce lapses
    updateDiplomacy(state, rng);
    expect(rel.state).toBe('war');
  });

  it('tribute flows seat to seat from the surplus, then ends with a chronicle note', () => {
    const state = warState();
    const rel = state.relations[0][1];
    rel.state = 'neutral';
    rel.score = d.treatyScore;
    rel.warDays = 0;
    rel.tributeDays = 5;
    rel.tributeFrom = 1;
    const payerSeat = state.settlements.find((s) => s.id === 4)!; // civ 1's largest
    const receiverSeat = state.settlements[0];
    payerSeat.population = 999;
    receiverSeat.population = 999;
    const payerFood = payerSeat.food;
    const receiverFood = receiverSeat.food;
    const rng = new RNG(3);
    for (let day = 0; day < 5; day++) updateTreaties(state, rng);
    expect(payerSeat.food).toBeCloseTo(payerFood - 5 * d.tributeFoodPerDay, 5);
    expect(receiverSeat.food).toBeCloseTo(receiverFood + 5 * d.tributeFoodPerDay, 5);
    expect(rel.tributeDays).toBe(0);
    expect(rel.tributeFrom).toBeUndefined();
    expect(state.chronicle.some((e) => e.kind === 'tributeEnds')).toBe(true);
  });

  it('tribute never drains the payer below the reserve', () => {
    const state = warState();
    const rel = state.relations[0][1];
    rel.state = 'neutral';
    rel.tributeDays = 10;
    rel.tributeFrom = 1;
    const payerSeat = state.settlements.find((s) => s.id === 4)!;
    payerSeat.population = 999;
    payerSeat.food = d.tributeFoodReserve;
    payerSeat.wood = d.tributeWoodReserve;
    const rng = new RNG(3);
    for (let day = 0; day < 10; day++) updateTreaties(state, rng);
    expect(payerSeat.food).toBe(d.tributeFoodReserve);
    expect(payerSeat.wood).toBe(d.tributeWoodReserve);
  });

  it('treaty terms survive a save round-trip', () => {
    const state = warState();
    const rel = state.relations[0][1];
    rel.state = 'neutral';
    rel.score = d.treatyScore;
    rel.truceDays = 123;
    rel.tributeDays = 45;
    rel.tributeFrom = 1;
    const loaded = deserializeState(serializeState(state));
    const back = loaded.relations[0][1];
    expect(back.truceDays).toBe(123);
    expect(back.tributeDays).toBe(45);
    expect(back.tributeFrom).toBe(1);
    expect(serializeState(loaded)).toBe(serializeState(state));
  });
});
