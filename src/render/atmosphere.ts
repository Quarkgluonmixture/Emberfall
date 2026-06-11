/** Day/night tinting, dawn/dusk warmth, and rain/snow particles (screen space). */
import { Container, Graphics, Sprite } from 'pixi.js';
import { BALANCE } from '../config/balance';
import { RNG } from '../core/rng';
import type { Weather } from '../sim/weather';
import type { GameTextures } from './textures';

interface Particle {
  sprite: Sprite;
  vy: number;
  sway: number;
  snow: boolean;
}

export class Atmosphere {
  nightOverlay = new Graphics();
  duskOverlay = new Graphics();
  weatherContainer = new Container();

  private particles: Particle[] = [];
  private rng = new RNG(0xfade);
  private screenW = 0;
  private screenH = 0;
  private gustPhase = 0;

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

    // Gusts: wind strength breathes instead of staying constant.
    this.gustPhase += dt;
    const gust =
      0.65 + 0.35 * Math.sin(this.gustPhase * 0.45) + 0.15 * Math.sin(this.gustPhase * 1.7);

    // Spawn/remove gradually so weather fades in and out rather than popping.
    let spawnBudget = 4;
    while (this.particles.length < desired && spawnBudget-- > 0) {
      const snow = weather.kind === 'snow';
      const tex = snow ? this.tex.snowflake : this.tex.raindrop;
      const sprite = new Sprite(tex);
      // Real art is higher-res than the procedural particles; normalize size.
      sprite.scale.set(Math.min(1, (snow ? 6 : 14) / tex.height));
      sprite.position.set(this.rng.range(0, this.screenW), this.rng.range(-30, this.screenH));
      this.weatherContainer.addChild(sprite);
      this.particles.push({
        sprite,
        vy: snow ? this.rng.range(30, 60) : this.rng.range(280, 380),
        sway: this.rng.range(0, Math.PI * 2),
        snow,
      });
    }
    let removeBudget = 6;
    while (this.particles.length > desired && removeBudget-- > 0) {
      this.particles.pop()!.sprite.destroy();
    }

    for (const p of this.particles) {
      p.sway += dt * 2;
      const windSpeed = weather.wind * (p.snow ? 30 : 80) * gust;
      p.sprite.x += (windSpeed + (p.snow ? Math.sin(p.sway) * 14 : 0)) * dt;
      p.sprite.y += p.vy * (p.snow ? 0.8 + 0.2 * gust : 1) * dt;
      if (p.sprite.y > this.screenH + 8) {
        p.sprite.y = -8;
        p.sprite.x = this.rng.range(-20, this.screenW + 20);
      }
      if (p.sprite.x > this.screenW + 20) p.sprite.x = -20;
      if (p.sprite.x < -20) p.sprite.x = this.screenW + 20;
    }
  }
}
