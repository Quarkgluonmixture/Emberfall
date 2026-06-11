/** Tiny animated citizen sprites driven by the AgentSystem. */
import { Container, Sprite, Texture } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { Agent } from '../sim/agents';
import type { SimState } from '../core/types';
import type { GameTextures } from './textures';

const WORKING_STATES = new Set(['gathering', 'building', 'farming']);

export class CitizenLayer {
  container = new Container();
  private pool: Sprite[] = [];

  constructor(private tex: GameTextures) {}

  /** Pick the animation frame and facing for an agent (real art path). */
  private frameFor(a: Agent): { frame: Texture; flip: number } {
    const anims = this.tex.citizenAnims!;
    let frames: Texture[];
    let rate = 1.2;
    if (a.state === 'walking' || a.state === 'trading' || a.state === 'fleeing') {
      frames = anims.walk;
      rate = a.state === 'fleeing' ? 2.2 : 1.4;
    } else if (WORKING_STATES.has(a.state)) {
      frames = anims.work;
    } else if (a.state === 'fighting') {
      frames = anims.fight;
      rate = 2;
    } else {
      frames = anims.rest;
      rate = 0.25;
    }
    const frame = frames[Math.floor(a.phase * rate) % frames.length];
    const dx = a.tx - a.x;
    const flip = Math.abs(dx) > 0.5 ? Math.sign(dx) : 1;
    return { frame, flip };
  }

  update(agents: Agent[], state: SimState): void {
    const anims = this.tex.citizenAnims;
    while (this.pool.length < agents.length) {
      const sp = new Sprite(this.tex.citizen);
      sp.anchor.set(0.5, 1);
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
      sp.tint = state.civs[a.civId]?.color ?? 0xffffff;

      if (anims) {
        const { frame, flip } = this.frameFor(a);
        sp.texture = frame;
        const scale = BALANCE.render.citizenHeight / frame.height;
        sp.scale.set(scale * flip, scale);
        sp.position.set(a.x, a.y);
        sp.alpha = a.state === 'resting' ? 0.85 : 1;
      } else {
        // Procedural fallback: static sprite with a code-driven work bob.
        sp.texture = this.tex.citizen;
        sp.scale.set(0.7);
        let bob = 0;
        if (WORKING_STATES.has(a.state)) bob = Math.abs(Math.sin(a.phase)) * 1.2;
        else if (a.state === 'fighting') bob = Math.abs(Math.sin(a.phase * 2)) * 1.6;
        sp.position.set(a.x, a.y - bob);
        sp.alpha = a.state === 'resting' ? 0.55 : 1;
      }
    }
    while (this.pool.length > agents.length + 200) {
      this.pool.pop()!.destroy();
    }
  }
}
