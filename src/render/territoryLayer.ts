/**
 * Civ territory overlay: soft fills plus smooth border contours.
 *
 * Borders are traced as polylines (boundary unit-segments chained into loops,
 * then Chaikin-smoothed) and stroked, instead of per-tile rectangles — so a
 * frontier reads as a drawn line on painterly terrain, not a neon staircase of
 * spreadsheet cells. Geometry is cached per territoryVersion; a season change
 * only re-strokes (winter/autumn get softer borders so they stop looking like
 * a debug overlay pasted on snow). Cosmetic only — no RNG, no sim impact.
 */
import { Graphics } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { SimState } from '../core/types';
import { seasonOf } from '../sim/time';

interface CivContour {
  color: number;
  loops: { x: number; y: number }[][];
  fillTiles: number[];
}

/** Round off the tile-step staircase. Closed-loop Chaikin corner cutting. */
function chaikinClosed(pts: { x: number; y: number }[], iters: number): { x: number; y: number }[] {
  let p = pts;
  for (let it = 0; it < iters; it++) {
    const n = p.length;
    if (n < 3) break;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = p[i];
      const b = p[(i + 1) % n];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    p = out;
  }
  return p;
}

/** Chain boundary unit-segments (point-id pairs) into ordered loops. */
function traceLoops(segs: [number, number][]): number[][] {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = segs[i];
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(i);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(i);
  }
  const used = new Array<boolean>(segs.length).fill(false);
  const loops: number[][] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    const loop: number[] = [];
    const start = segs[s][0];
    let cur = start;
    let seg = s;
    while (seg !== -1 && !used[seg]) {
      used[seg] = true;
      const [a, b] = segs[seg];
      loop.push(cur);
      cur = a === cur ? b : a;
      seg = -1;
      for (const si of adj.get(cur) ?? []) {
        if (!used[si]) {
          seg = si;
          break;
        }
      }
      if (cur === start) break;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

export class TerritoryLayer {
  g = new Graphics();
  private drawnVersion = -1;
  private drawnSeason = -1;
  private sinceDraw = Infinity;
  private contours: CivContour[] = [];

  update(dt: number, state: SimState): void {
    this.sinceDraw += dt;
    const season = seasonOf(state.day);
    const stale = state.territoryVersion !== this.drawnVersion || season !== this.drawnSeason;
    if (stale && this.sinceDraw >= BALANCE.render.territoryRedrawInterval) {
      if (state.territoryVersion !== this.drawnVersion) this.rebuild(state);
      this.paint(season);
      this.drawnVersion = state.territoryVersion;
      this.drawnSeason = season;
      this.sinceDraw = 0;
    }
  }

  /** Recompute cached fills + smoothed border loops from current ownership. */
  private rebuild(state: SimState): void {
    const ts = BALANCE.map.tileSize;
    const { width, height, owner } = state.world;
    const pw = width + 1;
    const pid = (gx: number, gy: number) => gy * pw + gx;

    const fillByCiv = new Map<number, number[]>();
    const segsByCiv = new Map<number, [number, number][]>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const o = owner[i];
        if (o < 0) continue;
        (fillByCiv.get(o) ?? fillByCiv.set(o, []).get(o)!).push(i);
        const segs = segsByCiv.get(o) ?? segsByCiv.set(o, []).get(o)!;
        if (x === 0 || owner[i - 1] !== o) segs.push([pid(x, y), pid(x, y + 1)]);
        if (x === width - 1 || owner[i + 1] !== o) segs.push([pid(x + 1, y), pid(x + 1, y + 1)]);
        if (y === 0 || owner[i - width] !== o) segs.push([pid(x, y), pid(x + 1, y)]);
        if (y === height - 1 || owner[i + width] !== o) segs.push([pid(x, y + 1), pid(x + 1, y + 1)]);
      }
    }

    this.contours = [];
    for (const [civId, segs] of segsByCiv) {
      const loops = traceLoops(segs).map((ids) => {
        const pts = ids.map((id) => ({ x: (id % pw) * ts, y: Math.floor(id / pw) * ts }));
        return chaikinClosed(pts, 2);
      });
      this.contours.push({
        color: state.civs[civId]?.color ?? 0xffffff,
        loops,
        fillTiles: fillByCiv.get(civId) ?? [],
      });
    }
  }

  /** Stroke the cached geometry; season softens the border so winter snow and
      autumn earth don't get a loud outline pasted over them. */
  private paint(season: number): void {
    const ts = BALANCE.map.tileSize;
    const width = BALANCE.map.width;
    const cfg = BALANCE.render;
    // 3 = winter, 2 = autumn (seasonFoodMult order).
    const borderMul = season === 3 ? 0.62 : season === 2 ? 0.82 : 1;
    const fillMul = season === 3 ? 0.8 : 1;
    this.g.clear();

    for (const c of this.contours) {
      for (const i of c.fillTiles) {
        this.g.rect((i % width) * ts, Math.floor(i / width) * ts, ts, ts);
      }
      this.g.fill({ color: c.color, alpha: cfg.territoryFillAlpha * fillMul });
    }

    const trace = (loops: { x: number; y: number }[][]) => {
      for (const loop of loops) {
        this.g.moveTo(loop[0].x, loop[0].y);
        for (let i = 1; i < loop.length; i++) this.g.lineTo(loop[i].x, loop[i].y);
        this.g.closePath();
      }
    };
    for (const c of this.contours) {
      // Dark casing first so the colored contour sits on the ground, readable
      // over any terrain; then the civ-color line on top.
      trace(c.loops);
      this.g.stroke({ color: 0x000000, width: 2.2, alpha: 0.34 * borderMul, join: 'round', cap: 'round' });
      trace(c.loops);
      this.g.stroke({
        color: c.color,
        width: 1.4,
        alpha: cfg.territoryBorderAlpha * borderMul,
        join: 'round',
        cap: 'round',
      });
    }
  }
}
