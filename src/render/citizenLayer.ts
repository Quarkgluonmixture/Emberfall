/** Tiny animated citizen sprites driven by the AgentSystem. */
import { Container, Sprite } from 'pixi.js';
import type { Agent } from '../sim/agents';
import type { SimState } from '../core/types';
import type { GameTextures } from './textures';

const WORKING_STATES = new Set(['gathering', 'building', 'farming']);

export class CitizenLayer {
  container = new Container();
  private pool: Sprite[] = [];

  constructor(private tex: GameTextures) {}

  update(agents: Agent[], state: SimState): void {
    while (this.pool.length < agents.length) {
      const sp = new Sprite(this.tex.citizen);
      sp.anchor.set(0.5, 1);
      sp.scale.set(0.7);
      this.container.addChild(sp);
      this.pool.push(sp);
    }
    for (let i = 0; i < this.pool.length; i++) {
      const sp = this.pool[i];
      if (i >= agents.length) {
        sp.visible = false;
        continue;
      }
      const a = agents[i];
      sp.visible = true;
      // Work bob: a small vertical bounce while laboring; fighters lunge.
      let bob = 0;
      if (WORKING_STATES.has(a.state)) bob = Math.abs(Math.sin(a.phase)) * 1.2;
      else if (a.state === 'fighting') bob = Math.abs(Math.sin(a.phase * 2)) * 1.6;
      sp.position.set(a.x, a.y - bob);
      sp.tint = state.civs[a.civId]?.color ?? 0xffffff;
      sp.alpha = a.state === 'resting' ? 0.55 : 1;
    }
    // Trim the pool if the population dropped a lot.
    while (this.pool.length > agents.length + 200) {
      this.pool.pop()!.destroy();
    }
  }
}
