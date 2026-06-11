/** Diplomacy: pairwise relation scores drifting between five states. */
import { BALANCE } from '../config/balance';
import type { RNG } from '../core/rng';
import {
  pairKey,
  type Civilization,
  type DiplomaticState,
  type Relation,
  type SimState,
} from '../core/types';

export const STATE_RANK: Record<DiplomaticState, number> = {
  war: -2,
  rivalry: -1,
  neutral: 0,
  trade: 1,
  alliance: 2,
};

/** Pure threshold mapping from score to diplomatic state. */
export function stateForScore(score: number): DiplomaticState {
  const d = BALANCE.diplomacy;
  if (score >= d.allianceScore) return 'alliance';
  if (score >= d.tradeScore) return 'trade';
  if (score >= d.neutralScore) return 'neutral';
  if (score >= d.rivalryScore) return 'rivalry';
  return 'war';
}

/** Symmetric relation matrix; [i][j] and [j][i] share one object. */
export function initialRelations(civs: Civilization[], rng: RNG): Relation[][] {
  const n = civs.length;
  const spread = BALANCE.diplomacy.initialScoreSpread;
  const matrix: Relation[][] = Array.from({ length: n }, () => new Array<Relation>(n));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const score = rng.range(-spread, spread);
      const rel: Relation = { score, state: stateForScore(score), warDays: 0 };
      matrix[i][j] = rel;
      matrix[j][i] = rel;
    }
  }
  return matrix;
}

/** Grow the symmetric matrix for a newly risen civ; everyone starts wary. */
export function addCivRelations(state: SimState, civId: number, rng: RNG): void {
  const n = state.civs.length;
  const spread = BALANCE.diplomacy.initialScoreSpread;
  const row = new Array<Relation>(n);
  for (let i = 0; i < n; i++) {
    if (i === civId) continue;
    // A young culture is unknown: scores start tighter around neutral.
    const score = rng.range(-spread * 0.5, spread * 0.5);
    const rel: Relation = { score, state: stateForScore(score), warDays: 0 };
    state.relations[i].push(rel);
    row[i] = rel;
  }
  state.relations.push(row);
}

export interface DiploTransition {
  kind: 'warDeclared' | 'peace' | 'alliance' | 'tradeOpened' | 'rivalry' | 'relationsCooled';
  a: number;
  b: number;
}

function transitionKind(prev: DiplomaticState, next: DiplomaticState): DiploTransition['kind'] {
  if (next === 'war') return 'warDeclared';
  if (prev === 'war') return 'peace';
  if (next === 'alliance') return 'alliance';
  if (next === 'trade' && STATE_RANK[next] > STATE_RANK[prev]) return 'tradeOpened';
  if (next === 'rivalry' && STATE_RANK[next] < STATE_RANK[prev]) return 'rivalry';
  return 'relationsCooled';
}

/** One day of relation drift for every living pair. Returns state transitions. */
export function updateDiplomacy(state: SimState, rng: RNG): DiploTransition[] {
  const d = BALANCE.diplomacy;
  const transitions: DiploTransition[] = [];
  const borderSet = new Set(state.borders);

  for (let i = 0; i < state.civs.length; i++) {
    for (let j = i + 1; j < state.civs.length; j++) {
      const a = state.civs[i];
      const b = state.civs[j];
      if (!a.alive || !b.alive) continue;
      const rel = state.relations[i][j];

      let delta = -Math.sign(rel.score) * d.driftToZero;
      if (borderSet.has(pairKey(i, j))) delta -= d.borderFriction;
      if (a.traits.includes('warlike')) delta -= d.warlikePenalty;
      if (b.traits.includes('warlike')) delta -= d.warlikePenalty;
      if (a.traits.includes('devout') && b.traits.includes('devout')) delta += d.sharedDevoutBonus;
      if (a.traits.includes('scholarly') && b.traits.includes('scholarly')) {
        delta += d.sharedScholarlyBonus;
      }
      if (a.traits.includes('proud') && b.traits.includes('proud')) delta -= d.sharedProudPenalty;
      if (a.goldenAgeDays > 0) delta += d.goldenAgeCharm;
      if (b.goldenAgeDays > 0) delta += d.goldenAgeCharm;

      if (rel.state === 'war') {
        rel.warDays++;
        if (rel.warDays > d.warExhaustionDays) delta += d.warExhaustionRelief;
      } else {
        rel.warDays = 0;
      }

      delta += rng.range(-d.noise, d.noise);
      rel.score = Math.min(100, Math.max(-100, rel.score + delta));

      // Reborn cultures are beneath notice during their grace years: relations
      // may sour to rivalry, but war cannot come.
      const grace = BALANCE.rebirth.graceDays;
      if (
        (a.foundedDay > 0 && state.day - a.foundedDay < grace) ||
        (b.foundedDay > 0 && state.day - b.foundedDay < grace)
      ) {
        rel.score = Math.max(rel.score, d.rivalryScore + 2);
      }

      // A treaty's truce holds the same line: rivalry at worst, no new war.
      if ((rel.truceDays ?? 0) > 0) {
        rel.truceDays!--;
        rel.score = Math.max(rel.score, d.rivalryScore + 2);
      }

      const next = stateForScore(rel.score);
      if (next !== rel.state) {
        const dir = Math.sign(STATE_RANK[next] - STATE_RANK[rel.state]);
        rel.score = Math.min(100, Math.max(-100, rel.score + dir * d.transitionMomentum));
        const prev = rel.state;
        rel.state = next;
        transitions.push({ kind: transitionKind(prev, next), a: i, b: j });
      }
    }
  }
  return transitions;
}

export function relationBetween(state: SimState, a: number, b: number): Relation | null {
  if (a === b) return null;
  return state.relations[a]?.[b] ?? null;
}

export function civsAtWarWith(state: SimState, civId: number): number[] {
  const out: number[] = [];
  for (const other of state.civs) {
    if (other.id === civId || !other.alive) continue;
    if (state.relations[civId][other.id]?.state === 'war') out.push(other.id);
  }
  return out;
}

export function hasTradePartner(state: SimState, civId: number): boolean {
  for (const other of state.civs) {
    if (other.id === civId || !other.alive) continue;
    const st = state.relations[civId][other.id]?.state;
    if (st === 'trade' || st === 'alliance') return true;
  }
  return false;
}
