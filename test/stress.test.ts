import { describe, expect, it } from 'vitest';
import { runStress } from '../src/showcase/stress';

describe('stress harness', () => {
  it('reports bit-identical determinism and sane performance over multiple years', () => {
    const report = runStress(5, 3);
    expect(report.identical).toBe(true);
    expect(report.days).toBe(360);
    expect(report.settlements).toBeGreaterThan(0);
    expect(report.civsAlive).toBeGreaterThan(0);
    expect(report.population).toBeGreaterThan(0);
    // Generous bound: phase-1 measured ~0.15ms/day; fail only on regression blowups.
    expect(report.msPerDay).toBeLessThan(10);
  });
});
