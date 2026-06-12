/**
 * Terrain rendering: the whole map is baked into one RenderTexture per season
 * (cached, invalidated when terrain changes — e.g. wildfire), so per-frame
 * cost is a single sprite. With real tile art loaded, tiles are baked from
 * the seasonal sheets at higher resolution; otherwise flat shaded colors.
 */
import {
  Container,
  Graphics,
  RenderTexture,
  Sprite,
  Texture as PixiTexture,
  type Renderer,
  type Texture,
} from 'pixi.js';
import { BALANCE } from '../config/balance';
import { TERRAIN_DEFS } from '../config/terrainConfig';
import { hash2 } from '../core/rng';
import { Terrain, type Season, type World } from '../core/types';
import { scaleColor, type GameTextures } from './textures';

/** Subtle per-biome multiply grade unifying each biome's read at macro zoom
    without flattening local contrast (white = untouched). */
const BIOME_GRADE: Record<number, number> = {
  [Terrain.Ocean]: 0xffffff,
  [Terrain.Coast]: 0xfff6e2,
  [Terrain.Grassland]: 0xf2fbe4,
  [Terrain.Forest]: 0xe7f5e2,
  [Terrain.Mountain]: 0xf1f1f8,
  [Terrain.River]: 0xffffff,
  [Terrain.Swamp]: 0xe9efdc,
  [Terrain.Desert]: 0xfff3e0,
  [Terrain.Tundra]: 0xeef4fb,
};

/** 64×1 white→transparent alpha ramp, tinted per neighbor biome at bake.
    Ease-out falloff (≈(1−t)²) — a linear tail ends in a readable hard line
    once several ramps stack along a shoreline. */
function gradientRamp(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.49)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 1);
  return PixiTexture.from(canvas);
}

export class TerrainLayer {
  /** Current season bake + the previous one fading out above it. */
  container = new Container();
  sprite = new Sprite();
  private prevSprite = new Sprite();
  private fadeLeft = 0;
  /** Set when the cache was just destroyed — the old texture is gone, so the
      next swap must hard-cut instead of fading from a dead texture. */
  private justInvalidated = false;
  private cache = new Map<Season, RenderTexture>();
  /** Most-recently-used first; 4x bakes are ~65MB each, so keep only two. */
  private cacheOrder: Season[] = [];
  private cachedVersion = -1;
  /** Per-season luminance gains equalizing the art variants of each biome. */
  private gains = new Map<Season, number[][]>();
  /** Shared alpha ramp for biome edge fog (lazy, lives for the layer). */
  private ramp: Texture | null = null;

  constructor(
    private renderer: Renderer,
    private world: World,
    private textures: GameTextures,
  ) {
    this.prevSprite.visible = false;
    this.container.addChild(this.sprite, this.prevSprite);
  }

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

