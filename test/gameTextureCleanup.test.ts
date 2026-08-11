import { describe, expect, it } from 'vitest';
import type { Texture } from 'pixi.js';
import { destroyTextureSet } from '../src/render/gameTextureCleanup';

function fakeTexture(source: object, calls: boolean[]): Texture {
  return {
    source,
    destroy: (destroySource?: boolean) => calls.push(Boolean(destroySource)),
  } as unknown as Texture;
}

describe('game texture cleanup ownership', () => {
  it('leaves Assets cache textures untouched', () => {
    const calls: boolean[] = [];
    const source = {};
    const shared = fakeTexture(source, calls);
    destroyTextureSet([shared], new Set([shared]), new Set([source]));
    expect(calls).toEqual([]);
  });

  it('destroys subtexture views but preserves their shared Assets source', () => {
    const calls: boolean[] = [];
    const source = {};
    const view = fakeTexture(source, calls);
    destroyTextureSet([view], new Set(), new Set([source]));
    expect(calls).toEqual([false]);
  });

  it('fully destroys standalone renderer-owned sources', () => {
    const calls: boolean[] = [];
    const owned = fakeTexture({}, calls);
    destroyTextureSet([owned], new Set(), new Set());
    expect(calls).toEqual([true]);
  });
});
