/**
 * Terrain decor scatter: rocks, tree clusters, reeds and bushes (batch-10 art)
 * placed deterministically per tile from hash2 — pure set dressing, zero sim
 * impact. Rebuilt (throttled) when season, terrain, roads or settlements
 * change so decor never sits under a village or on a road.
 */
import { Container, Sprite } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { hash2 } from '../core/rng';
import { Terrain, type Season, type SimState } from '../core/types';
import type { GameTextures } from './textures';

/** [kind, chance, world-px width] per biome; checked in order. */
const SCATTER: Partial<Record<Terrain, [string, number, number][]>> = {
  [Terrain.Grassland]: [
    ['bush', 0.035, 3.6],
    ['tree_broadleaf', 0.03, 6.2],
    ['rock', 0.012, 4.2],
  ],
  [Terrain.Forest]: [
    ['canopy', 0.045, 13],
    ['tree_broadleaf', 0.085, 6.8],
    ['rock', 0.015, 4.0],
  ],
  // Mountains tile repetitively — landmark formations + heavy scatter.
  [Terrain.Mountain]: [
    ['mountain_formation', 0.06, 15],
    ['rock', 0.16, 4.8],
    ['tree_conifer', 0.05, 5.2],
  ],
  [Terrain.Tundra]: [
    ['tree_conifer', 0.06, 5.6],
    ['rock', 0.045, 4.2],
  ],
  [Terrain.Swamp]: [
    ['reed', 0.1, 4.0],
    ['bush', 0.02, 3.4],
  ],
  [Terrain.Coast]: [
    ['reed', 0.04, 3.8],
    ['rock', 0.018, 4.0],
  ],
  [Terrain.Desert]: [['rock', 0.04, 4.4]],
};

/** Seasonal multiply tints per decor kind (spring/summer/autumn/winter). */
const SEASON_TINT: Record<string, [number, number, number, number]> = {
  mountain_formation: [0xffffff, 0xffffff, 0xf2e8da, 0xdde5f0],
  canopy: [0xd8f5c8, 0xffffff, 0xe8a85e, 0xb9c2cc],
  tree_broadleaf: [0xd8f5c8, 0xffffff, 0xe8a85e, 0xb9c2cc],
  tree_conifer: [0xeaffea, 0xffffff, 0xe8f0dd, 0xdde8f5],
  bush: [0xd8f5c8, 0xffffff, 0xdfa868, 0xb9c2cc],
  reed: [0xe5f5d5, 0xffffff, 0xe8c98e, 0xcdd6da],
  rock: [0xffffff, 0xffffff, 0xf2e8da, 0xe2e9f2],
  // Worked land: tilled-brown spring → green summer → harvest-gold autumn →
  // frosted-bare winter.
  field: [0xe6dcb4, 0xffffff, 0xe6b25e, 0xc6d0dc],
};

export class DecorLayer {
  container = new Container();
  private builtKey = '';
  private sinceRebuild = Infinity;

  constructor(private tex: GameTextures) {}

  update(dt: number, state: SimState, season: Season): void {
    this.sinceRebuild += dt;
    const key = `${season}:${state.terrainVersion}:${state.territoryVersion}:${state.roadsVersion}`;
    if (key === this.builtKey || this.sinceRebuild < 5) return;
    this.builtKey = key;
    this.sinceRebuild = 0;
    this.rebuild(state, season);
  }

