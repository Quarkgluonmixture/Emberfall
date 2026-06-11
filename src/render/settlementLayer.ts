/** Settlement sprites, civ banners, name labels, chimney smoke, night glows, ruins. */
import { Container, Sprite, Text } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { SimState } from '../core/types';
import type { GameTextures } from './textures';

interface Vis {
  root: Container;
  sprite: Sprite;
  banner: Sprite;
  label: Text;
  glow: Sprite;
  /** Wide faint halo behind the core glow for a softer falloff. */
  halo: Sprite;
  /** Soft ground shadow anchoring the sprite to the terrain. */
  shadow: Sprite;
  smoke: Sprite | null;
  tier: number;
  name: string;
}

export class SettlementLayer {
  container = new Container();
  /** Rendered above the night overlay so windows appear to shine. */
  glowContainer = new Container();
  private map = new Map<number, Vis>();
  private ruinSprites = new Map<string, Sprite>();

  constructor(private tex: GameTextures) {}

  private applyTier(v: Vis, tier: number): void {
    v.sprite.texture = this.tex.settlement[tier];
    const target = BALANCE.render.settlementWidths[tier];
    v.sprite.scale.set(target / v.sprite.texture.width);
    v.shadow.width = target * 1.2;
    v.shadow.height = target * 0.5;
    v.tier = tier;
    if (v.smoke) {
      v.smoke.visible = tier >= 1;
      v.smoke.position.set(0.5, -[5, 8, 11][tier]);
    }
  }

