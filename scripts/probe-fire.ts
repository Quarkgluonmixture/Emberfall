/** Find the first wildfire events for a seed (default 1337). */
import { Simulation } from '../src/sim/simulation';

const seed = Number(process.argv[2]) || 1337;
const sim = Simulation.create(seed);
let reported = 0;
let scanned = 0;
for (let day = 0; day < 4000 && reported < 5; day++) {
  sim.advance(1);
  const chron = sim.state.chronicle;
  while (scanned < chron.length) {
    const e = chron[scanned++];
    if (e.kind === 'wildfire' || e.kind === 'wildfireWild') {
      console.log(`day ${e.day ?? day} ${e.kind} at (${e.x},${e.y})`);
      reported++;
    }
  }
}
if (reported === 0) console.log('no wildfire in 4000 days');
