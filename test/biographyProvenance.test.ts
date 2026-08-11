import { describe, expect, it } from 'vitest';
import type { ChronicleEntry } from '../src/core/types';
import { chronicleEntryBelongsToCiv } from '../src/ui/biographyPanel';
import { makeCiv } from './util';

function entry(overrides: Partial<ChronicleEntry>): ChronicleEntry {
  return {
    day: 1,
    year: 1,
    season: 0,
    text: '',
    importance: 2,
    kind: 'peace',
    civId: 1,
    ...overrides,
  };
}

describe('biography chronicle provenance', () => {
  it('does not confuse a base culture with a structured New-name descendant', () => {
    const ashvale = makeCiv(0, { name: 'Ashvale' });
    const newer = entry({
      text: 'New Ashvale signs a treaty.',
      civId: 1,
      variant: 0,
      params: { civ: 'New Ashvale', otherCiv: 'Velmora' },
    });

    expect(chronicleEntryBelongsToCiv(newer, ashvale)).toBe(false);
  });

  it('includes structured bilateral events when the civ is the other party', () => {
    const ashvale = makeCiv(0, { name: 'Ashvale' });
    const treaty = entry({
      text: 'Velmora signs peace with Ashvale.',
      civId: 1,
      variant: 0,
      params: { civ: 'Velmora', otherCiv: 'Ashvale' },
    });

    expect(chronicleEntryBelongsToCiv(treaty, ashvale)).toBe(true);
  });

  it('retains fuzzy text fallback for legacy entries without params', () => {
    const ashvale = makeCiv(0, { name: 'Ashvale' });
    const legacy = entry({ text: 'Envoys from Velmora bring gifts to Ashvale.', civId: 1 });

    expect(chronicleEntryBelongsToCiv(legacy, ashvale)).toBe(true);
  });
});
