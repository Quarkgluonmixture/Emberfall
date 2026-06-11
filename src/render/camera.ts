/** Pan/zoom camera. Owns the root world container's transform. */
import { Container } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { ViewBounds } from '../sim/agents';

export class Camera {
  root = new Container();
  /** World-pixel coordinates of the screen center. */
  x = 0;
  y = 0;
  scale: number = BALANCE.render.defaultZoom;

  private worldW: number;
  private worldH: number;
  private screenW = 1;
  private screenH = 1;

  /** Active cinematic flight, if any. */
  private flight: {
    fx: number;
    fy: number;
    fs: number;
    tx: number;
    ty: number;
    ts: number;
    t: number;
    dur: number;
  } | null = null;

  /** Invoked on any direct user interaction (used to exit attract mode). */
  onInput: (() => void) | null = null;

  constructor(worldTilesW: number, worldTilesH: number) {
    this.worldW = worldTilesW * BALANCE.map.tileSize;
    this.worldH = worldTilesH * BALANCE.map.tileSize;
    this.x = this.worldW / 2;
    this.y = this.worldH / 2;
  }

  /** Wire pointer pan, wheel zoom and click-pick onto the canvas. */
  attach(canvas: HTMLCanvasElement, onPick: (sx: number, sy: number) => void): void {
    let down = false;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    canvas.addEventListener('pointerdown', (e) => {
      down = true;
      dragging = false;
      lastX = e.offsetX;
      lastY = e.offsetY;
      canvas.setPointerCapture(e.pointerId);
      this.cancelFlight();
      this.onInput?.();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.offsetX - lastX;
      const dy = e.offsetY - lastY;
      if (!dragging && Math.abs(dx) + Math.abs(dy) > 4) dragging = true;
      if (dragging) {
        this.x -= dx / this.scale;
        this.y -= dy / this.scale;
        lastX = e.offsetX;
        lastY = e.offsetY;
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      if (down && !dragging) onPick(e.offsetX, e.offsetY);
      down = false;
      dragging = false;
    });
    canvas.addEventListener('pointercancel', () => {
      down = false;
      dragging = false;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.cancelFlight();
        this.onInput?.();
        const cfg = BALANCE.render;
        const factor = Math.pow(cfg.zoomStep, -e.deltaY / 100);
        const before = this.screenToWorld(e.offsetX, e.offsetY);
        this.scale = Math.min(cfg.maxZoom, Math.max(cfg.minZoom, this.scale * factor));
        const after = this.screenToWorld(e.offsetX, e.offsetY);
        this.x += before.x - after.x;
        this.y += before.y - after.y;
        void before;
      },
      { passive: false },
    );
  }

  flying(): boolean {
    return this.flight !== null;
  }

  /** Begin a smooth eased flight to a world-pixel position and zoom level. */
  flyTo(worldX: number, worldY: number, scale: number, duration: number): void {
    const cfg = BALANCE.render;
    this.flight = {
      fx: this.x,
      fy: this.y,
      fs: this.scale,
      tx: worldX,
      ty: worldY,
      ts: Math.min(cfg.maxZoom, Math.max(cfg.minZoom, scale)),
      t: 0,
      dur: Math.max(0.1, duration),
    };
  }

  cancelFlight(): void {
    this.flight = null;
  }

  /** Advance the active flight (ease-in-out, zoom interpolated in log space). */
  update(dt: number): void {
    const f = this.flight;
    if (!f) return;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    this.x = f.fx + (f.tx - f.fx) * e;
    this.y = f.fy + (f.ty - f.fy) * e;
    this.scale = f.fs * Math.pow(f.ts / f.fs, e);
    if (k >= 1) this.flight = null;
  }

  /** Clamp the view and write the transform into the root container. */
  apply(screenW: number, screenH: number): void {
    this.screenW = screenW;
    this.screenH = screenH;
    const margin = 60 / this.scale;
    this.x = Math.min(this.worldW + margin, Math.max(-margin, this.x));
    this.y = Math.min(this.worldH + margin, Math.max(-margin, this.y));
    this.root.scale.set(this.scale);
    this.root.position.set(screenW / 2 - this.x * this.scale, screenH / 2 - this.y * this.scale);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: this.x + (sx - this.screenW / 2) / this.scale,
      y: this.y + (sy - this.screenH / 2) / this.scale,
    };
  }

  /** Visible region in tile coordinates. */
  viewTileBounds(): ViewBounds {
    const ts = BALANCE.map.tileSize;
    const halfW = this.screenW / 2 / this.scale;
    const halfH = this.screenH / 2 / this.scale;
    return {
      x0: (this.x - halfW) / ts,
      y0: (this.y - halfH) / ts,
      x1: (this.x + halfW) / ts,
      y1: (this.y + halfH) / ts,
    };
  }

  centerOn(tileX: number, tileY: number): void {
    const ts = BALANCE.map.tileSize;
    this.x = (tileX + 0.5) * ts;
    this.y = (tileY + 0.5) * ts;
  }
}
