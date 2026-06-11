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
