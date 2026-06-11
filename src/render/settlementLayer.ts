/** Settlement sprites, civ banners, name labels and warm night glows. */
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
  tier: number;
  name: string;
}

export class SettlementLayer {
  container = new Container();
  /** Rendered above the night overlay so windows appear to shine. */
  glowContainer = new Container();
  private map = new Map<number, Vis>();

  constructor(private tex: GameTextures) {}

  update(state: SimState, scale: number, darkness: number, time: number): void {
    const ts = BALANCE.map.tileSize;
    const cfg = BALANCE.render;
    const seen = new Set<number>();

    for (const s of state.settlements) {
      seen.add(s.id);
      let v = this.map.get(s.id);
      if (!v) {
        const root = new Container();
        const sprite = new Sprite(this.tex.settlement[s.tier]);
        sprite.anchor.set(0.5, 0.85);
        const banner = new Sprite(this.tex.banner);
        banner.anchor.set(0.1, 1);
        banner.position.set(3, -4);
        const label = new Text({
          text: s.name,
          style: {
            fontFamily: 'Georgia, serif',
            fontSize: 12,
            fill: 0xe8dcc8,
            stroke: { color: 0x12100c, width: 3 },
          },
        });
        label.resolution = 2;
        label.anchor.set(0.5, 0);
        label.position.set(0, 4);
        const glow = new Sprite(this.tex.glow);
        glow.anchor.set(0.5);
        glow.blendMode = 'add';
        root.addChild(sprite, banner, label);
        root.position.set((s.x + 0.5) * ts, (s.y + 0.5) * ts);
        glow.position.copyFrom(root.position);
        this.container.addChild(root);
        this.glowContainer.addChild(glow);
        v = { root, sprite, banner, label, glow, tier: s.tier, name: s.name };
        this.map.set(s.id, v);
      }
      if (v.tier !== s.tier) {
        v.sprite.texture = this.tex.settlement[s.tier];
        v.tier = s.tier;
      }
      if (v.name !== s.name) {
        v.label.text = s.name;
        v.name = s.name;
      }
      v.banner.tint = state.civs[s.civId]?.color ?? 0xffffff;
      const showLabel = scale >= cfg.labelMinZoom;
      v.label.visible = showLabel;
      if (showLabel) v.label.scale.set(1 / scale);

      const flicker = 0.92 + 0.08 * Math.sin(time * 7 + s.id * 1.7);
      v.glow.alpha = darkness * cfg.glowMaxAlpha * (0.45 + s.tier * 0.35) * flicker;
      const size = (0.55 + s.tier * 0.4 + s.population / 350) * (ts / 8);
      v.glow.scale.set(size);
    }

    for (const [id, v] of this.map) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        v.glow.destroy();
        this.map.delete(id);
      }
    }
  }
}
