/**
 * One-off probe: does the treaty system slow empire convergence?
 * Runs 150-year worlds with treaties off (surrender chance 0) vs on,
 * and prints survival/dominance metrics side by side.
 */
import { BALANCE } from '../src/config/balance';
import { Simulation } from '../src/sim/simulation';

const YEARS = 150;
const DAYS = YEARS * BALANCE.time.daysPerSeason * BALANCE.time.seasonsPerYear;

function run(seed: number): string {
  const sim = Simulation.create(seed);
  sim.advance(DAYS);
  const state = sim.state;
  const kinds = new Map<string, number>();
  for (const e of state.chronicle) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
  const alive = state.civs.filter((c) => c.alive);
  const counts = new Map<number, number>();
  for (const s of state.settlements) counts.set(s.civId, (counts.get(s.civId) ?? 0) + 1);
  const biggest = Math.max(0, ...counts.values());
  const share = state.settlements.length ? Math.round((100 * biggest) / state.settlements.length) : 0;
  const rebornAlive = state.civs.slice(5).filter((c) => c.alive).length;
  return (
    `alive ${alive.length}/${state.civs.length} (reborn alive ${rebornAlive})` +
    ` · top-civ share ${share}%` +
    ` · captures ${kinds.get('capture') ?? 0} · civFell ${kinds.get('civFell') ?? 0}` +
    ` · treaties ${kinds.get('treatySigned') ?? 0} · wars ${kinds.get('warDeclared') ?? 0}`
  );
}

for (const seed of [5, 7, 21, 48, 99]) {
  const saved = BALANCE.diplomacy.treatySurrenderChance;
  (BALANCE.diplomacy as { treatySurrenderChance: number }).treatySurrenderChance = 0;
  const off = run(seed);
  (BALANCE.diplomacy as { treatySurrenderChance: number }).treatySurrenderChance = saved;
  const on = run(seed);
  console.log(`seed ${seed}\n  off: ${off}\n  on : ${on}`);
}
