import { describe, expect, it } from 'vitest';
import {
  AUTOSAVE_KEY,
  SAVE_KEY,
  hasSave,
  loadFromLocalStorage,
  newestSaveKey,
  serializeState,
} from '../src/persist/save';
import { Simulation } from '../src/sim/simulation';

function withStorage(storage: Storage, run: () => void): void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  }
}

function mapStorage(entries: Record<string, string>): Storage {
  const data = new Map(Object.entries(entries));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('save storage resilience', () => {
  it('treats blocked localStorage access as unavailable instead of throwing', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;

    withStorage(blocked, () => {
      expect(loadFromLocalStorage()).toBeNull();
      expect(newestSaveKey()).toBeNull();
      expect(hasSave()).toBe(false);
    });
  });

  it('falls back to a valid manual save when a newer autosave is corrupt', () => {
    const manual = serializeState(Simulation.create(3).state);
    const storage = mapStorage({
      [SAVE_KEY]: manual,
      [`${SAVE_KEY}:at`]: '10',
      [AUTOSAVE_KEY]: '{ definitely not json',
      [`${AUTOSAVE_KEY}:at`]: '20',
    });

    withStorage(storage, () => {
      expect(newestSaveKey()).toBe(SAVE_KEY);
      expect(hasSave()).toBe(true);
      expect(loadFromLocalStorage(newestSaveKey()!)).not.toBeNull();
    });
  });

  it('ignores a newer save from an unsupported schema version', () => {
    const manual = serializeState(Simulation.create(4).state);
    const storage = mapStorage({
      [SAVE_KEY]: manual,
      [`${SAVE_KEY}:at`]: '10',
      [AUTOSAVE_KEY]: JSON.stringify({ version: 999 }),
      [`${AUTOSAVE_KEY}:at`]: '30',
    });

    withStorage(storage, () => {
      expect(newestSaveKey()).toBe(SAVE_KEY);
    });
  });

  it('ignores a newer malformed payload that merely claims the current version', () => {
    const manual = serializeState(Simulation.create(5).state);
    const storage = mapStorage({
      [SAVE_KEY]: manual,
      [`${SAVE_KEY}:at`]: '10',
      [AUTOSAVE_KEY]: JSON.stringify({ version: 1, seed: 5 }),
      [`${AUTOSAVE_KEY}:at`]: '40',
    });

    withStorage(storage, () => {
      expect(newestSaveKey()).toBe(SAVE_KEY);
    });
  });
});
