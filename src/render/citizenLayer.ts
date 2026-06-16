/** Tiny animated citizen sprites driven by the AgentSystem. */
import { Container, Sprite, Texture } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { Agent } from '../sim/agents';
import type { SimState } from '../core/types';
import type { GameTextures } from './textures';

const WORKING_STATES = new Set(['gathering', 'building', 'farming']);

/** Action icons are white mask glyphs — tint them per state so a farming
    icon reads as golden wheat, not floating white shapes. */
const ACTION_TINT: Record<string, number> = {
  gathering: 0xc9a35f,
  farming: 0xe3c45c,
  building: 0xd99e56,
  trading: 0xf0cd8a,
  fighting: 0xe05a4a,
  fleeing: 0xf09a4a,
  resting: 0x9ab8d9,
};

export class CitizenLayer {
  container = new Container();
  private pool: Sprite[] = [];
  /** Soft contact shadows keeping the tiny sprites from melting into terrain. */
  private shadowLayer = new Container();
  private shadows: Sprite[] = [];
  /** Overhead action glyphs, only readable (and only shown) at close zoom. */
  private iconLayer = new Container();
  private icons: Sprite[] = [];
  /** Soft dark halo behind each shown icon so glyphs read over busy terrain. */
  private iconBgs: Sprite[] = [];
  /** Faint dust puffs over working citizens (field/forest/site activity). */
  private puffs: Sprite[] = [];
  /** Fading footprints behind trading caravans. */
  private trailLayer = new Container();
  private trails: { sprite: Sprite; ttl: number }[] = [];
  private trailTimer = 0;

  constructor(private tex: GameTextures) {
    this.container.addChild(this.trailLayer);
    this.container.addChild(this.shadowLayer);
    this.container.addChild(this.iconLayer);
    // Depth-sort citizens by their feet (y): a sprite lower on screen draws in
    // front, so overlapping citizens stack back-to-front instead of one body
    // half-poking through another. The sub-layers are pinned: trails+shadows
    // behind every citizen, action glyphs in front.
    this.container.sortableChildren = true;
    this.trailLayer.zIndex = -3;
    this.shadowLayer.zIndex = -2;
    this.iconLayer.zIndex = 1_000_000;
  }

