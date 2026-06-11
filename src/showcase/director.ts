/**
 * Attract-mode director: an automated cinematographer that tours the world,
 * cutting to breaking events and lingering on living places. Render-side
 * observer — reads SimState, never writes it.
 */
import { BALANCE } from '../config/balance';
import { RNG } from '../core/rng';
import type { SimState } from '../core/types';
import type { Camera } from '../render/camera';
import { EVENT_WEIGHTS, eventTargets, pickNextTarget, type InterestTarget } from './interest';

const BREAKING_WEIGHT = 7;

export class Director {
  active = false;
  /** The shot currently on screen (for the World Story overlay). */
  current: InterestTarget | null = null;

  private holdTimer = 0;
  private chronicleIndex = 0;
  private driftAngle = 0;
  private rng = new RNG(0xd12ec7);

  start(state: SimState, camera: Camera): void {
    this.active = true;
    this.chronicleIndex = state.chronicle.length;
    this.next(state, camera);
  }

  stop(): void {
    this.active = false;
    this.current = null;
  }

  update(dt: number, state: SimState, camera: Camera): void {
    if (!this.active) return;

    // Breaking news: a big located event interrupts the current shot.
    const fresh = eventTargets(state, this.chronicleIndex, 9999);
    this.chronicleIndex = state.chronicle.length;
    let breaking: InterestTarget | null = null;
    for (const t of fresh) {
      if ((EVENT_WEIGHTS[t.kind] ?? 0) >= BREAKING_WEIGHT) {
        if (!breaking || t.score > breaking.score) breaking = t;
      }
    }
    if (breaking) {
      this.goTo(breaking, camera);
      return;
    }

    this.holdTimer -= dt;
    if (this.holdTimer <= 0) {
      this.next(state, camera);
      return;
    }

    // While holding: a slow organic drift with a gentle push-in.
    if (!camera.flying()) {
      this.driftAngle += dt * 0.35;
      camera.x += Math.cos(this.driftAngle * 0.21) * dt * 2.2;
      camera.y += Math.sin(this.driftAngle * 0.17) * dt * 1.6;
      const maxZoom = BALANCE.render.maxZoom;
      camera.scale = Math.min(maxZoom, camera.scale * (1 + dt * 0.006));
    }
  }

  private next(state: SimState, camera: Camera): void {
    const ts = BALANCE.map.tileSize;
    const target = pickNextTarget(state, this.rng, camera.x / ts, camera.y / ts);
    if (!target) {
      this.holdTimer = 5;
      return;
    }
    this.goTo(target, camera);
  }

  private goTo(target: InterestTarget, camera: Camera): void {
    const ts = BALANCE.map.tileSize;
    const wx = (target.x + 0.5) * ts;
    const wy = (target.y + 0.5) * ts;
    const dist = Math.hypot(wx - camera.x, wy - camera.y);
    const duration = Math.min(3.2, 1.1 + dist / 600);
    camera.flyTo(wx, wy, target.zoom, duration);
    this.current = target;
    this.holdTimer = target.holdTime + duration;
  }
}
