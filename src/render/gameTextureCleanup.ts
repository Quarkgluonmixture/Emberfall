import { Assets, Texture } from 'pixi.js';
import { DECOR_KINDS, PIECE_KINDS, type GameTextures } from './textures';

const BASE_ASSETS = [
  'settlement_camp.png',
  'settlement_village.png',
  'settlement_town.png',
  'settlement_ruins.png',
  'banner.png',
  'fx_glow.png',
  'fx_raindrop.png',
  'fx_snowflake.png',
  'fx_smoke.png',
  'citizen_walk.png',
  'citizen_work.png',
  'citizen_fight.png',
  'citizen_rest.png',
  'terrain_spring.png',
  'terrain_summer.png',
  'terrain_autumn.png',
  'terrain_winter.png',
  'fx_wildfire.png',
  'terrain_river_spring.png',
  'terrain_river_summer.png',
  'terrain_river_autumn.png',
  'terrain_river_winter.png',
  'citizen6_walk.png',
  'citizen6_work.png',
  'citizen6_fight.png',
  'citizen6_rest.png',
  'bridge_h.png',
  'bridge_v.png',
  'ford_h.png',
  'ford_v.png',
] as const;

const ACTION_ASSETS = [
  'action_gather.svg',
  'action_farm.svg',
  'action_build.svg',
  'action_trade.svg',
  'action_fight.svg',
  'action_flee.svg',
  'action_rest.svg',
] as const;

const STATUS_ASSETS = ['event_plague.svg', 'event_famine.svg', 'event_warDeclared.svg'] as const;

function assetUrls(): string[] {
  return [
    ...BASE_ASSETS.map((name) => `assets/${name}`),
    ...PIECE_KINDS.map((name) => `assets/pieces/${name}.png`),
    ...ACTION_ASSETS.map((name) => `assets/icons/${name}`),
    ...STATUS_ASSETS.map((name) => `assets/icons/${name}`),
    ...DECOR_KINDS.flatMap(([base, variants]) =>
      Array.from({ length: variants }, (_, i) => `assets/decor/${base}_${i}.png`),
    ),
  ];
}

function collectTextures(value: unknown, out: Set<Texture>): void {
  if (value instanceof Texture) {
    out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTextures(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const child of Object.values(value as Record<string, unknown>)) collectTextures(child, out);
}

/**
 * Destroy a known set of renderer-local textures while preserving Pixi Assets
 * cache entries and their shared sources. Exported separately so the ownership
 * rule can be unit-tested without a browser/GPU.
 */
export function destroyTextureSet(
  textures: Iterable<Texture>,
  sharedTextures: ReadonlySet<Texture>,
  sharedSources: ReadonlySet<unknown>,
): void {
  for (const texture of new Set(textures)) {
    if (sharedTextures.has(texture)) continue;
    if (sharedSources.has(texture.source)) texture.destroy(false);
    else texture.destroy(true);
  }
}

/** Release only textures owned by one GameTextures instance. */
export function destroyGameTextures(game: GameTextures): void {
  const sharedTextures = new Set<Texture>();
  const sharedSources = new Set<unknown>();
  for (const url of assetUrls()) {
    try {
      const texture = Assets.get<Texture>(url);
      if (texture instanceof Texture) {
        sharedTextures.add(texture);
        sharedSources.add(texture.source);
      }
    } catch {
      // A missing optional asset is normal; it has nothing to protect.
    }
  }

  const textures = new Set<Texture>();
  collectTextures(game, textures);
  destroyTextureSet(textures, sharedTextures, sharedSources);
}
