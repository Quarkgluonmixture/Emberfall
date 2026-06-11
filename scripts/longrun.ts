/** Balance probe: simulate 10 in-game years headless and report the shape of history. */
import { Simulation } from '../src/sim/simulation';

const sim = Simulation.create(1337);
const t0 = performance.now();
sim.advance(1200); // 10 years
const elapsed = performance.now() - t0;

const state = sim.state;
const kinds = new Map<string, number>();
for (const e of state.chronicle) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);

console.log(`10 years simulated in ${elapsed.toFixed(0)}ms (${(elapsed / 1200).toFixed(2)}ms/day)`);
console.log(`settlements: ${state.settlements.length}`);
for (const civ of state.civs) {
  const pop = Math.round(
    state.settlements.filter((s) => s.civId === civ.id).reduce((a, s) => a + s.population, 0),
  );
  const tiers = state.settlements
    .filter((s) => s.civId === civ.id)
    .map((s) => ['camp', 'village', 'town'][s.tier]);
  console.log(
    `  ${civ.name.padEnd(12)} ${civ.alive ? 'alive' : 'FELL'} pop=${pop} [${tiers.join(', ')}]`,
  );
}
console.log('chronicle kinds:');
for (const [k, n] of [...kinds.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${n}`);
}