  private rebuild(state: SimState, season: Season): void {
    for (const c of [...this.container.children]) c.destroy();
    const decor = this.tex.decor;
    if (!decor) return;
    const { width, height, terrain, seed } = state.world;
    const ts = BALANCE.map.tileSize;

    // No decor under or right beside settlements and ruins. Landmark decor
    // (canopies, mountain formations) is sprite-sized like a building block
    // and town clusters span 2-5 tiles — without the wider per-tier ring a
    // canopy anchored beside a town pokes its crown into the empty plaza
    // and reads as a giant tree swallowing the buildings.
    const blocked = new Set<number>();
    const blockedLandmark = new Set<number>();
    const block = (set: Set<number>, cx: number, cy: number, r: number): void => {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) set.add(ny * width + nx);
        }
      }
    };
    for (const s of state.settlements) {
      block(blocked, s.x, s.y, 2);
      block(blockedLandmark, s.x, s.y, 4 + s.tier);
    }
    for (const r of state.ruins) {
      block(blocked, r.x, r.y, 1);
      block(blockedLandmark, r.x, r.y, 3);
    }
    const LANDMARK = new Set(['canopy', 'mountain_formation']);

    // Agricultural halo: worked fields ring each established settlement on
    // buildable grassland (inverse bias to normal decor — fields hug a town,
    // thinning with distance). Tiles clump into FURLONG BLOCKS that share one
    // crop and one strip direction, rendered as elongated strips, so the land
    // reads as angled medieval open-field furlongs with awkward seams between
    // blocks — not a per-tile board-game quilt. Recorded in `fieldTiles` so
    // trees/rocks never sprout on tilled ground.
    const fieldTiles = new Set<number>();
    const fields = this.tex.decor?.field;
    if (fields?.length) {
      for (const s of state.settlements) {
        if (s.tier < 1) continue; // camps are too new to have open fields
        const R = 2 + s.tier * 2; // village ≈ 4 tiles, town ≈ 6
        for (let dy = -R; dy <= R; dy++) {
          for (let dx = -R; dx <= R; dx++) {
            const nx = s.x + dx;
            const ny = s.y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const i = ny * width + nx;
            if (fieldTiles.has(i)) continue;
            if (blocked.has(i) || state.roads[i] > 0) continue;
            if ((terrain[i] as Terrain) !== Terrain.Grassland) continue;
            const dist = Math.max(Math.abs(dx), Math.abs(dy));
            const chance = 0.9 - (dist / (R + 1)) * 0.5;
            if (hash2(seed ^ 0xf1e1, nx, ny) >= chance) continue;
            fieldTiles.add(i);
            // Furlong block (4×3 tiles): one crop + one strip heading, varied
            // per block so adjacent furlongs run at clashing angles.
            const bx = Math.floor(nx / 4);
            const by = Math.floor(ny / 3);
            const heading = (hash2(seed ^ 0xf1f0, bx, by) - 0.5) * 1.1; // ±~31°
            const variant = Math.floor(hash2(seed ^ 0xf1f2, bx, by) * fields.length);
            const sp = new Sprite(fields[variant]);
            sp.anchor.set(0.5, 0.5); // flat ground patch, not a standing object
            sp.rotation = heading;
            const lenW = 13 * (0.82 + hash2(seed ^ 0xf1e3, nx, ny) * 0.3); // along furlong
            const widW = 7.5 * (0.8 + hash2(seed ^ 0xf1e5, nx, ny) * 0.4); // across strips
            sp.scale.set(lenW / sp.texture.width, widW / sp.texture.height);
            sp.position.set(
              (nx + 0.5 + (hash2(seed ^ 0xf1e4, nx, ny) - 0.5) * 0.5) * ts,
              (ny + 0.5 + (hash2(seed ^ 0xf1e6, nx, ny) - 0.5) * 0.5) * ts,
            );
            sp.tint = SEASON_TINT.field?.[season] ?? 0xffffff;
            this.container.addChild(sp);
          }
        }
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const t = terrain[i] as Terrain;
        const options = SCATTER[t];
        if (!options || blocked.has(i) || fieldTiles.has(i) || state.roads[i] > 0) continue;
        const roll = hash2(seed ^ 0xdec0, x, y);
        let acc = 0;
        for (const [kind, chance, w] of options) {
          // Reeds crowd the waterline: triple chance beside river tiles.
          let c = chance;
          if (kind === 'reed') {
            const nearRiver =
              (x > 0 && terrain[i - 1] === Terrain.River) ||
              (x < width - 1 && terrain[i + 1] === Terrain.River) ||
              (y > 0 && terrain[i - width] === Terrain.River) ||
              (y < height - 1 && terrain[i + width] === Terrain.River);
            if (nearRiver) c *= 3;
          }
          acc += c;
          if (roll >= acc) continue;
          if (LANDMARK.has(kind) && blockedLandmark.has(i)) break;
          const list = decor[kind];
          if (!list?.length) break;
          const variant = Math.floor(hash2(seed ^ 0xdec1, x, y) * list.length);
          const sp = new Sprite(list[variant]);
          sp.anchor.set(0.5, 0.88);
          const size = w * (0.85 + hash2(seed ^ 0xdec2, x, y) * 0.3);
          sp.scale.set(size / sp.texture.width);
          if (hash2(seed ^ 0xdec3, x, y) < 0.5) sp.scale.x *= -1;
          sp.position.set(
            (x + 0.3 + hash2(seed ^ 0xdec4, x, y) * 0.4) * ts,
            (y + 0.35 + hash2(seed ^ 0xdec5, x, y) * 0.45) * ts,
          );
          sp.tint = SEASON_TINT[kind]?.[season] ?? 0xffffff;
          this.container.addChild(sp);
          break;
        }
      }
    }
  }
}
