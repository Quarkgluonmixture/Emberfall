/**
 * Event FX: short-lived rings, sparkle bursts and dust puffs at the map
 * sites of fresh chronicle entries — growth chimes gold, war flashes red,
 * collapse breathes out dust. Purely observational set dressing: driven by
 * the chronicle the sim already wrote, all variation from hash2 on the
 * entry's day/site, zero sim impact. Bulk chronicle jumps (loads, probe
 * fast-forwards) spawn nothing, so screenshot batteries stay deterministic.
 */
import { Container, Graphics, Sprite, type Renderer, type Texture } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { hash2 } from '../core/rng';
import type { SimState } from '../core/types';
import type { GameTextures } from './textures';

interface Fx {
  sprite: Sprite;
  t: number;
  dur: number;
  /** Apply the 0..1 life curve to the sprite. */
  tick: (sprite: Sprite, k: number) => void;
}

/** More new entries than this in one frame = a bulk jump, not live play. */
const BULK_LIMIT = 8;
const MAX_LIVE = 48;

/** Ring/burst recipes per chronicle kind: color, ring radius (world px),
    duration seconds, sparkle count, dust count. */
const KIND_FX: Record<
  string,
  { color: number; r: number; dur: number; sparks?: number; dust?: number; slow?: boolean }
> = {
  founding: { color: 0xffd089, r: 9, dur: 1.6, sparks: 5 },
  migration: { color: 0xd8c9a8, r: 7, dur: 1.4, dust: 2 },
  village: { color: 0xffd45e, r: 11, dur: 1.6, sparks: 7 },
  town: { color: 0xffc83a, r: 15, dur: 2.0, sparks: 12 },
  resettleRuin: { color: 0xffd089, r: 10, dur: 1.8, sparks: 6 },
  rebirth: { color: 0xffe2a8, r: 20, dur: 2.6, sparks: 14, slow: true },
  warDeclared: { color: 0xe04a3a, r: 14, dur: 1.4 },
  skirmish: { color: 0xe04a3a, r: 6, dur: 0.8 },
  capture: { color: 0xe04a3a, r: 12, dur: 1.6, dust: 3 },
  collapse: { color: 0x8c7a62, r: 8, dur: 2.0, dust: 4 },
  civFell: { color: 0x6e5d4a, r: 18, dur: 3.0, dust: 6, slow: true },
  peace: { color: 0xf2ecd9, r: 12, dur: 2.2, slow: true },
  treatySigned: { color: 0xf2ecd9, r: 12, dur: 2.2, slow: true },
  goldenAge: { color: 0xffe2a8, r: 18, dur: 3.0, sparks: 10, slow: true },
  plague: { color: 0x9dc44d, r: 7, dur: 1.6 },
  schism: { color: 0xb48ad4, r: 10, dur: 1.8 },
  wildfire: { color: 0xff9b40, r: 8, dur: 1.2 },
  wildfireWild: { color: 0xff9b40, r: 8, dur: 1.2 },
  flood: { color: 0x7fb6d9, r: 9, dur: 1.6 },
};

export class FxLayer {
  container = new Container();
  /** Probe mode sets this: transient FX are wall-clock animated, so they
      would make the deterministic screenshot battery flicker. */
  suppress = false;
  private live: Fx[] = [];
  private ring: Texture;
  private chronicleSeen = 0;
  private lastState: SimState | null = null;

  constructor(
    renderer: Renderer,
    private textures: GameTextures,
  ) {
    // A soft white ring, tinted per event kind.
    const g = new Graphics().circle(36, 36, 30).stroke({ color: 0xffffff, width: 5, alpha: 1 });
    this.ring = renderer.generateTexture(g);
    g.destroy();
  }

