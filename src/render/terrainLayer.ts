/**
 * Terrain rendering: the whole map is baked into one RenderTexture per season
 * (cached, invalidated when terrain changes — e.g. wildfire), so per-frame
 * cost is a single sprite.
 */
import { Graphics, RenderTexture, Sprite, type Renderer } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { TERRAIN_DEFS } from '../config/terrainConfig';
import { hash2 } from '../core/rng';
import { Terrain, type Season, type World } from '../core/types';
import { scaleColor } from './textures';

export class TerrainLayer {
  sprite = new Sprite();
  private cache = new Map<Season, RenderTexture>();
  private cachedVersion = -1;

  constructor(
    private renderer: Renderer,
    private world: World,
  ) {}

  update(season: Season, terrainVersion: number): void {
    if (terrainVersion !== this.cachedVersion) {
      for (const rt of this.cache.values()) rt.destroy(true);
      this.cache.clear();
      this.cachedVersion = terrainVersion;
    }
    let rt = this.cache.get(season);
    if (!rt) {
      rt = this.build(season);
      this.cache.set(season, rt);
    }
    if (this.sprite.texture !== rt) this.sprite.texture = rt;
  }

  private build(season: Season): RenderTexture {
    const ts = BALANCE.map.tileSize;
    const { width, height, seed, terrain, elevation } = this.world;
    const seaLevel = BALANCE.map.seaLevel;
    const g = new Graphics();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const t = terrain[i] as Terrain;
        const base = TERRAIN_DEFS[t].seasonColors[season];
        const e = elevation[i];
        // Depth shading for water, relief shading for land.
        const shade =
          t === Terrain.Ocean
            ? 0.65 + Math.min(1, Math.max(0, e / seaLevel)) * 0.4
            : 0.85 + Math.max(0, e - seaLevel) * 0.45;
        const jitter = 0.93 + hash2(seed ^ 0xbeef, x, y) * 0.12;
        g.rect(x * ts, y * ts, ts, ts).fill(scaleColor(base, shade * jitter));
      }
    }
    const rt = RenderTexture.create({ width: width * ts, height: height * ts });
    rt.source.scaleMode = 'nearest';
    this.renderer.render({ container: g, target: rt, clear: true });
    g.destroy();
    return rt;
  }

  destroy(): void {
    for (const rt of this.cache.values()) rt.destroy(true);
    this.cache.clear();
  }
}
