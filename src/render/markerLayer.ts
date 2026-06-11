/** Pulsing event markers: brief expanding rings where chronicle events happen. */
import { Container, Graphics } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { SimState } from '../core/types';

interface Marker {
  g: Graphics;
  age: number;
  life: number;
  color: number;
}

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
  private chronicleIndex = -1;

  update(dt: number, state: SimState): void {
    // Skip pre-existing history on first frame and after world reload.
    if (this.chronicleIndex < 0 || this.chronicleIndex > state.chronicle.length) {
      this.chronicleIndex = state.chronicle.length;
    }
    const ts = BALANCE.map.tileSize;
    while (this.chronicleIndex < state.chronicle.length) {
      const e = state.chronicle[this.chronicleIndex++];
      if (e.x === undefined || e.y === undefined || e.importance < 2) continue;
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
  }
}