  /** Spawn FX for fresh chronicle entries, then advance all live effects. */
  update(dt: number, state: SimState): void {
    this.scan(state);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const fx = this.live[i];
      fx.t += dt;
      const k = fx.t / fx.dur;
      if (k >= 1) {
        fx.sprite.destroy();
        this.live.splice(i, 1);
        continue;
      }
      fx.tick(fx.sprite, k);
    }
  }

  private scan(state: SimState): void {
    if (state !== this.lastState) {
      this.lastState = state;
      this.chronicleSeen = state.chronicle.length;
      return;
    }
    const log = state.chronicle;
    if (this.chronicleSeen > log.length) this.chronicleSeen = log.length; // compacted
    const fresh = log.length - this.chronicleSeen;
    if (fresh <= 0) return;
    const start = this.chronicleSeen;
    this.chronicleSeen = log.length;
    if (fresh > BULK_LIMIT || this.suppress) return; // load / fast-forward / probe

    const ts = BALANCE.map.tileSize;
    for (let i = start; i < log.length; i++) {
      const e = log[i];
      if (e.importance < 2 || e.x === undefined || e.y === undefined) continue;
      const spec = KIND_FX[e.kind];
      if (!spec) continue;
      const x = (e.x + 0.5) * ts;
      const y = (e.y + 0.5) * ts;
      this.spawnRing(x, y, spec);
      const salt = e.day ^ (e.x << 8) ^ e.y;
      for (let s = 0; s < (spec.sparks ?? 0); s++) this.spawnSpark(x, y, spec, salt, s);
      for (let d = 0; d < (spec.dust ?? 0); d++) this.spawnDust(x, y, spec, salt, d);
    }
  }

  private add(fx: Fx): void {
    // Oldest effects yield when a dense moment overflows the pool.
    while (this.live.length >= MAX_LIVE) {
      this.live[0].sprite.destroy();
      this.live.shift();
    }
    this.container.addChild(fx.sprite);
    this.live.push(fx);
    fx.tick(fx.sprite, 0);
  }

  private spawnRing(
    x: number,
    y: number,
    spec: { color: number; r: number; dur: number; slow?: boolean },
  ): void {
    const sprite = new Sprite(this.ring);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.tint = spec.color;
    sprite.blendMode = 'add';
    const r = spec.r;
    this.add({
      sprite,
      t: 0,
      dur: spec.dur,
      tick: (sp, k) => {
        // Ease-out expansion; alpha holds then fades in the back half.
        const grow = 1 - (1 - k) * (1 - k);
        const d = (spec.slow ? 0.45 + 0.55 * grow : 0.25 + 0.75 * grow) * 2 * r;
        sp.width = d;
        sp.height = d * 0.72; // match the map's oval perspective squash
        sp.alpha = k < 0.45 ? 0.85 : 0.85 * (1 - (k - 0.45) / 0.55);
      },
    });
  }

  private spawnSpark(
    x: number,
    y: number,
    spec: { color: number; r: number; dur: number },
    salt: number,
    i: number,
  ): void {
    const sprite = new Sprite(this.textures.glow);
    sprite.anchor.set(0.5);
    sprite.tint = spec.color;
    sprite.blendMode = 'add';
    const ang = hash2(salt, i, 1) * Math.PI * 2;
    const dist = spec.r * (0.5 + hash2(salt, i, 2) * 0.8);
    const size = 1.6 + hash2(salt, i, 3) * 1.8;
    const rise = 2 + hash2(salt, i, 4) * 3;
    this.add({
      sprite,
      t: 0,
      dur: spec.dur * (0.6 + hash2(salt, i, 5) * 0.5),
      tick: (sp, k) => {
        const out = 1 - (1 - k) * (1 - k);
        sp.position.set(
          x + Math.cos(ang) * dist * out,
          y + Math.sin(ang) * dist * out * 0.72 - rise * k,
        );
        const s = size * (1 - k * 0.6);
        sp.width = s;
        sp.height = s;
        sp.alpha = 0.9 * (1 - k);
      },
    });
  }

  private spawnDust(
    x: number,
    y: number,
    spec: { color: number; r: number; dur: number },
    salt: number,
    i: number,
  ): void {
    const sprite = new Sprite(this.textures.glow);
    sprite.anchor.set(0.5);
    sprite.tint = spec.color;
    const ang = hash2(salt, 100 + i, 1) * Math.PI * 2;
    const dist = spec.r * 0.45 * hash2(salt, 100 + i, 2);
    const size = spec.r * (0.5 + hash2(salt, 100 + i, 3) * 0.5);
    this.add({
      sprite,
      t: 0,
      dur: spec.dur * (0.7 + hash2(salt, 100 + i, 4) * 0.6),
      tick: (sp, k) => {
        sp.position.set(
          x + Math.cos(ang) * dist,
          y + Math.sin(ang) * dist * 0.72 - spec.r * 0.25 * k,
        );
        const s = size * (0.6 + k * 0.9);
        sp.width = s;
        sp.height = s * 0.8;
        sp.alpha = 0.5 * (1 - k) * (1 - k);
      },
    });
  }

  destroy(): void {
    for (const fx of this.live) fx.sprite.destroy();
    this.live = [];
  }
}