  update(season: Season, terrainVersion: number, dt: number): void {
    if (terrainVersion !== this.cachedVersion) {
      // The fading texture is about to be destroyed; end the fade first.
      this.prevSprite.visible = false;
      this.fadeLeft = 0;
      this.justInvalidated = true;
      for (const rt of this.cache.values()) rt.destroy(true);
      this.cache.clear();
      this.cacheOrder = [];
      this.cachedVersion = terrainVersion;
    }
    let rt = this.cache.get(season);
    if (!rt) {
      rt = this.textures.terrainTiles
        ? this.buildFromTiles(season, this.textures.terrainTiles)
        : this.buildFlat(season);
      this.cache.set(season, rt);
    }
    // LRU: big bakes get evicted once neither displayed nor mid-crossfade.
    this.cacheOrder = [season, ...this.cacheOrder.filter((s) => s !== season)];
    while (this.cacheOrder.length > 2) {
      const evict = this.cacheOrder[this.cacheOrder.length - 1];
      const old = this.cache.get(evict);
      if (!old || old === rt || old === this.prevSprite.texture) break;
      old.destroy(true);
      this.cache.delete(evict);
      this.cacheOrder.pop();
    }
    if (this.sprite.texture !== rt) {
      const fade = BALANCE.render.seasonFadeSeconds;
      // Crossfade from the old bake instead of hard-cutting the whole map.
      if (!this.justInvalidated && this.sprite.texture.width > 1 && fade > 0) {
        this.prevSprite.texture = this.sprite.texture;
        this.prevSprite.scale.copyFrom(this.sprite.scale);
        this.prevSprite.alpha = 1;
        this.prevSprite.visible = true;
        this.fadeLeft = fade;
      }
      this.justInvalidated = false;
      this.sprite.texture = rt;
      const bake = this.textures.terrainTiles ? BALANCE.render.terrainBakeScale : 1;
      this.sprite.scale.set(1 / bake);
    }
    if (this.fadeLeft > 0) {
      this.fadeLeft = Math.max(0, this.fadeLeft - dt);
      const t = 1 - this.fadeLeft / BALANCE.render.seasonFadeSeconds;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.prevSprite.alpha = 1 - ease;
      if (this.fadeLeft === 0) this.prevSprite.visible = false;
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

  /** A ramp sprite fading inward from the given side of tile (x, y).
      Side order matches the neighbor scan: 0 W, 1 E, 2 N, 3 S. The optional
      t0/len (fractions of the edge) cover only part of the edge, letting
      callers subdivide an edge into independently jittered runs. */
  private edgeRamp(
    x: number,
    y: number,
    side: number,
    ts: number,
    depth: number,
    color: number,
    alpha: number,
    t0 = 0,
    len = 1,
  ): Sprite {
    const HALF_PI = Math.PI / 2;
    const fog = new Sprite(this.ramp!);
    fog.rotation = side === 0 ? 0 : side === 1 ? Math.PI : side === 2 ? HALF_PI : -HALF_PI;
    fog.width = depth;
    fog.height = len * ts;
    fog.tint = color;
    fog.alpha = alpha;
    if (side === 0) fog.position.set(x * ts, (y + t0) * ts);
    else if (side === 1) fog.position.set((x + 1) * ts, (y + 1 - t0) * ts);
    else if (side === 2) fog.position.set((x + 1 - t0) * ts, y * ts);
    else fog.position.set((x + t0) * ts, (y + 1) * ts);
    return fog;
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
        const cells = tiles[season][t];
        const variation = Math.floor(hash2(seed ^ 0x51ce, x, y) * cells.length);
        let sp: Sprite;
        if (t === Terrain.River && rivers) {
          // The bend/mouth sheets stay 3-variant even when the terrain sheets
          // carry 6 — fold the index down for the river shapes only.
          const rv = variation % rivers[season][0].length;
          const piece = this.riverPiece(x, y, rivers[season], rv, cells[variation]);
          sp = new Sprite(piece.tex);
          sp.anchor.set(0.5);
          sp.rotation = piece.rot;
          sp.position.set((x + 0.5) * ts, (y + 0.5) * ts);
        } else {
          sp = new Sprite(cells[variation]);
          sp.position.set(x * ts, y * ts);
        }
        sp.width = ts;
        sp.height = ts;
        // The mountain art carries a vertical ridge spine in most variants;
        // tiled across a range it reads as parallel stripes (worst against
        // winter snow). A deterministic quarter-turn per tile breaks the
        // ridges into a crosshatch — rock under snow tolerates the rotated
        // lighting where other biomes wouldn't.
        if (t === Terrain.Mountain) {
          sp.anchor.set(0.5);
          sp.rotation = (Math.floor(hash2(seed ^ 0x3f1d, x, y) * 4) * Math.PI) / 2;
          sp.position.set((x + 0.5) * ts, (y + 0.5) * ts);
        }
        // The painted tiles are darker than the flat palette; lift the bake.
        // Variant gain flattens brightness differences between the art
        // variants; the biome grade nudges each biome toward one hue family.
        const gain = gains[t]?.[variation] ?? 1;
        const g = Math.min(1, this.shadeAt(x, y) * 1.18 * gain);
        sp.tint = scaleColor(BIOME_GRADE[t] ?? 0xffffff, g);
        container.addChild(sp);
      }
    }

    // Biome edge blending: where two land biomes meet, fog a half-tile of the
    // neighbor's palette color across the seam so texture cuts read as
    // transitions instead of grid lines. Land-river edges stay crisp (the
    // river art carries its own banks); ocean edges get the shoreline below.
    if (!this.ramp) this.ramp = gradientRamp();
    const cfgR = BALANCE.render;
    const isWater = (t: Terrain): boolean => t === Terrain.Ocean || t === Terrain.River;
    // Neighbor offsets in side order: 0 W, 1 E, 2 N, 3 S.
    const SIDES: [number, number, number][] = [
      [-1, 0, 0],
      [1, 0, 1],
      [0, -1, 2],
      [0, 1, 3],
    ];
    const depth = ts * 0.5;
    const sandDepth = ts * cfgR.shoreSandDepth;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = terrain[y * width + x] as Terrain;
        if (isWater(t)) continue;
        for (const [dx, dy, side] of SIDES) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nt = terrain[ny * width + nx] as Terrain;
          if (nt === t) continue;
          if (nt === Terrain.Ocean) {
            // Shoreline, land side: sand fades inland from the waterline.
            const j = 1 + (hash2(seed ^ 0x5a4d, x * 4 + side, y) - 0.5) * 2 * cfgR.shoreJitter;
            container.addChild(
              this.edgeRamp(
                x,
                y,
                side,
                ts,
                sandDepth,
                cfgR.shoreSandColor,
                cfgR.shoreSandAlpha * j,
              ),
            );
          } else if (!isWater(nt)) {
            container.addChild(
              this.edgeRamp(x, y, side, ts, depth, TERRAIN_DEFS[nt].seasonColors[season], 0.22),
            );
          }
        }
      }
    }
    // Calm deep-water noise with a multiply tint: enforces the blue while the
    // brighter wave pixels still punch through (kills the distance moiré).
    if (cfgR.waterFlattenAlpha > 0) {
      const water = new Graphics();
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if ((terrain[y * width + x] as Terrain) === Terrain.Ocean) {
            water.rect(x * ts, y * ts, ts, ts);
          }
        }
      }
      water.fill({ color: cfgR.waterFlattenColor, alpha: cfgR.waterFlattenAlpha });
      water.blendMode = 'multiply';
      container.addChild(water);
    }
    // Shoreline, ocean side: a shallow-water band and a thin foam seam hug
    // every land edge. Drawn after the water flatten so they stay luminous;
    // alpha-jittered per edge so the band doesn't read as a grid outline.
    // River mouths are skipped — that art carries its own blend.
    const shallowDepth = ts * cfgR.shoreShallowDepth;
    const foamW = ts * cfgR.shoreFoamWidth;
    const foam = new Graphics();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if ((terrain[y * width + x] as Terrain) !== Terrain.Ocean) continue;
        for (const [dx, dy, side] of SIDES) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (isWater(terrain[ny * width + nx] as Terrain)) continue;
          // Two stacked ramps: a continuous base band (no jitter — close-up
          // it must read as one smooth gradient, not patches) plus a faint
          // half-edge jittered layer whose depth wanders, so the outer
          // boundary stays organic without per-edge alpha steps.
          container.addChild(
            this.edgeRamp(
              x,
              y,
              side,
              ts,
              shallowDepth * 0.75,
              cfgR.shoreShallowColor,
              cfgR.shoreShallowAlpha * 0.7,
            ),
          );
          for (let h = 0; h < 2; h++) {
            const j =
              1 + (hash2(seed ^ 0xc0a7, x * 8 + side * 2 + h, y) - 0.5) * 2 * cfgR.shoreJitter;
            const dj = 0.85 + hash2(seed ^ 0x77e1, x * 8 + side * 2 + h, y) * 0.55;
            container.addChild(
              this.edgeRamp(
                x,
                y,
                side,
                ts,
                shallowDepth * dj,
                cfgR.shoreShallowColor,
                cfgR.shoreShallowAlpha * 0.45 * j,
                h * 0.5,
                0.5,
              ),
            );
          }
          const fj = 1 + (hash2(seed ^ 0xf0a3, x * 4 + side, y) - 0.5) * 2 * cfgR.shoreJitter;
          if (side === 0) foam.rect(x * ts, y * ts, foamW, ts);
          else if (side === 1) foam.rect((x + 1) * ts - foamW, y * ts, foamW, ts);
          else if (side === 2) foam.rect(x * ts, y * ts, ts, foamW);
          else foam.rect(x * ts, (y + 1) * ts - foamW, ts, foamW);
          foam.fill({ color: cfgR.shoreFoamColor, alpha: cfgR.shoreFoamAlpha * fj });
        }
      }
    }
    container.addChild(foam);
    // Soften terrain contrast so settlements/citizens pop above it. Spring's
    // art runs olive, so it gets a fresh green correction instead of neutral.
    const softColor = season === 0 ? cfgR.springTintColor : cfgR.terrainSoftenColor;
    const softAlpha = season === 0 ? cfgR.springTintAlpha : cfgR.terrainSoftenAlpha;
    if (softAlpha > 0) {
      const soften = new Graphics()
        .rect(0, 0, width * ts, height * ts)
        .fill({ color: softColor, alpha: softAlpha });
      container.addChild(soften);
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
