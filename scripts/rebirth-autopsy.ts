/** One-off: watch a reborn civ's vital signs year by year to find what kills it. */
import { Simulation } from '../src/sim/simulation';

const sim = Simulation.create(7);
let tracked = -1;
let lastLog = -1;

for (let day = 0; day < 360 * 60; day++) {
  sim.advance(1);
  const state = sim.state;
  if (tracked === -1) {
    const e = state.chronicle.find((c) => c.kind === 'rebirth');
    if (e) {
      tracked = e.civId;
      console.log(`rebirth at day ${state.day} (year ${Math.floor(state.day / 360)}): civ ${tracked} ${state.civs[tracked].name}`);
    }
  } else {
    const civ = state.civs[tracked];
    const towns = state.settlements.filter((s) => s.civId === tracked);
    if (!civ.alive) {
      console.log(`civ fell at day ${state.day} (year ${Math.floor(state.day / 360)})`);
      const mentions = state.chronicle.filter((c) => c.civId === tracked).slice(-8);
      for (const m of mentions) console.log(`  Y${m.year} ${m.kind}: ${m.text}`);
      break;
    }
    if (state.day - lastLog >= 90) {
      lastLog = state.day;
      const t = towns[0];
      console.log(
        `day ${state.day}: towns ${towns.length}, pop ${towns.reduce((a, s) => a + s.population, 0).toFixed(0)}` +
          (t
            ? ` | first: pop ${t.population.toFixed(0)} food ${t.food.toFixed(0)} morale ${t.morale.toFixed(0)} hunger ${t.hungerDays} famine ${t.famineDays}`
            : ''),
      );
    }
  }
}
