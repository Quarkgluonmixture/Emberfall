/**
 * Road rendering: worn dirt paths stroked from the derived road network.
 * Baked into one Graphics and redrawn only when road geometry or the visual
 * footprint of its settlement endpoints changes.
 */
import { Graphics } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { hash2 } from '../core/rng';
import { Terrain, type SimState } from '../core/types';
import type { GameTextures } from './textures';

const ROAD_EDGE = 0x52402a;
const ROAD_COLOR = 0x8d6e4a;
const ROAD_WORN = 0xb29066;

interface Polyline {
  pts: { x: number; y: number }[];
  /** levels[k] is the usage level of the segment pts[k] → pts[k+1]. */
  levels: number[];
}

/** A tiny cache signature for the settlement footprint data road baking uses. */
export function settlementTierSignature(state: SimState): string {
  return state.settlements.map((s) => `${s.id}:${s.tier}`).join('|');
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
  private bakedPaths: SimState['roadPaths'] | null = null;
  private bakedTiers = '';

  update(state: SimState, tex?: GameTextures): void {
    const tiers = settlementTierSignature(state);
    if (
      state.roadsVersion === this.bakedVersion &&
      state.roadPaths === this.bakedPaths &&
      tiers === this.bakedTiers
    )
      return;
    this.bakedVersion = state.roadsVersion;
    this.bakedPaths = state.roadPaths;
    this.bakedTiers = tiers;
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
    // heavier.
    const passes: { color: number; widen: number; alpha: (level: number) => number }[] = [
      { color: ROAD_EDGE, widen: 1.0, alpha: (l) => 0.16 + l * 0.06 },
      { color: ROAD_COLOR, widen: 0, alpha: (l) => 0.42 + l * 0.11 },
      { color: ROAD_WORN, widen: -0.65, alpha: (l) => 0.1 + l * 0.08 },
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
            width: Math.max(0.3, 1.0 + level * 0.5 + pass.widen * (0.6 + level * 0.2)),
            alpha: pass.alpha(level),
            cap: 'round',
            join: 'round',
          });
        }
      }
    }

    // ── Crossings ────────────────────────────────────────────────────
    // Where a road — or a town's wall ring — meets a river, lay a plank bridge
    // over the water, so terrain and infrastructure visibly interact.
    const terrain = state.world.terrain;
    const H = state.world.height;
    const bridge = tex?.bridge ?? null;
    const bridged = new Set<number>();
    const drawBridge = (cx: number, cy: number, ux: number, uy: number, useFord: boolean): void => {
      const horizontal = Math.abs(ux) >= Math.abs(uy);
      if (bridge) {
        const piece = horizontal
          ? useFord
            ? bridge.fordH
            : bridge.h
          : useFord
            ? bridge.fordV
            : bridge.v;
        const long = ts * 1.8;
        const w = horizontal ? long : long * (piece.width / piece.height);
        const h = horizontal ? long * (piece.height / piece.width) : long;
        g.texture(piece, 0xffffff, cx - w / 2, cy - h / 2, w, h);
        return;
      }
      const halfL = ts * 0.78;
      const halfW = ts * 0.3;
      const vx = -uy;
      const vy = ux;
      const cor = (a: number, b: number): [number, number] => [
        cx + ux * a + vx * b,
        cy + uy * a + vy * b,
      ];
      const deck = [...cor(halfL, halfW), ...cor(halfL, -halfW), ...cor(-halfL, -halfW), ...cor(-halfL, halfW)];
      g.poly(deck).fill({ color: 0x6b4f30, alpha: 0.98 });
      g.poly(deck).stroke({ color: 0x3a2a18, width: 0.5, alpha: 0.85 });
      for (let a = -halfL + ts * 0.2; a < halfL; a += ts * 0.22) {
        const [pa, pb] = cor(a, halfW);
        const [pc, pd] = cor(a, -halfW);
        g.moveTo(pa, pb).lineTo(pc, pd);
      }
      g.stroke({ color: 0x4a371f, width: 0.4, alpha: 0.55 });
      const [ra, rb] = cor(halfL, halfW);
      const [rc, rd] = cor(-halfL, halfW);
      const [sa, sb] = cor(halfL, -halfW);
      const [sc, sd] = cor(-halfL, -halfW);
      g.moveTo(ra, rb).lineTo(rc, rd).moveTo(sa, sb).lineTo(sc, sd);
      g.stroke({ color: 0x8a6a44, width: 0.55, alpha: 0.9 });
    };

    // Road × river: deck runs along the road direction at the crossing.
    for (const path of state.roadPaths) {
      const t = path.tiles;
      for (let k = 0; k < t.length; k++) {
        if (terrain[t[k]] !== Terrain.River || bridged.has(t[k])) continue;
        const a = t[Math.max(0, k - 1)];
        const b = t[Math.min(t.length - 1, k + 1)];
        const len = Math.hypot(px(b) - px(a), py(b) - py(a)) || 1;
        bridged.add(t[k]);
        drawBridge(px(t[k]), py(t[k]), (px(b) - px(a)) / len, (py(b) - py(a)) / len, false);
      }
    }

    // Town × river: the wall ring spans a river — bridge it (deck across the
    // flow) so the town reads as crossing the water, not swallowing it.
    const flowPerp = (tile: number): [number, number] => {
      const x = tile % W;
      const y = (tile / W) | 0;
      let fx = 0;
      let fy = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && terrain[ny * W + nx] === Terrain.River) {
          fx += dx;
          fy += dy;
        }
      }
      const len = Math.hypot(fx, fy);
      return len > 0 ? [-fy / len, fx / len] : [1, 0];
    };
    for (const s of state.settlements) {
      if (s.tier < 1) continue;
      const rad = Math.ceil(BALANCE.render.settlementWidths[s.tier] / ts / 2) + 1;
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const x = s.x + dx;
          const y = s.y + dy;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const tile = y * W + x;
          if (terrain[tile] !== Terrain.River || bridged.has(tile)) continue;
          bridged.add(tile);
          const [ux, uy] = flowPerp(tile);
          drawBridge((x + 0.5) * ts, (y + 0.5) * ts, ux, uy, true);
        }
      }
    }
  }
}
