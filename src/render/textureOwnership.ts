import type { Texture } from 'pixi.js';

/**
 * Tracks textures created by one Renderer instance without claiming ownership
 * of Assets.load() cache entries. Source-owned textures have independent GPU
 * sources (procedural/generated/canvas bakes); view-owned textures are subviews
 * over a shared Assets source and must never destroy that source.
 */
export class TextureOwnership {
  private sourceOwned = new Set<Texture>();
  private viewOwned = new Set<Texture>();

  source<T extends Texture>(texture: T): T {
    this.sourceOwned.add(texture);
    return texture;
  }

  view<T extends Texture>(texture: T): T {
    this.viewOwned.add(texture);
    return texture;
  }

  destroy(): void {
    // Source ownership wins if a future caller accidentally registers the same
    // texture in both sets: one full destroy is safer than a double teardown.
    for (const texture of this.viewOwned) {
      if (!this.sourceOwned.has(texture)) texture.destroy(false);
    }
    this.viewOwned.clear();
    for (const texture of this.sourceOwned) texture.destroy(true);
    this.sourceOwned.clear();
  }
}
