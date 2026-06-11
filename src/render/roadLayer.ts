/**
 * Road rendering: worn dirt paths stroked from the derived road network.
 * Baked into one Graphics, redrawn only when state.roadsVersion changes.
 */
import { Graphics } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { hash2 } from '../core/rng';
import type { SimState } from '../core/types';

const ROAD_COLOR = 0x8d6e4a;

export class RoadLayer {
  g = new Graphics();
  private bakedVersion = -1;

  update(state: SimState): void {
    if (state.roadsVersion === this.bakedVersion) return;
    this.bakedVersion = state.roadsVersion;
    const g = this.g;
    g.clear();

    const ts = BALANCE.map.tileSize;
    const W = state.world.width;
    const seed = state.world.seed;
    // Jittered tile centers make lanes wander like worn footpaths.
    const px = (i: number): number => {
      const x = i % W;
      const y = (i / W) | 0;
      return (x + 0.5 + (hash2(seed ^ 0x70ad, x, y) - 0.5) * 0.5) * ts;
    };
    const py = (i: number): number => {
      const x = i % W;
      const y = (i / W) | 0;
      return (y + 0.5 + (hash2(seed ^ 0xd071, x, y) - 0.5) * 0.5) * ts;
    };

    // One stroke pass per usage level so trunk roads read heavier.
    for (let level = 1; level <= 3; level++) {
      let any = false;
      for (const path of state.roadPaths) {
        for (let k = 1; k < path.tiles.length; k++) {
          const a = path.tiles[k - 1];
          const b = path.tiles[k];
          if (Math.max(state.roads[a], state.roads[b]) !== level) continue;
          g.moveTo(px(a), py(a)).lineTo(px(b), py(b));
          any = true;
        }
      }
      if (any) {
        g.stroke({
          color: ROAD_COLOR,
          width: 0.8 + level * 0.4,
          alpha: 0.26 + level * 0.09,
          cap: 'round',
          join: 'round',
        });
      }
    }
  }
}
