/** One-off probe: century-scale runs to observe civ falls, rebirths, ruin resettlement. */
import { Simulation } from '../src/sim/simulation';

for (const seed of [5, 7, 21, 48, 99]) {
  const sim = Simulation.create(seed);
  sim.advance(360 * 120);
  const state = sim.state;
  const kinds = new Map<string, number>();
  for (const e of state.chronicle) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
  const alive = state.civs.filter((c) => c.alive);
  const reborn = state.civs.slice(5);
  console.log(
    `seed ${seed}: civs ${state.civs.length} (${alive.length} alive, ${reborn.length} reborn)` +
      ` · settlements ${state.settlements.length} · ruins ${state.ruins.length}` +
      ` · civFell ${kinds.get('civFell') ?? 0} · rebirth ${kinds.get('rebirth') ?? 0}` +
      ` · resettleRuin ${kinds.get('resettleRuin') ?? 0}`,
  );
  for (const c of reborn) {
    console.log(`   reborn: ${c.name} (alive=${c.alive}) traits=${c.traits.join(',')}`);
  }
}
