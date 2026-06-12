/**
 * Road rendering: worn dirt paths stroked from the derived road network.
 * Baked into one Graphics, redrawn only when state.roadsVersion changes.
 * Three passes per usage level — dark rut shadow, dirt body, pale worn
 * center — so trunk roads read as packed earth instead of uniform vector
 * strokes. Lane ends are trimmed at the settlement cluster edge so roads
 * stop at the walls instead of slicing under the wall art to the center.
 */
import { Graphics } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { hash2 } from '../core/rng';
import type { SimState } from '../core/types';

const ROAD_EDGE = 0x52402a;
const ROAD_COLOR = 0x8d6e4a;
const ROAD_WORN = 0xb29066;

interface Polyline {
  pts: { x: number; y: number }[];
  /** levels[k] is the usage level of the segment pts[k] → pts[k+1]. */
  levels: number[];
}

/**
 * Drop leading polyline points inside the circle and move the cut end onto
 * its boundary. Returns false when the whole line lies inside.
 */
function trimToCircle(line: Polyline, cx: number, cy: number, r: number): boolean {
  const { pts, levels } = line;
  const r2 = r * r;
  const inside = (p: { x: number; y: number }): boolean => (p.x - cx) ** 2 + (p.y - cy) ** 2 <= r2;
  let i = 0;
  while (i < pts.length && inside(pts[i])) i++;
  if (i === pts.length) return false;
  if (i > 0) {
    // Slide the cut point onto the circle along the crossing segment.
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const fx = a.x - cx;
    const fy = a.y - cy;
    const A = dx * dx + dy * dy;
    const B = 2 * (fx * dx + fy * dy);
    const C = fx * fx + fy * fy - r2;
    const disc = B * B - 4 * A * C;
    const t = A > 0 && disc > 0 ? Math.min(1, Math.max(0, (-B + Math.sqrt(disc)) / (2 * A))) : 0;
    pts.splice(0, i - 1);
    levels.splice(0, i - 1);
    pts[0] = { x: a.x + dx * t, y: a.y + dy * t };
  }
  return true;
}

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

    // Roads stop just outside the settlement footprint (walls included).
    const byId = new Map(state.settlements.map((s) => [s.id, s]));
    const trim = (line: Polyline, id: number): boolean => {
      const s = byId.get(id);
      if (!s) return true;
      const r = (BALANCE.render.settlementWidths[s.tier] / 2) * 1.1;
      return trimToCircle(line, (s.x + 0.5) * ts, (s.y + 0.5) * ts, r);
    };

    const lines: Polyline[] = [];
    for (const path of state.roadPaths) {
      if (path.tiles.length < 2) continue;
      const line: Polyline = {
        pts: path.tiles.map((i) => ({ x: px(i), y: py(i) })),
        levels: [],
      };
      for (let k = 1; k < path.tiles.length; k++) {
        line.levels.push(Math.max(state.roads[path.tiles[k - 1]], state.roads[path.tiles[k]]));
      }
      if (!trim(line, path.a)) continue;
      line.pts.reverse();
      line.levels.reverse();
      if (!trim(line, path.b)) continue;
      if (line.pts.length >= 2) lines.push(line);
    }

    // Pass order = draw order: rut shadow under, dirt body, worn center on
    // top. Within a pass, one stroke per usage level so trunk roads read
    // heavier. All bake-time work — redrawn only on roadsVersion bumps.
    const passes: { color: number; widen: number; alpha: (level: number) => number }[] = [
      { color: ROAD_EDGE, widen: 1.0, alpha: (l) => 0.1 + l * 0.05 },
      { color: ROAD_COLOR, widen: 0, alpha: (l) => 0.26 + l * 0.09 },
      { color: ROAD_WORN, widen: -0.65, alpha: (l) => 0.07 + l * 0.07 },
    ];
    for (const pass of passes) {
      for (let level = 1; level <= 3; level++) {
        let any = false;
        for (const line of lines) {
          for (let k = 0; k < line.levels.length; k++) {
            if (line.levels[k] !== level) continue;
            g.moveTo(line.pts[k].x, line.pts[k].y).lineTo(line.pts[k + 1].x, line.pts[k + 1].y);
            any = true;
          }
        }
        if (any) {
          g.stroke({
            color: pass.color,
            width: Math.max(0.3, 0.8 + level * 0.4 + pass.widen * (0.6 + level * 0.2)),
            alpha: pass.alpha(level),
            cap: 'round',
            join: 'round',
          });
        }
      }
    }
  }
}
