/**
 * Peace treaties and tribute: lopsided wars end at the table instead of the
 * pyre. The loser pays tribute for a while; a truce (enforced in diplomacy's
 * score clamp) keeps the war from reigniting long enough to rebuild. This is
 * the main brake on the map converging into one or two empires.
 */
import { BALANCE } from '../config/balance';
import type { RNG } from '../core/rng';
import type { Civilization, Relation, Settlement, SimState } from '../core/types';
import { pushEvent } from './chronicle';

/** The civ's most populous settlement — tribute flows seat to seat. */
function seatOf(state: SimState, civId: number): Settlement | null {
  let best: Settlement | null = null;
  for (const s of state.settlements) {
    if (s.civId === civId && (!best || s.population > best.population)) best = s;
  }
  return best;
}

function payTribute(state: SimState, rel: Relation, i: number, j: number): void {
  const d = BALANCE.diplomacy;
  const payerId = rel.tributeFrom!;
  const receiverId = payerId === i ? j : i;
  const from = seatOf(state, payerId);
  const to = seatOf(state, receiverId);
  if (!from || !to) return;
  const food = Math.min(d.tributeFoodPerDay, Math.max(0, from.food - d.tributeFoodReserve));
  const wood = Math.min(d.tributeWoodPerDay, Math.max(0, from.wood - d.tributeWoodReserve));
  from.food -= food;
  to.food += food;
  from.wood -= wood;
  to.wood += wood;
}

function signTreaty(
  state: SimState,
  rng: RNG,
  rel: Relation,
  winner: Civilization,
  loser: Civilization,
): void {
  const d = BALANCE.diplomacy;
  rel.score = d.treatyScore;
  rel.state = 'neutral';
  rel.warDays = 0;
  rel.truceDays = d.treatyTruceDays;
  rel.tributeDays = d.treatyTributeDays;
  rel.tributeFrom = loser.id;
  for (const s of state.settlements) {
    if (s.civId === winner.id || s.civId === loser.id) {
      s.morale = Math.min(100, s.morale + d.treatyMoraleRelief);
    }
  }
  const seat = seatOf(state, loser.id);
  pushEvent(state, rng, 'treatySigned', 3, winner.id, {
    civ: winner.name,
    otherCiv: loser.name,
    x: seat?.x,
    y: seat?.y,
  });
}

/**
 * One day of treaty diplomacy: tribute caravans flow, and losing sides sue
 * for peace. Runs after war events and before relation drift; the truce
 * countdown itself ticks in updateDiplomacy beside its score clamp.
 */
export function updateTreaties(state: SimState, rng: RNG): void {
  const d = BALANCE.diplomacy;
  const counts = new Map<number, number>();
  for (const s of state.settlements) {
    counts.set(s.civId, (counts.get(s.civId) ?? 0) + 1);
  }

  for (let i = 0; i < state.civs.length; i++) {
    for (let j = i + 1; j < state.civs.length; j++) {
      const a = state.civs[i];
      const b = state.civs[j];
      if (!a.alive || !b.alive) continue;
      const rel = state.relations[i][j];

      if ((rel.tributeDays ?? 0) > 0 && rel.tributeFrom !== undefined) {
        payTribute(state, rel, i, j);
        rel.tributeDays!--;
        if (rel.tributeDays === 0) {
          const payer = state.civs[rel.tributeFrom];
          const receiver = rel.tributeFrom === i ? b : a;
          const seat = seatOf(state, payer.id);
          pushEvent(state, rng, 'tributeEnds', 1, payer.id, {
            civ: payer.name,
            otherCiv: receiver.name,
            x: seat?.x,
            y: seat?.y,
          });
          rel.tributeFrom = undefined;
        }
      }

      if (rel.state !== 'war' || rel.warDays < d.treatyMinWarDays) continue;
      const [loser, winner] = a.military < b.military ? [a, b] : [b, a];
      const ratio = winner.military > 0 ? loser.military / winner.military : 1;
      const cornered = (counts.get(loser.id) ?? 0) <= 2;
      if (ratio > d.treatySurrenderRatio && !cornered) continue;
      const chance = d.treatySurrenderChance * (cornered ? d.treatyLastStandMult : 1);
      if (rng.chance(chance)) signTreaty(state, rng, rel, winner, loser);
    }
  }
}
