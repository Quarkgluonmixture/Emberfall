/**
 * Terrain rendering: the whole map is baked into one RenderTexture per season
 * (cached, invalidated when terrain changes — e.g. wildfire), so per-frame
 * cost is a single sprite. With real tile art loaded, tiles are baked from
 * the seasonal sheets at higher resolution; otherwise flat shaded colors.
 */
import { Container, Graphics, RenderTexture, Sprite, type Renderer, type Texture } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { TERRAIN_DEFS } from '../config/terrainConfig';
import { hash2 } from '../core/rng';
import { Terrain, type Season, type World } from '../core/types';
import { scaleColor, type GameTextures } from './textures';

export class TerrainLayer {
  sprite = new Sprite();
  private cache = new Map<Season, RenderTexture>();
  private cachedVersion = -1;
  /** Per-season luminance gains equalizing the 3 art variants of each biome. */
  private gains = new Map<Season, number[][]>();

  constructor(
    private renderer: Renderer,
    private world: World,
    private textures: GameTextures,
  ) {}

  /** Mean luminance of a texture (alpha-weighted), for variant equalization. */
  private meanLuminance(tex: Texture): number {
    const sp = new Sprite(tex);
    const { pixels } = this.renderer.extract.pixels(sp);
    sp.destroy();
    let sum = 0;
    let weight = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const a = pixels[i + 3] / 255;
      sum += (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) * a;
      weight += a;
    }
    return weight > 0 ? sum / weight : 128;
  }

  /**
   * The generated art variants differ in brightness, which reads as a blocky
   * patchwork once tiled. Equalize each variant toward its biome's mean.
   */
  private variantGains(season: Season, tiles: Texture3): number[][] {
    let gains = this.gains.get(season);
    if (gains) return gains;
    gains = [];
    for (let t = 0; t < tiles[season].length; t++) {
      const lums = tiles[season][t].map((tex) => this.meanLuminance(tex));
      const mean = lums.reduce((a, b) => a + b, 0) / lums.length;
      gains[t] = lums.map((l) => Math.min(1.2, Math.max(0.85, l > 0 ? mean / l : 1)));
    }
    this.gains.set(season, gains);
    return gains;
  }

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
    const rivers = this.textures.riverTiles;
    const gains = this.variantGains(season, tiles);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = terrain[y * width + x] as Terrain;
        const variation = Math.floor(hash2(seed ^ 0x51ce, x, y) * 3);
        let sp: Sprite;
        if (t === Terrain.River && rivers) {
          const piece = this.riverPiece(x, y, rivers[season], variation, tiles[season][t][variation]);
          sp = new Sprite(piece.tex);
          sp.anchor.set(0.5);
          sp.rotation = piece.rot;
          sp.position.set((x + 0.5) * ts, (y + 0.5) * ts);
        } else {
          sp = new Sprite(tiles[season][t][variation]);
          sp.position.set(x * ts, y * ts);
        }
        sp.width = ts;
        sp.height = ts;
        // The painted tiles are darker than the flat palette; lift the bake.
        // Variant gain flattens brightness differences between the 3 arts.
        const gain = gains[t]?.[variation] ?? 1;
        const g = Math.round(255 * Math.min(1, this.shadeAt(x, y) * 1.18 * gain));
        sp.tint = (g << 16) | (g << 8) | g;
        container.addChild(sp);
      }
    }
    const rt = RenderTexture.create({ width: width * ts, height: height * ts });
    this.renderer.render({ container, target: rt, clear: true });
    container.destroy({ children: true, texture: false });
    return rt;
  }

  /**
   * Pick river art + rotation from orthogonal neighbors. Canonical art:
   * bend connects N→E, mouth has the river entering N and ocean filling S.
   * Rotation k·π/2 (clockwise) maps art-north to N, E, S, W for k = 0…3.
   */
  private riverPiece(
    x: number,
    y: number,
    shapes: Texture[][],
    variation: number,
    straight: Texture,
  ): { tex: Texture; rot: number } {
    const { width, height, terrain } = this.world;
    const at = (dx: number, dy: number): Terrain | -1 => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return -1;
      return terrain[ny * width + nx] as Terrain;
    };
    // Neighbor order: N, E, S, W.
    const n = [at(0, -1), at(1, 0), at(0, 1), at(-1, 0)];
    const river = n.map((t) => t === Terrain.River);
    const ocean = n.map((t) => t === Terrain.Ocean);
    const HALF = Math.PI / 2;

    if (ocean.some(Boolean)) {
      // Mouth: face the ocean, preferring the side opposite an incoming river.
      let dir = ocean.findIndex(Boolean);
      for (let d = 0; d < 4; d++) {
        if (ocean[d] && river[(d + 2) % 4]) {
          dir = d;
          break;
        }
      }
      const rotForOcean = [2, 3, 0, 1]; // art-south → N, E, S, W
      return { tex: shapes[1][variation], rot: rotForOcean[dir] * HALF };
    }
    if (river.filter(Boolean).length === 2) {
      if (river[0] && river[1]) return { tex: shapes[0][variation], rot: 0 };
      if (river[1] && river[2]) return { tex: shapes[0][variation], rot: HALF };
      if (river[2] && river[3]) return { tex: shapes[0][variation], rot: 2 * HALF };
      if (river[3] && river[0]) return { tex: shapes[0][variation], rot: 3 * HALF };
    }
    // Straight (art flows N–S), junctions and isolated tiles: rotate only
    // when the connections are purely E–W.
    const horizontal = (river[1] || river[3]) && !(river[0] || river[2]);
    return { tex: straight, rot: horizontal ? HALF : 0 };
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
