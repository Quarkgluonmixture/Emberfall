/**
 * Generated placeholder textures (see ASSET_MANIFEST.md for the real asset
 * plan). Everything is drawn with Graphics/canvas so the game has zero binary
 * asset dependencies.
 */
import { Graphics, Texture, type Renderer } from 'pixi.js';

export interface GameTextures {
  /** Indexed by settlement tier: camp, village, town. */
  settlement: [Texture, Texture, Texture];
  banner: Texture;
  citizen: Texture;
  glow: Texture;
  raindrop: Texture;
  snowflake: Texture;
}

/** Multiply a 0xRRGGBB color by a brightness factor. */
export function scaleColor(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

function gen(renderer: Renderer, g: Graphics): Texture {
  const tex = renderer.generateTexture(g);
  tex.source.scaleMode = 'nearest';
  g.destroy();
  return tex;
}

function makeCamp(renderer: Renderer): Texture {
  const g = new Graphics();
  g.poly([0, 7, 4, 0, 8, 7]).fill(0x8a6b4a);
  g.poly([3, 7, 4, 4.6, 5, 7]).fill(0x3a2c1e);
  g.circle(10.5, 6, 1.3).fill(0xffb45c);
  g.rect(9.8, 6.8, 1.6, 0.8).fill(0x5a4632);
  return gen(renderer, g);
}

function makeVillage(renderer: Renderer): Texture {
  const g = new Graphics();
  g.rect(0, 4, 6, 5).fill(0x7d6347);
  g.poly([-0.5, 4, 3, 1, 6.5, 4]).fill(0x59412c);
  g.rect(2.4, 6.4, 1.4, 2.6).fill(0xffd089);
  g.rect(8, 6, 6, 5).fill(0x73593f);
  g.poly([7.5, 6, 11, 3, 14.5, 6]).fill(0x52391f);
  g.rect(10.2, 7.8, 1.4, 1.8).fill(0xffd089);
  return gen(renderer, g);
}

function makeTown(renderer: Renderer): Texture {
  const g = new Graphics();
  g.rect(0, 9, 18, 5).fill(0x6b6258); // wall
  g.rect(0, 8, 1.6, 1).fill(0x7b7268);
  g.rect(4, 8, 1.6, 1).fill(0x7b7268);
  g.rect(8, 8, 1.6, 1).fill(0x7b7268);
  g.rect(12, 8, 1.6, 1).fill(0x7b7268);
  g.rect(16, 8, 1.6, 1).fill(0x7b7268);
  g.rect(2.5, 4, 5, 6).fill(0x7d6347); // hall
  g.poly([2, 4, 5, 1.4, 8, 4]).fill(0x59412c);
  g.rect(4.3, 6, 1.4, 2).fill(0xffd089);
  g.rect(11, 1.5, 4, 8.5).fill(0x8a8076); // keep tower
  g.poly([10.5, 1.5, 13, -1, 15.5, 1.5]).fill(0x4f4a44);
  g.rect(12.2, 3.4, 1.5, 1.8).fill(0xffd089);
  g.rect(12.2, 6.4, 1.5, 1.8).fill(0xffd089);
  return gen(renderer, g);
}

function makeBanner(renderer: Renderer): Texture {
  const g = new Graphics();
  g.rect(0, 0, 0.9, 7).fill(0xc9c2b4);
  g.rect(0.9, 0.4, 4, 3.2).fill(0xffffff); // tinted with civ color
  return gen(renderer, g);
}

function makeCitizen(renderer: Renderer): Texture {
  const g = new Graphics();
  g.circle(1.5, 1.1, 1.05).fill(0xffffff);
  g.rect(0.5, 2, 2, 3.2).fill(0xffffff);
  return gen(renderer, g);
}

function makeGlow(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 195, 115, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 155, 64, 0.4)');
  grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return Texture.from(canvas);
}

function makeRaindrop(renderer: Renderer): Texture {
  const g = new Graphics();
  g.rect(0, 0, 1, 5).fill({ color: 0x9fc4e8, alpha: 0.65 });
  return gen(renderer, g);
}

function makeSnowflake(renderer: Renderer): Texture {
  const g = new Graphics();
  g.circle(1, 1, 1).fill({ color: 0xffffff, alpha: 0.85 });
  return gen(renderer, g);
}

export function makeTextures(renderer: Renderer): GameTextures {
  return {
    settlement: [makeCamp(renderer), makeVillage(renderer), makeTown(renderer)],
    banner: makeBanner(renderer),
    citizen: makeCitizen(renderer),
    glow: makeGlow(),
    raindrop: makeRaindrop(renderer),
    snowflake: makeSnowflake(renderer),
  };
}
