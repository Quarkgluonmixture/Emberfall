import { describe, expect, it } from 'vitest';
import { storageGet, storageSet } from '../src/persist/storage';

function withStorage(storage: Storage, run: () => void): void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  }
}

describe('best-effort browser storage', () => {
  it('returns fallbacks when storage access is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;

    withStorage(blocked, () => {
      expect(storageGet('x')).toBeNull();
      expect(storageSet('x', '1')).toBe(false);
    });
  });

  it('reads and writes normally when storage is available', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    } as unknown as Storage;

    withStorage(storage, () => {
      expect(storageGet('x')).toBeNull();
      expect(storageSet('x', '1')).toBe(true);
      expect(storageGet('x')).toBe('1');
    });
  });
});
