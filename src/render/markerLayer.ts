/**
 * Pulsing event markers: brief expanding rings where chronicle events happen,
 * plus animated flame sprites on wildfire events (cosmetic only).
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { hash2 } from '../core/rng';
import type { SimState } from '../core/types';
import type { GameTextures } from './textures';

interface Marker {
  g: Graphics;
  age: number;
  life: number;
  color: number;
}

interface Flame {
  sp: Sprite;
  age: number;
  life: number;
  /** Per-flame animation phase so the cluster doesn't flicker in lockstep. */
  phase: number;
}

const FLAME_FRAME_TIME = 0.13;
const FLAME_LIFE = 6;
const FLAMES_PER_FIRE = 5;

const KIND_COLORS: Record<string, number> = {
  warDeclared: 0xd96a5a,
  skirmish: 0xd96a5a,
  capture: 0xe04a3a,
  plague: 0x9ab05c,
  famine: 0xc7a05a,
  wildfire: 0xe0763a,
  flood: 0x6a9ec7,
  goldenAge: 0xe8c558,
  collapse: 0x9a8f85,
  civFell: 0x9a8f85,
  migration: 0x8fc7a0,
};

export class MarkerLayer {
  container = new Container();
  private markers: Marker[] = [];
  private flames: Flame[] = [];
  private chronicleIndex = -1;

  constructor(private textures: GameTextures) {}

  update(dt: number, state: SimState): void {
    // Skip pre-existing history on first frame and after world reload.
    if (this.chronicleIndex < 0 || this.chronicleIndex > state.chronicle.length) {
      this.chronicleIndex = state.chronicle.length;
    }
    const ts = BALANCE.map.tileSize;
    while (this.chronicleIndex < state.chronicle.length) {
      const e = state.chronicle[this.chronicleIndex++];
      if (e.x === undefined || e.y === undefined) continue;
      if (e.kind === 'wildfire' || e.kind === 'wildfireWild') {
        this.spawnFlames(e.x, e.y, this.chronicleIndex);
      }
      if (e.importance < 2) continue;
      const g = new Graphics();
      g.position.set((e.x + 0.5) * ts, (e.y + 0.5) * ts);
      this.container.addChild(g);
      this.markers.push({
        g,
        age: 0,
        life: e.importance === 3 ? 4 : 2.6,
        color: KIND_COLORS[e.kind] ?? 0xe2a14e,
      });
      if (this.markers.length > 40) this.markers.shift()!.g.destroy();
    }

    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i];
      m.age += dt;
      if (m.age >= m.life) {
        m.g.destroy();
        this.markers.splice(i, 1);
        continue;
      }
      const k = m.age / m.life;
      const fade = (1 - k) ** 1.5;
      m.g.clear();
      m.g.circle(0, 0, 3 + k * 20).stroke({ color: m.color, width: 1.6, alpha: fade * 0.9 });
      m.g.circle(0, 0, (3 + k * 20) * 0.55).stroke({ color: m.color, width: 1, alpha: fade * 0.45 });
    }

    const frames = this.textures.wildfire;
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.age += dt;
      if (f.age >= f.life || !frames) {
        f.sp.destroy();
        this.flames.splice(i, 1);
        continue;
      }
      f.sp.texture = frames[Math.floor(f.age / FLAME_FRAME_TIME + f.phase) % frames.length];
      const fadeIn = Math.min(1, f.age / 0.4);
      const fadeOut = Math.min(1, (f.life - f.age) / 1.4);
      f.sp.alpha = fadeIn * fadeOut;
    }
  }

  /** Scatter a deterministic cluster of animated flames around a burn origin. */
  private spawnFlames(x: number, y: number, salt: number): void {
    const frames = this.textures.wildfire;
    if (!frames) return;
    const ts = BALANCE.map.tileSize;
    for (let f = 0; f < FLAMES_PER_FIRE; f++) {
      const angle = hash2(salt, f, 0) * Math.PI * 2;
      const radius = hash2(salt, f, 1) * 2.2;
      const sp = new Sprite(frames[0]);
      sp.anchor.set(0.5, 0.85);
      sp.position.set(
        (x + 0.5 + Math.cos(angle) * radius) * ts,
        (y + 0.5 + Math.sin(angle) * radius) * ts,
      );
      const w = ts * (1.1 + hash2(salt, f, 2) * 0.8);
      sp.width = w;
      sp.height = w;
      sp.alpha = 0;
      this.container.addChild(sp);
      this.flames.push({
        sp,
        age: 0,
        life: FLAME_LIFE * (0.8 + hash2(salt, f, 3) * 0.4),
        phase: Math.floor(hash2(salt, f, 4) * frames.length),
      });
      if (this.flames.length > 60) this.flames.shift()!.sp.destroy();
    }
  }
}
