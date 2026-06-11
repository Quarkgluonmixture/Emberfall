/**
 * Stress harness: simulate many years twice and verify both performance and
 * bit-identical determinism. Pure simulation — usable from tests, scripts and
 * the in-game stress mode.
 */
import { serializeState } from '../persist/save';
import { Simulation } from '../sim/simulation';
import { DAYS_PER_YEAR } from '../sim/time';

export interface StressReport {
  seed: number;
  years: number;
  days: number;
  wallMsA: number;
  wallMsB: number;
  msPerDay: number;
  identical: boolean;
  civsAlive: number;
  settlements: number;
  population: number;
  chronicleLength: number;
}

export function runStress(seed: number, years: number): StressReport {
  const days = years * DAYS_PER_YEAR;
  const t0 = performance.now();
  const a = Simulation.create(seed);
  a.advance(days);
  const t1 = performance.now();
  const b = Simulation.create(seed);
  b.advance(days);
  const t2 = performance.now();

  const identical = serializeState(a.state) === serializeState(b.state);
  let population = 0;
  for (const s of a.state.settlements) population += s.population;

  return {
    seed,
    years,
    days,
    wallMsA: t1 - t0,
    wallMsB: t2 - t1,
    msPerDay: (t1 - t0) / days,
    identical,
    civsAlive: a.state.civs.filter((c) => c.alive).length,
    settlements: a.state.settlements.length,
    population: Math.round(population),
    chronicleLength: a.state.chronicle.length,
  };
}

export function formatStressReport(r: StressReport): string {
  return (
    `stress seed=${r.seed} years=${r.years}\n` +
    `  run A ${r.wallMsA.toFixed(0)}ms · run B ${r.wallMsB.toFixed(0)}ms · ${r.msPerDay.toFixed(3)}ms/day\n` +
    `  determinism ${r.identical ? 'BIT-IDENTICAL ✓' : 'DIVERGED ✗'}\n` +
    `  civs ${r.civsAlive} · settlements ${r.settlements} · pop ${r.population} · chronicle ${r.chronicleLength}`
  );
}
