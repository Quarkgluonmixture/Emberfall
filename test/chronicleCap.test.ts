import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/core/types';
import { pushEntry } from '../src/sim/chronicle';
import { makeCiv, makeState, makeWorld } from './util';

function freshState() {
  return makeState(makeWorld(8, 8, Terrain.Grassland), [makeCiv(0)], []);
}

describe('chronicle long-run compaction', () => {
  it('keeps an all-notable chronicle bounded and leaves compaction headroom', () => {
    const state = freshState();
    for (let i = 0; i <= 4000; i++) {
      state.day = i;
      pushEntry(state, 'town', 2, 0, `event ${i}`);
    }

    // Crossing 4000 compacts to 3000 older notable entries + 500 recent.
    expect(state.chronicle.length).toBe(3500);
    expect(state.chronicle.at(-1)?.text).toBe('event 4000');

    for (let i = 4001; i < 5000; i++) {
      state.day = i;
      pushEntry(state, 'town', 2, 0, `event ${i}`);
    }
    expect(state.chronicle.length).toBeLessThanOrEqual(4000);
    expect(state.chronicle.length).toBeGreaterThanOrEqual(3500);
    expect(state.chronicle.at(-1)?.text).toBe('event 4999');
  });

  it('always preserves the newest 500 entries, including minor texture', () => {
    const state = freshState();
    for (let i = 0; i < 3600; i++) {
      state.day = i;
      pushEntry(state, 'town', 2, 0, `history ${i}`);
    }
    for (let i = 0; i < 1000; i++) {
      state.day = 3600 + i;
      pushEntry(state, 'famine', 1, 0, `recent ${i}`);
    }

    expect(state.chronicle.length).toBeLessThanOrEqual(4000);
    const tail = state.chronicle.slice(-500).map((e) => e.text);
    expect(tail[0]).toBe('recent 500');
    expect(tail.at(-1)).toBe('recent 999');
  });
});
