import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { RNG } from '../src/core/rng';
import { pairKey, Terrain } from '../src/core/types';
import {
  hasTradePartner,
  initialRelations,
  stateForScore,
  updateDiplomacy,
} from '../src/sim/diplomacy';
import { makeCiv, makeState, makeWorld } from './util';

describe('diplomacy', () => {
  it('maps scores to states at the configured thresholds', () => {
    const d = BALANCE.diplomacy;
    expect(stateForScore(d.allianceScore)).toBe('alliance');
    expect(stateForScore(d.allianceScore - 1)).toBe('trade');
    expect(stateForScore(d.tradeScore)).toBe('trade');
    expect(stateForScore(d.tradeScore - 1)).toBe('neutral');
    expect(stateForScore(0)).toBe('neutral');
    expect(stateForScore(d.neutralScore)).toBe('neutral');
    expect(stateForScore(d.neutralScore - 1)).toBe('rivalry');
    expect(stateForScore(d.rivalryScore)).toBe('rivalry');
    expect(stateForScore(d.rivalryScore - 1)).toBe('war');
  });

  it('creates a symmetric relation matrix', () => {
    const civs = [makeCiv(0), makeCiv(1), makeCiv(2)];
    const relations = initialRelations(civs, new RNG(5));
    expect(relations[0][1]).toBe(relations[1][0]);
    expect(relations[1][2]).toBe(relations[2][1]);
  });

  it('border friction between warlike civs eventually leads to war', () => {
    const civs = [makeCiv(0, { traits: ['warlike'] }), makeCiv(1, { traits: ['warlike'] })];
    const state = makeState(makeWorld(10, 10, Terrain.Grassland), civs, []);
    state.borders = [pairKey(0, 1)];
    const rel = state.relations[0][1];
    rel.score = -50;
    rel.state = 'rivalry';
    const rng = new RNG(9);
    let declared = false;
    for (let day = 0; day < 400 && !declared; day++) {
      for (const t of updateDiplomacy(state, rng)) {
        if (t.kind === 'warDeclared') declared = true;
      }
    }
    expect(declared).toBe(true);
    expect(rel.state).toBe('war');
  });

  it('war exhaustion eventually brings peace', () => {
    const civs = [makeCiv(0), makeCiv(1)];
    const state = makeState(makeWorld(10, 10, Terrain.Grassland), civs, []);
    const rel = state.relations[0][1];
    rel.score = -62;
    rel.state = 'war';
    rel.warDays = BALANCE.diplomacy.warExhaustionDays + 1;
    const rng = new RNG(3);
    let peace = false;
    for (let day = 0; day < 200 && !peace; day++) {
      for (const t of updateDiplomacy(state, rng)) {
        if (t.kind === 'peace') peace = true;
      }
    }
    expect(peace).toBe(true);
    expect(rel.state).not.toBe('war');
  });

  it('ignores fallen civilizations', () => {
    const civs = [makeCiv(0), makeCiv(1, { alive: false })];
    const state = makeState(makeWorld(10, 10, Terrain.Grassland), civs, []);
    const before = state.relations[0][1].score;
    updateDiplomacy(state, new RNG(1));
    expect(state.relations[0][1].score).toBe(before);
  });

  it('detects trade partners', () => {
    const civs = [makeCiv(0), makeCiv(1)];
    const state = makeState(makeWorld(10, 10, Terrain.Grassland), civs, []);
    expect(hasTradePartner(state, 0)).toBe(false);
    state.relations[0][1].state = 'trade';
    expect(hasTradePartner(state, 0)).toBe(true);
    expect(hasTradePartner(state, 1)).toBe(true);
  });
});
