import { describe, expect, it } from 'vitest';
import type { Texture } from 'pixi.js';
import { TextureOwnership } from '../src/render/textureOwnership';

function fakeTexture(calls: boolean[]): Texture {
  return {
    destroy: (destroySource?: boolean) => {
      calls.push(Boolean(destroySource));
    },
  } as unknown as Texture;
}

describe('TextureOwnership', () => {
  it('destroys subtexture views without their shared source', () => {
    const calls: boolean[] = [];
    const ownership = new TextureOwnership();
    const texture = fakeTexture(calls);
    expect(ownership.view(texture)).toBe(texture);

    ownership.destroy();
    expect(calls).toEqual([false]);
  });

  it('destroys standalone renderer-owned texture sources', () => {
    const calls: boolean[] = [];
    const ownership = new TextureOwnership();
    const texture = fakeTexture(calls);
    expect(ownership.source(texture)).toBe(texture);

    ownership.destroy();
    expect(calls).toEqual([true]);
  });

  it('deduplicates registrations and becomes empty after destroy', () => {
    const calls: boolean[] = [];
    const ownership = new TextureOwnership();
    const source = fakeTexture(calls);
    ownership.source(source);
    ownership.source(source);
    ownership.destroy();
    ownership.destroy();
    expect(calls).toEqual([true]);
  });
});
