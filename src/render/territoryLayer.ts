/** Civ territory overlay: soft fills plus brighter borders, redrawn on change. */
import { Graphics } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { SimState } from '../core/types';

export class TerritoryLayer {
  g = new Graphics();
  private drawnVersion = -1;
  private sinceDraw = Infinity;

  update(dt: number, state: SimState): void {
    this.sinceDraw += dt;
    if (
      state.territoryVersion !== this.drawnVersion &&
      this.sinceDraw >= BALANCE.render.territoryRedrawInterval
    ) {
      this.redraw(state);
      this.drawnVersion = state.territoryVersion;
      this.sinceDraw = 0;
    }
  }

  private redraw(state: SimState): void {
    const ts = BALANCE.map.tileSize;
    const { width, height, owner } = state.world;
    const cfg = BALANCE.render;
    this.g.clear();

    // Group rects per civ so each color is one fill batch.
    const fillTiles = new Map<number, number[]>();
    const borderRects = new Map<number, number[]>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const o = owner[i];
        if (o < 0) continue;
        let arr = fillTiles.get(o);
        if (!arr) fillTiles.set(o, (arr = []));
        arr.push(i);

        let edges = borderRects.get(o);
        if (!edges) borderRects.set(o, (edges = []));
        if (x === 0 || owner[i - 1] !== o) edges.push(i * 4);
        if (x === width - 1 || owner[i + 1] !== o) edges.push(i * 4 + 1);
        if (y === 0 || owner[i - width] !== o) edges.push(i * 4 + 2);
        if (y === height - 1 || owner[i + width] !== o) edges.push(i * 4 + 3);
      }
    }

    for (const [civId, tiles] of fillTiles) {
      const color = state.civs[civId]?.color ?? 0xffffff;
      for (const i of tiles) {
        const x = i % width;
        const y = Math.floor(i / width);
        this.g.rect(x * ts, y * ts, ts, ts);
      }
      this.g.fill({ color, alpha: cfg.territoryFillAlpha });
    }

    for (const [civId, edges] of borderRects) {
      const color = state.civs[civId]?.color ?? 0xffffff;
      for (const e of edges) {
        const i = Math.floor(e / 4);
        const side = e % 4;
        const x = (i % width) * ts;
        const y = Math.floor(i / width) * ts;
        if (side === 0) this.g.rect(x, y, 1, ts);
        else if (side === 1) this.g.rect(x + ts - 1, y, 1, ts);
        else if (side === 2) this.g.rect(x, y, ts, 1);
        else this.g.rect(x, y + ts - 1, ts, 1);
      }
      this.g.fill({ color, alpha: cfg.territoryBorderAlpha });
      // A soft inner band makes the frontier read as a glow, not a hairline.
      for (const e of edges) {
        const i = Math.floor(e / 4);
        const side = e % 4;
        const x = (i % width) * ts;
        const y = Math.floor(i / width) * ts;
        if (side === 0) this.g.rect(x, y, 3, ts);
        else if (side === 1) this.g.rect(x + ts - 3, y, 3, ts);
        else if (side === 2) this.g.rect(x, y, ts, 3);
        else this.g.rect(x, y + ts - 3, ts, 3);
      }
      this.g.fill({ color, alpha: 0.13 });
    }
  }
}
