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
    ['tree_broadleaf', 0.085, 6.8],
    ['rock', 0.015, 4.0],
  ],
  // Mountains tile repetitively — heavy rock + conifer scatter breaks it up.
  [Terrain.Mountain]: [
    ['rock', 0.2, 4.8],
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
  tree_broadleaf: [0xd8f5c8, 0xffffff, 0xe8a85e, 0xb9c2cc],
  tree_conifer: [0xeaffea, 0xffffff, 0xe8f0dd, 0xdde8f5],
  bush: [0xd8f5c8, 0xffffff, 0xdfa868, 0xb9c2cc],
  reed: [0xe5f5d5, 0xffffff, 0xe8c98e, 0xcdd6da],
  rock: [0xffffff, 0xffffff, 0xf2e8da, 0xe2e9f2],
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

    // No decor under or right beside settlements and ruins.
    const blocked = new Set<number>();
    const block = (cx: number, cy: number, r: number): void => {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) blocked.add(ny * width + nx);
        }
      }
    };
    for (const s of state.settlements) block(s.x, s.y, 2);
    for (const r of state.ruins) block(r.x, r.y, 1);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const t = terrain[i] as Terrain;
        const options = SCATTER[t];
        if (!options || blocked.has(i) || state.roads[i] > 0) continue;
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
