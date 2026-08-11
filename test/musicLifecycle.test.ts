import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import type { SimState } from '../src/core/types';
import { MusicManager, type MusicTrack } from '../src/audio/music';
import { Terrain } from '../src/core/types';
import { makeCiv, makeState, makeWorld } from './util';

function withFakeWindow(run: () => void): void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const fake = {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Window & typeof globalThis;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fake });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete (globalThis as { window?: unknown }).window;
  }
}

describe('music world lifecycle', () => {
  it('drops old-world hold and night hysteresis when a new world arrives', () => {
    withFakeWindow(() => {
      const manager = new MusicManager();
      const oldState = makeState(makeWorld(8, 8, Terrain.Grassland), [makeCiv(0)], []);
      const newState = makeState(makeWorld(8, 8, Terrain.Grassland), [makeCiv(0)], []);
      const internal = manager as unknown as {
        current: MusicTrack | null;
        holdLeft: number;
        night: boolean;
        mood: 'war' | 'disaster' | 'goldenAge' | null;
        moodLeft: number;
        lastState: SimState | null;
      };

      internal.lastState = oldState;
      internal.current = 'war';
      internal.holdLeft = 9;
      internal.night = true;
      internal.mood = 'war';
      internal.moodLeft = 30;

      // 0.5 lies inside the night hysteresis band. If the previous world's
      // `night=true` leaks across identity, the fresh world would stay on night;
      // if holdLeft leaks too, the old war track can remain pinned instead.
      manager.update(0, newState, 0, 0.5);

      expect(internal.mood).toBeNull();
      expect(internal.night).toBe(false);
      expect(internal.current).toBe('spring');
      expect(internal.holdLeft).toBe(BALANCE.audio.minTrackHoldSeconds);
    });
  });
});