  /** Pick the animation frame and facing for an agent (real art path). */
  private frameFor(a: Agent): { frame: Texture; flip: number } {
    // A stable role per agent (batch-15 variety); fall back to the single set.
    const variants = this.tex.citizenVariants;
    const anims = variants ? variants[a.id % variants.length] : this.tex.citizenAnims!;
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

  update(agents: Agent[], state: SimState, scale: number, dt: number): void {
    // Zoom LOD: citizens are invisible at macro zoom, calm at the default
    // zoom and only reach full contrast in close-ups — they are texture for
    // the world, not static over it.
    const cfg = BALANCE.render;
    const fade = Math.min(
      1,
      Math.max(0, (scale - cfg.citizenFadeZoomStart) / (cfg.citizenFadeZoomFull - cfg.citizenFadeZoomStart)),
    );
    this.container.alpha = fade;
    this.container.visible = fade > 0.02;
    if (!this.container.visible) return;
    const anims = this.tex.citizenVariants ?? this.tex.citizenAnims;
    // Action icons fade in past the icon zoom band and track agent states.
    const iconFade = Math.min(
      1,
      Math.max(0, (scale - cfg.actionIconZoomStart) / (cfg.actionIconZoomFull - cfg.actionIconZoomStart)),
    );
    const showIcons = iconFade > 0.02 && this.tex.actionIcons !== null;
    this.iconLayer.visible = showIcons;
    this.iconLayer.alpha = iconFade * 0.9;

    while (this.pool.length < agents.length) {
      const sp = new Sprite(this.tex.citizen);
      sp.anchor.set(0.5, 1);
      this.container.addChild(sp);
      this.pool.push(sp);
      const sh = new Sprite(this.tex.glow);
      sh.anchor.set(0.5);
      sh.tint = 0x000000;
      sh.alpha = 0.32;
      sh.width = 2.2;
      sh.height = 0.7;
      this.shadowLayer.addChild(sh);
      this.shadows.push(sh);
      const ibg = new Sprite(this.tex.glow);
      ibg.anchor.set(0.5);
      ibg.tint = 0x140f08;
      ibg.visible = false;
      this.iconLayer.addChild(ibg);
      this.iconBgs.push(ibg);
      const ic = new Sprite();
      ic.anchor.set(0.5, 1);
      ic.visible = false;
      this.iconLayer.addChild(ic);
      this.icons.push(ic);
      const pf = new Sprite(this.tex.glow);
      pf.anchor.set(0.5);
      pf.tint = 0xcbb37a;
      pf.visible = false;
      pf.width = 1.8;
      pf.height = 1.1;
      this.iconLayer.addChild(pf);
      this.puffs.push(pf);
    }
    // Caravan trails: traders deposit fading dust along their route.
    this.trailTimer += dt;
    const emitTrail = this.trailTimer >= 0.22;
    if (emitTrail) this.trailTimer = 0;
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.ttl -= dt;
      if (tr.ttl <= 0) {
        tr.sprite.destroy();
        this.trails.splice(i, 1);
      } else {
        tr.sprite.alpha = 0.28 * Math.min(1, tr.ttl / 2);
      }
    }

    for (let i = 0; i < this.pool.length; i++) {
      const sp = this.pool[i];
      const sh = this.shadows[i];
      const ic = this.icons[i];
      const ibg = this.iconBgs[i];
      const pf = this.puffs[i];
      if (i >= agents.length) {
        sp.visible = false;
        sh.visible = false;
        ic.visible = false;
        ibg.visible = false;
        pf.visible = false;
        continue;
      }
      const a = agents[i];
      sp.visible = true;
      sp.zIndex = a.y; // feet-depth: lower on screen draws in front
      sh.visible = true;
      sh.position.set(a.x, a.y + 0.12);
      sp.tint = state.civs[a.civId]?.color ?? 0xffffff;

      // Routine field/forest labor (the bulk of citizens) shows as body
      // animation + dust only — overhead icons are reserved for the readable,
      // less-frequent states (build, trade, fight, flee, rest) so the close
      // view stops being a field of yellow wheat-icon confetti.
      const routineWork = a.state === 'farming' || a.state === 'gathering';
      const iconTex = showIcons && !routineWork ? this.tex.actionIcons![a.state] : undefined;
      if (iconTex) {
        const w = cfg.actionIconSize;
        const iy = a.y - cfg.citizenHeight - 1.2;
        ic.visible = true;
        ic.texture = iconTex;
        ic.tint = ACTION_TINT[a.state] ?? 0xffffff;
        ic.scale.set(w / iconTex.width);
        ic.position.set(a.x, iy);
        ibg.visible = true;
        ibg.width = ibg.height = w * 1.5;
        ibg.alpha = 0.28 * iconFade;
        ibg.position.set(a.x, iy - w * 0.5);
      } else {
        ic.visible = false;
        ibg.visible = false;
      }

      // Work dust: a soft, faint puff on a subset of workers (thinning the
      // close-zoom clutter that read as floating bits) that breathes with the
      // work animation.
      if (showIcons && WORKING_STATES.has(a.state) && a.id % 2 === 0) {
        pf.visible = true;
        pf.position.set(a.x + 1.2, a.y - 0.8);
        pf.alpha = 0.22 * Math.abs(Math.sin(a.phase * 1.3));
      } else {
        pf.visible = false;
      }

      if (emitTrail && a.state === 'trading' && this.trails.length < 320) {
        const dot = new Sprite(this.tex.glow);
        dot.anchor.set(0.5);
        dot.tint = 0xd9b36a;
        dot.width = 1.7;
        dot.height = 1.1;
        dot.alpha = 0.28;
        dot.position.set(a.x, a.y + 0.5);
        this.trailLayer.addChild(dot);
        this.trails.push({ sprite: dot, ttl: 2.4 });
      }

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
      this.shadows.pop()!.destroy();
      this.icons.pop()!.destroy();
      this.puffs.pop()!.destroy();
    }
  }
}
