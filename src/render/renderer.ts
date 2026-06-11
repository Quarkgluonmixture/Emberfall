/**
 * Renderer composition root. Owns the Pixi Application and all draw layers;
 * reads simulation state every frame but never mutates it.
 */
import { Application, Container } from 'pixi.js';
import { BALANCE } from '../config/balance';
import type { Season, SimState, World } from '../core/types';
import type { Agent } from '../sim/agents';
import type { Weather } from '../sim/weather';
import { Atmosphere } from './atmosphere';
import { Camera } from './camera';
import { CitizenLayer } from './citizenLayer';
import { SettlementLayer } from './settlementLayer';
import { TerrainLayer } from './terrainLayer';
import { TerritoryLayer } from './territoryLayer';
import { makeTextures, type GameTextures } from './textures';

export interface FrameInput {
  state: SimState;
  agents: Agent[];
  season: Season;
  /** 0 (noon) .. 1 (midnight) */
  darkness: number;
  /** 0..1, peaks at dawn/dusk */
  duskGlow: number;
  weather: Weather;
  dt: number;
  time: number;
}

export class Renderer {
  app: Application;
  camera: Camera;
  textures: GameTextures;
  terrain: TerrainLayer;
  territory: TerritoryLayer;
  settlements: SettlementLayer;
  citizens: CitizenLayer;
  atmosphere: Atmosphere;

  private constructor(app: Application, world: World) {
    this.app = app;
    this.camera = new Camera(world.width, world.height);
    this.textures = makeTextures(app.renderer);
    this.terrain = new TerrainLayer(app.renderer, world);
    this.territory = new TerritoryLayer();
    this.settlements = new SettlementLayer(this.textures);
    this.citizens = new CitizenLayer(this.textures);
    this.atmosphere = new Atmosphere(this.textures);

    this.camera.root.addChild(
      this.terrain.sprite,
      this.territory.g,
      this.settlements.container,
      this.citizens.container,
    );
    app.stage.addChild(
      this.camera.root,
      this.atmosphere.nightOverlay,
      this.atmosphere.duskOverlay,
      this.settlements.glowContainer,
      this.atmosphere.weatherContainer,
    );
  }

  static async create(parent: HTMLElement, world: World): Promise<Renderer> {
    const app = new Application();
    await app.init({
      resizeTo: window,
      background: 0x0a0910,
      antialias: false,
      preference: 'webgl',
    });
    parent.appendChild(app.canvas);
    return new Renderer(app, world);
  }

  get fps(): number {
    return this.app.ticker.FPS;
  }

  frame(input: FrameInput): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.camera.apply(w, h);
    this.atmosphere.resize(w, h);

    this.terrain.update(input.season, input.state.terrainVersion);
    this.territory.update(input.dt, input.state);
    this.settlements.update(input.state, this.camera.scale, input.darkness, input.time);
    this.citizens.update(input.agents, input.state);

    // The glow layer sits above the night overlay; mirror the camera transform.
    const glow = this.settlements.glowContainer;
    glow.position.copyFrom(this.camera.root.position);
    glow.scale.copyFrom(this.camera.root.scale);

    this.atmosphere.update(input.dt, input.darkness, input.duskGlow, input.weather);
  }

  /** Approximate display object count, for the debug overlay. */
  entityCount(): number {
    let count = 0;
    const walk = (c: Container): void => {
      count += c.children.length;
      for (const child of c.children) {
        if (child instanceof Container) walk(child);
      }
    };
    walk(this.app.stage);
    return count;
  }

  destroy(): void {
    this.terrain.destroy();
    this.app.destroy(true, { children: true, texture: true });
  }
}

export { BALANCE as RENDER_BALANCE };
