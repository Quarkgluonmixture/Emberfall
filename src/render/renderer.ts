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
import { DecorLayer } from './decorLayer';
import { FxLayer } from './fxLayer';
import {
  destroyGameTextures,
  destroyReplacedGameTextures,
  snapshotGameTextures,
} from './gameTextureCleanup';
import { MacroLayer, macroBlend } from './macroLayer';
import { MarkerLayer } from './markerLayer';
import { RoadLayer } from './roadLayer';
import { SettlementLayer } from './settlementLayer';
import { TerrainLayer } from './terrainLayer';
import { TerritoryLayer } from './territoryLayer';
import { loadRealTextures, makeTextures, type GameTextures } from './textures';

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
  roads: RoadLayer;
  decor: DecorLayer;
  territory: TerritoryLayer;
  settlements: SettlementLayer;
  citizens: CitizenLayer;
  markers: MarkerLayer;
  fx: FxLayer;
  macro: MacroLayer;
  atmosphere: Atmosphere;

  private constructor(app: Application, world: World) {
    this.app = app;
    this.camera = new Camera(world.width, world.height);
    this.textures = makeTextures(app.renderer);
    this.terrain = new TerrainLayer(app.renderer, world, this.textures);
    this.roads = new RoadLayer();
    this.decor = new DecorLayer(this.textures);
    this.territory = new TerritoryLayer();
    this.settlements = new SettlementLayer(this.textures);
    this.citizens = new CitizenLayer(this.textures);
    this.markers = new MarkerLayer(this.textures);
    this.fx = new FxLayer(app.renderer, this.textures);
    this.macro = new MacroLayer(app.renderer);
    this.atmosphere = new Atmosphere(this.textures);

    this.camera.root.addChild(
      this.terrain.container,
      this.roads.g,
      this.decor.container,
      this.territory.g,
      this.settlements.container,
      this.citizens.container,
      this.markers.container,
      this.fx.container,
      this.macro.container,
    );
    app.stage.addChild(
      this.camera.root,
      this.atmosphere.nightMul,
      this.atmosphere.nightAdd,
      this.atmosphere.duskOverlay,
      this.settlements.glowContainer,
      this.atmosphere.weatherContainer,
      this.atmosphere.vignette,
    );
  }

  static async create(parent: HTMLElement, world: World): Promise<Renderer> {
    const app = new Application();
    let renderer: Renderer | null = null;
    try {
      await app.init({
        resizeTo: window,
        background: 0x0a0910,
        antialias: false,
        preference: 'webgl',
      });
      renderer = new Renderer(app, world);
      const procedural = snapshotGameTextures(renderer.textures);
      const loaded = await loadRealTextures(renderer.textures);
      destroyReplacedGameTextures(procedural, renderer.textures);
      // Publish only after Pixi + real assets are ready. A replacement world can
      // therefore build beside the active renderer without flashing a blank
      // canvas or destroying the current playable world on a load failure.
      parent.appendChild(app.canvas);
      if (loaded > 0) console.info(`Emberfall: loaded ${loaded} art assets.`);
      return renderer;
    } catch (error) {
      if (renderer) {
        renderer.destroy();
      } else {
        // app.init / constructor failures may leave a partially initialized app.
        // At this point no shared Assets textures have been installed, so a
        // best-effort deep teardown is safe; never mask the original error.
        try {
          app.destroy(true, { children: true, texture: true, textureSource: true });
        } catch {
          // Ignore cleanup failure and rethrow the actual construction error.
        }
      }
      throw error;
    }
  }

  get fps(): number {
    return this.app.ticker.FPS;
  }

  frame(input: FrameInput): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.camera.apply(w, h);
    this.atmosphere.resize(w, h);

    this.terrain.update(input.season, input.state.terrainVersion, input.dt);
    this.roads.update(input.state, this.textures);
    this.decor.update(input.dt, input.state, input.season);
    this.territory.update(input.dt, input.state);
    this.settlements.update(
      input.state,
      this.camera.scale,
      input.darkness,
      input.time,
      input.season,
      input.weather,
    );
    // Zoom bands: pulling out trades building clusters for the strategic
    // glyph layer; the crossfade keeps both readable mid-transition.
    this.settlements.container.alpha = 1 - macroBlend(this.camera.scale);
    this.citizens.update(input.agents, input.state, this.camera.scale, input.dt);
    this.markers.update(input.dt, input.state);
    this.fx.update(input.dt, input.state, input.darkness);
    this.macro.update(input.dt, input.state, this.camera.scale, input.time);

    // The glow layer sits above the night overlay; mirror the camera transform.
    const glow = this.settlements.glowContainer;
    glow.position.copyFrom(this.camera.root.position);
    glow.scale.copyFrom(this.camera.root.scale);

    this.atmosphere.update(input.dt, input.darkness, input.duskGlow, input.weather);
  }

  /** Save a PNG of the rendered canvas (DOM UI intentionally excluded). */
  async screenshot(filename: string): Promise<void> {
    await this.app.renderer.extract.download({ target: this.app.stage, filename });
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
    // Layer-owned generated textures are released explicitly. Assets.load()
    // textures are global cached objects shared by every Renderer instance, so
    // Application teardown must never recursively destroy sprite textures.
    this.fx.destroy();
    this.terrain.destroy();
    this.macro.destroy();
    this.atmosphere.destroy();
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
    destroyGameTextures(this.textures);
  }
}

export { BALANCE as RENDER_BALANCE };
