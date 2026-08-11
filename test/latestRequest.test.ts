import { describe, expect, it } from 'vitest';
import { LatestRequestGate } from '../src/core/latestRequest';

describe('LatestRequestGate', () => {
  it('invalidates every older async request when a newer one begins', () => {
    const gate = new LatestRequestGate();
    const first = gate.begin();
    expect(gate.isCurrent(first)).toBe(true);

    const second = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);

    const third = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(false);
    expect(gate.isCurrent(third)).toBe(true);
  });
});
