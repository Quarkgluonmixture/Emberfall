/**
 * Macro zoom band: when the camera pulls out past the cluster band, building
 * clusters fade away and this layer fades in — constant screen-size tier
 * glyphs tinted by civ color, war-front pulses on active frontiers, faint
 * animated trade flows between trading civs, and plague/famine rings. The
 * goal is a strategic map a player can read in two seconds.
 */
import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { SimState } from '../core/types';

interface Glyph {
  sprite: Sprite;
  ring: Graphics;
  tier: number;
}

/** 0 below the band start (clusters rule), 1 fully macro. */
export function macroBlend(scale: number): number {
  const cfg = BALANCE.render;
  return Math.min(1, Math.max(0, (cfg.macroZoomEnd - scale) / (cfg.macroZoomEnd - cfg.macroZoomStart)));
}

export class MacroLayer {
  container = new Container();
  private glyphTex: [Texture, Texture, Texture];
  private glyphs = new Map<number, Glyph>();
  private fronts = new Graphics();
  private flows = new Graphics();
  /** Cached war frontiers/trade seats, refreshed on a slow cadence. */
  private warFronts: { x: number; y: number }[] = [];
  private tradePairs: { ax: number; ay: number; bx: number; by: number }[] = [];
  private refreshTimer = Infinity;

  constructor(renderer: Renderer) {
    const make = (draw: (g: Graphics) => void): Texture => {
      const g = new Graphics();
      draw(g);
      const t = renderer.generateTexture({ target: g, resolution: 4 });
      g.destroy();
      return t;
    };
    // White-on-outline shapes; tinted per civ at runtime. Camp dot, village
    // square, town diamond — distinguishable at a glance even at 6 px.
    this.glyphTex = [
      make((g) => g.circle(4, 4, 2.6).fill(0xffffff).stroke({ color: 0x10100c, width: 1.4 })),
      make((g) => g.rect(1.6, 1.6, 6.8, 6.8).fill(0xffffff).stroke({ color: 0x10100c, width: 1.4 })),
      make((g) =>
        g
          .poly([5.5, 0, 11, 5.5, 5.5, 11, 0, 5.5])
          .fill(0xffffff)
          .stroke({ color: 0x10100c, width: 1.5 }),
      ),
    ];
    this.container.addChild(this.flows, this.fronts);
  }

  update(dt: number, state: SimState, scale: number, time: number): void {
    const blend = macroBlend(scale);
    this.container.visible = blend > 0.02;
    this.container.alpha = blend;
    if (!this.container.visible) return;

    const ts = BALANCE.map.tileSize;
    const inv = 1 / scale; // constant screen-size: world scale ∝ 1/zoom

    this.refreshTimer += dt;
    if (this.refreshTimer > 2) {
      this.refreshTimer = 0;
      this.refreshStrategic(state);
    }

    // ── Settlement glyphs ──
    const seen = new Set<number>();
    for (const s of state.settlements) {
      seen.add(s.id);
      let g = this.glyphs.get(s.id);
      if (!g) {
        const sprite = new Sprite(this.glyphTex[s.tier]);
        sprite.anchor.set(0.5);
        const ring = new Graphics();
        this.container.addChild(sprite, ring);
        g = { sprite, ring, tier: s.tier };
        this.glyphs.set(s.id, g);
      }
      if (g.tier !== s.tier) {
        g.sprite.texture = this.glyphTex[s.tier];
        g.tier = s.tier;
      }
      g.sprite.tint = state.civs[s.civId]?.color ?? 0xffffff;
      g.sprite.position.set((s.x + 0.5) * ts, (s.y + 0.5) * ts);
      const px = [7, 9, 12][s.tier];
      g.sprite.width = px * inv;
      g.sprite.height = px * inv;

      // Crisis ring: plague reads sickly green, famine dry amber.
      g.ring.clear();
      const crisis = s.plagueDays > 0 ? 0x9dc44d : s.famineDays > 0 ? 0xd99a3d : 0;
      if (crisis) {
        const pulse = (time * 0.9 + s.id * 0.31) % 1;
        g.ring.circle(g.sprite.position.x, g.sprite.position.y, (6 + pulse * 7) * inv);
        g.ring.stroke({ color: crisis, width: 1.6 * inv, alpha: 0.85 * (1 - pulse) });
      }
    }
    for (const [id, g] of this.glyphs) {
      if (!seen.has(id)) {
        g.sprite.destroy();
        g.ring.destroy();
        this.glyphs.delete(id);
      }
    }

    // ── War fronts: angry double pulse on each active frontier ──
    this.fronts.clear();
    for (const f of this.warFronts) {
      const cx = (f.x + 0.5) * ts;
      const cy = (f.y + 0.5) * ts;
      const pulse = (time * 1.1 + f.x * 0.07) % 1;
      this.fronts.circle(cx, cy, (5 + pulse * 11) * inv);
      this.fronts.stroke({ color: 0xe04a3a, width: 2.2 * inv, alpha: 0.9 * (1 - pulse) });
      this.fronts.circle(cx, cy, 3.2 * inv).fill({ color: 0xe04a3a, alpha: 0.9 });
    }

    // ── Trade flows: beads drifting between trading capitals ──
    this.flows.clear();
    for (const p of this.tradePairs) {
      const ax = (p.ax + 0.5) * ts;
      const ay = (p.ay + 0.5) * ts;
      const bx = (p.bx + 0.5) * ts;
      const by = (p.by + 0.5) * ts;
      this.flows.moveTo(ax, ay).lineTo(bx, by);
      this.flows.stroke({ color: 0xd9b36a, width: 1 * inv, alpha: 0.18 });
      const beads = 4;
      for (let i = 0; i < beads; i++) {
        const t = (time * 0.08 + i / beads + (p.ax * 7 + p.by * 13) * 0.01) % 1;
        this.flows
          .circle(ax + (bx - ax) * t, ay + (by - ay) * t, 1.6 * inv)
          .fill({ color: 0xf0cd8a, alpha: 0.55 * Math.sin(t * Math.PI) });
      }
    }
  }

  /** Recompute war frontiers and trade-pair seats (slow cadence, ~2 s). */
  private refreshStrategic(state: SimState): void {
    this.warFronts = [];
    this.tradePairs = [];
    const seats: (typeof state.settlements[number] | null)[] = state.civs.map(() => null);
    for (const s of state.settlements) {
      const cur = seats[s.civId];
      if (!cur || s.population > cur.population) seats[s.civId] = s;
    }
    for (let i = 0; i < state.civs.length; i++) {
      if (!state.civs[i]?.alive) continue;
      for (let j = i + 1; j < state.civs.length; j++) {
        if (!state.civs[j]?.alive) continue;
        const rel = state.relations[i]?.[j];
        if (!rel) continue;
        if (rel.state === 'war') {
          // Frontier: midpoint of the closest settlement pair across the war.
          let best: { x: number; y: number } | null = null;
          let bd = Infinity;
          for (const sa of state.settlements) {
            if (sa.civId !== i) continue;
            for (const sb of state.settlements) {
              if (sb.civId !== j) continue;
              const d = (sa.x - sb.x) ** 2 + (sa.y - sb.y) ** 2;
              if (d < bd) {
                bd = d;
                best = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
              }
            }
          }
          if (best) this.warFronts.push(best);
        } else if (rel.state === 'trade' || rel.state === 'alliance') {
          const a = seats[i];
          const b = seats[j];
          if (a && b) this.tradePairs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
        }
      }
    }
  }
}