  update(state: SimState, scale: number, darkness: number, time: number): void {
    const ts = BALANCE.map.tileSize;
    const cfg = BALANCE.render;
    const seen = new Set<number>();

    for (const s of state.settlements) {
      seen.add(s.id);
      let v = this.map.get(s.id);
      if (!v) {
        const root = new Container();
        const sprite = new Sprite();
        sprite.anchor.set(0.5, 0.8);
        const banner = new Sprite(this.tex.banner);
        banner.anchor.set(0.1, 1);
        banner.scale.set(cfg.bannerHeight / this.tex.banner.height);
        banner.position.set(2.5, -3);
        const label = new Text({
          text: s.name,
          style: {
            fontFamily: 'Georgia, serif',
            fontSize: 11.5,
            letterSpacing: 1,
            fill: 0xf0e6d2,
            stroke: { color: 0x12100c, width: 3 },
          },
        });
        label.resolution = 2;
        label.anchor.set(0.5, 0);
        label.position.set(0, 4);
        const glow = new Sprite(this.tex.glow);
        glow.anchor.set(0.5);
        glow.blendMode = 'add';
        glow.tint = cfg.glowTint;
        const halo = new Sprite(this.tex.glow);
        halo.anchor.set(0.5);
        halo.blendMode = 'add';
        halo.tint = cfg.glowSpillTint;
        // Soft ground shadow grounds the sprite against the terrain.
        const shadow = new Sprite(this.tex.glow);
        shadow.anchor.set(0.5);
        shadow.tint = 0x000000;
        shadow.alpha = 0.3;
        shadow.position.set(0, 0.5);
        root.addChild(shadow);
        let smoke: Sprite | null = null;
        if (this.tex.smoke) {
          smoke = new Sprite(this.tex.smoke[0]);
          smoke.anchor.set(0.5, 1);
          smoke.alpha = cfg.smokeAlpha;
          smoke.scale.set(7 / this.tex.smoke[0].height);
          root.addChild(smoke);
        }
        root.addChild(sprite, banner, label);
        root.position.set((s.x + 0.5) * ts, (s.y + 0.5) * ts);
        glow.position.copyFrom(root.position);
        halo.position.copyFrom(root.position);
        this.container.addChild(root);
        this.glowContainer.addChild(halo, glow);
        v = { root, sprite, banner, label, glow, halo, shadow, smoke, tier: -1, name: s.name };
        this.map.set(s.id, v);
      }
      if (v.tier !== s.tier) this.applyTier(v, s.tier);
      if (v.name !== s.name) {
        v.label.text = s.name;
        v.name = s.name;
      }
      v.banner.tint = state.civs[s.civId]?.color ?? 0xffffff;
      // Labels fade in around the zoom threshold instead of popping.
      const labelFade = Math.min(1, Math.max(0, (scale - cfg.labelMinZoom + 0.5) / 0.9));
      v.label.visible = labelFade > 0.04;
      if (v.label.visible) {
        v.label.alpha = labelFade;
        v.label.scale.set(1 / scale);
      }

      if (v.smoke && v.smoke.visible) {
        v.smoke.texture = this.tex.smoke![Math.floor(time * 3 + s.id) % this.tex.smoke!.length];
      }

      // Softer night onset: glows arrive late in the dusk and breathe slightly.
      const glowStrength = Math.pow(darkness, 1.35);
      const flicker = 0.92 + 0.08 * Math.sin(time * 7 + s.id * 1.7);
      // Beyond the reference zoom, damp size and alpha so a close-up reads as
      // lit windows instead of a screen-filling fireball.
      const over = Math.max(1, scale / cfg.glowRefZoom);
      const sizeDamp = Math.pow(over, -cfg.glowZoomSizeExp);
      const alphaDamp = Math.pow(over, -cfg.glowZoomAlphaExp);
      // The fuller the world, the tighter each light, so dense late-game
      // regions stay readable instead of merging into one wash.
      const density = Math.min(1, cfg.glowDensityRef / Math.max(1, state.settlements.length));
      const alpha =
        glowStrength *
        cfg.glowMaxAlpha *
        (0.45 + s.tier * 0.35) *
        flicker *
        alphaDamp *
        Math.pow(density, 0.25);
      const size =
        (0.55 + s.tier * 0.4 + Math.min(1.1, s.population / 350)) *
        (ts / 8) *
        cfg.glowSizeScale *
        Math.sqrt(density) *
        sizeDamp;
      const texScale = 64 / this.tex.glow.width;
      // Far out, dozens of additive glows saturate into orange wash — ease
      // size and alpha toward floors, and kill halos fastest (they merge first).
      const farT = Math.min(1, Math.max(0, (scale - 0.55) / (cfg.glowFarZoom - 0.55)));
      const farAlpha = cfg.glowFarAlphaFloor + (1 - cfg.glowFarAlphaFloor) * farT;
      const farSize = cfg.glowFarSizeFloor + (1 - cfg.glowFarSizeFloor) * farT;
      // A slow breath keeps the lights alive without strobing.
      const breath = 1 + 0.05 * Math.sin(time * 1.3 + s.id * 2.1);
      v.glow.alpha = alpha * farAlpha;
      v.glow.scale.set(size * texScale * farSize * breath);
      // Wide warm spill washing the cold night terrain around each lamp.
      v.halo.alpha = alpha * 0.32 * farT * farT;
      v.halo.scale.set(size * texScale * farSize * 3.2 * breath);
    }

    for (const [id, v] of this.map) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        v.glow.destroy();
        v.halo.destroy();
        this.map.delete(id);
      }
    }

    this.updateRuins(state, ts);
  }

  private updateRuins(state: SimState, ts: number): void {
    if (!this.tex.ruins) return;
    const live = new Set<string>();
    for (const r of state.ruins) {
      const key = `${r.x},${r.y},${r.day}`;
      live.add(key);
      if (!this.ruinSprites.has(key)) {
        const sp = new Sprite(this.tex.ruins);
        sp.anchor.set(0.5, 0.8);
        sp.scale.set(BALANCE.render.ruinsWidth / this.tex.ruins.width);
        sp.alpha = 0.92;
        sp.position.set((r.x + 0.5) * ts, (r.y + 0.5) * ts);
        // Ruins sit beneath living settlements in the same container.
        this.container.addChildAt(sp, 0);
        this.ruinSprites.set(key, sp);
      }
    }
    for (const [key, sp] of this.ruinSprites) {
      if (!live.has(key)) {
        sp.destroy();
        this.ruinSprites.delete(key);
      }
    }
  }
}
