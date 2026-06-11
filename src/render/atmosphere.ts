/** Day/night tinting, dawn/dusk warmth, and rain/snow particles (screen space). */
import { Container, Graphics, Sprite } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { RNG } from '../core/rng';
import type { Weather } from '../sim/weather';
import type { GameTextures } from './textures';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  sway: number;
}

export class Atmosphere {
  nightOverlay = new Graphics();
  duskOverlay = new Graphics();
  weatherContainer = new Container();

  private particles: Particle[] = [];
  private rng = new RNG(0xfade);
  private screenW = 0;
  private screenH = 0;

  constructor(private tex: GameTextures) {}

  resize(w: number, h: number): void {
    if (w === this.screenW && h === this.screenH) return;
    this.screenW = w;
    this.screenH = h;
    this.nightOverlay.clear().rect(0, 0, w, h).fill(0x0b1230);
    this.duskOverlay.clear().rect(0, 0, w, h).fill(0xd9763a);
  }

  update(dt: number, darkness: number, duskGlow: number, weather: Weather): void {
    const cfg = BALANCE.render;
    this.nightOverlay.alpha = darkness * cfg.nightMaxAlpha;
    this.duskOverlay.alpha = duskGlow * cfg.duskAlpha;

    const desired =
      weather.kind === 'clear'
        ? 0
        : Math.round(cfg.weatherParticleBudget * weather.intensity);

    while (this.particles.length < desired) {
      const snow = weather.kind === 'snow';
      const sprite = new Sprite(snow ? this.tex.snowflake : this.tex.raindrop);
      sprite.position.set(this.rng.range(0, this.screenW), this.rng.range(0, this.screenH));
      this.weatherContainer.addChild(sprite);
      this.particles.push({
        sprite,
        vx: weather.wind * (snow ? 30 : 80),
        vy: snow ? this.rng.range(30, 60) : this.rng.range(280, 380),
        sway: this.rng.range(0, Math.PI * 2),
      });
    }
    while (this.particles.length > desired) {
      this.particles.pop()!.sprite.destroy();
    }

    const snow = weather.kind === 'snow';
    for (const p of this.particles) {
      p.sway += dt * 2;
      p.sprite.x += (p.vx + (snow ? Math.sin(p.sway) * 14 : 0)) * dt;
      p.sprite.y += p.vy * dt;
      if (p.sprite.y > this.screenH + 8) {
        p.sprite.y = -8;
        p.sprite.x = this.rng.range(-20, this.screenW + 20);
      }
      if (p.sprite.x > this.screenW + 20) p.sprite.x = -20;
      if (p.sprite.x < -20) p.sprite.x = this.screenW + 20;
    }
  }
}
