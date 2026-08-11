import { describe, expect, it } from 'vitest';
import type { Texture } from 'pixi.js';
import { pruneAndBakeFrames } from '../src/render/textures';

function fakeTexture(calls: boolean[]): Texture {
  return {
    destroy: (destroySource?: boolean) => {
      calls.push(Boolean(destroySource));
    },
  } as unknown as Texture;
}

describe('citizen frame texture lifecycle', () => {
  it('releases blank and successfully baked source views without destroying shared sources', () => {
    const blankCalls: boolean[] = [];
    const sourceCalls: boolean[] = [];
    const fallbackCalls: boolean[] = [];
    const replacementCalls: boolean[] = [];
    const blank = fakeTexture(blankCalls);
    const source = fakeTexture(sourceCalls);
    const fallback = fakeTexture(fallbackCalls);
    const replacement = fakeTexture(replacementCalls);

    const out = pruneAndBakeFrames(
      [blank, source, fallback],
      (texture) => (texture === blank ? 0 : 1),
      (texture) => (texture === source ? replacement : texture),
    );

    expect(out).toEqual([replacement, fallback]);
    expect(blankCalls).toEqual([false]);
    expect(sourceCalls).toEqual([false]);
    expect(fallbackCalls).toEqual([]);
    expect(replacementCalls).toEqual([]);
  });
});
