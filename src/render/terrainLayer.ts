/**
 * Terrain rendering: the whole map is baked into one RenderTexture per season
 * (cached, invalidated when terrain changes — e.g. wildfire), so per-frame
 * cost is a single sprite. With real tile art loaded, tiles are baked from
 * the seasonal sheets at higher resolution; otherwise flat shaded colors.
 */
import { Container, Graphics, RenderTexture, Sprite, type Renderer } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { TERRAIN_DEFS } from '../config/terrainConfig';
import { hash2 } from '../core/rng';
import { Terrain, type Season, type World } from '../core/types';
import { scaleColor, type GameTextures } from './textures';

export class TerrainLayer {
  sprite = new Sprite();
  private cache = new Map<Season, RenderTexture>();
  private cachedVersion = -1;

  constructor(
    private renderer: Renderer,
    private world: World,
    private textures: GameTextures,
  ) {}

  update(season: Season, terrainVersion: number): void {
    if (terrainVersion !== this.cachedVersion) {
      for (const rt of this.cache.values()) rt.destroy(true);
      this.cache.clear();
      this.cachedVersion = terrainVersion;
    }
    let rt = this.cache.get(season);
    if (!rt) {
      rt = this.textures.terrainTiles
        ? this.buildFromTiles(season, this.textures.terrainTiles)
        : this.buildFlat(season);
      this.cache.set(season, rt);
    }
    if (this.sprite.texture !== rt) {
      this.sprite.texture = rt;
      const bake = this.textures.terrainTiles ? BALANCE.render.terrainBakeScale : 1;
      this.sprite.scale.set(1 / bake);
    }
  }

  /** Per-tile brightness: water depth, land relief, deterministic jitter. */
  private shadeAt(x: number, y: number): number {
    const { width, seed, terrain, elevation } = this.world;
    const i = y * width + x;
    const t = terrain[i] as Terrain;
    const e = elevation[i];
    const seaLevel = BALANCE.map.seaLevel;
    const shade =
      t === Terrain.Ocean
        ? 0.65 + Math.min(1, Math.max(0, e / seaLevel)) * 0.4
        : 0.85 + Math.max(0, e - seaLevel) * 0.45;
    const jitter = 0.93 + hash2(seed ^ 0xbeef, x, y) * 0.12;
    return shade * jitter;
  }

  /** Bake real tile art: one sprite per tile rendered once into the cache. */
  private buildFromTiles(season: Season, tiles: Texture3): RenderTexture {
    const bake = BALANCE.render.terrainBakeScale;
    const ts = BALANCE.map.tileSize * bake;
    const { width, height, seed, terrain } = this.world;
    const container = new Container();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = terrain[y * width + x] as Terrain;
        const variation = Math.floor(hash2(seed ^ 0x51ce, x, y) * 3);
        const sp = new Sprite(tiles[season][t][variation]);
        sp.position.set(x * ts, y * ts);
        sp.width = ts;
        sp.height = ts;
        // The painted tiles are darker than the flat palette; lift the bake.
        const g = Math.round(255 * Math.min(1, this.shadeAt(x, y) * 1.18));
        sp.tint = (g << 16) | (g << 8) | g;
        container.addChild(sp);
      }
    }
    const rt = RenderTexture.create({ width: width * ts, height: height * ts });
    this.renderer.render({ container, target: rt, clear: true });
    container.destroy({ children: true, texture: false });
    return rt;
  }

  /** Fallback: flat seasonal colors per tile. */
  private buildFlat(season: Season): RenderTexture {
    const ts = BALANCE.map.tileSize;
    const { width, height, terrain } = this.world;
    const g = new Graphics();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = terrain[y * width + x] as Terrain;
        const base = TERRAIN_DEFS[t].seasonColors[season];
        g.rect(x * ts, y * ts, ts, ts).fill(scaleColor(base, this.shadeAt(x, y)));
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

type Texture3 = NonNullable<GameTextures['terrainTiles']>;
