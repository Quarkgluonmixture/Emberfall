/**
 * Texture management. Procedural placeholders are generated first so the game
 * always works; real art from public/assets/ (see ASSET_MANIFEST.md) is then
 * loaded on top, replacing whatever is available. Any missing/failed file
 * silently keeps its placeholder.
 */
import { Assets, Graphics, Rectangle, Texture, type Renderer } from 'pixi.js';

export interface CitizenAnims {
  walk: Texture[];
  work: Texture[];
  fight: Texture[];
  rest: Texture[];
}

export interface GameTextures {
  /** Indexed by settlement tier: camp, village, town. */
  settlement: [Texture, Texture, Texture];
  ruins: Texture | null;
  banner: Texture;
  /** Fallback single-frame citizen (used when citizenAnims is null). */
  citizen: Texture;
  citizenAnims: CitizenAnims | null;
  glow: Texture;
  raindrop: Texture;
  snowflake: Texture;
  smoke: Texture[] | null;
  /** Wildfire flame animation frames. Null → no flame FX. */
  wildfire: Texture[] | null;
  /** Real terrain art: [season][terrain][variation]. Null → flat-color bake. */
  terrainTiles: Texture[][][] | null;
  /** River shapes: [season][shape: 0 bend (N→E), 1 mouth (N→ocean S)][variation]. */
  riverTiles: Texture[][][] | null;
  /** Building pieces for settlement clusters (batch 9). Null → legacy single
      sprites. Individual kinds may be missing while art is incomplete. */
  pieces: Record<string, Texture> | null;
  /** Terrain decor sprites grouped by base name (batch 10). */
  decor: Record<string, Texture[]> | null;
  /** White action glyphs shown above citizens at close zoom (CC BY icons). */
  actionIcons: Record<string, Texture> | null;
  /** Settlement status glyphs (plague/famine/raid), shown above clusters. */
  statusIcons: { plague: Texture | null; famine: Texture | null; war: Texture | null } | null;
}

/** Agent states with an overhead action icon (walking is self-evident). */
export const ACTION_ICON_STATES = [
  'gathering',
  'farming',
  'building',
  'trading',
  'fighting',
  'fleeing',
  'resting',
] as const;

const ACTION_ICON_FILES: Record<string, string> = {
  gathering: 'action_gather.svg',
  farming: 'action_farm.svg',
  building: 'action_build.svg',
  trading: 'action_trade.svg',
  fighting: 'action_fight.svg',
  fleeing: 'action_flee.svg',
  resting: 'action_rest.svg',
};

/** Piece kinds the cluster layouts may request (public/assets/pieces/). */
export const PIECE_KINDS = [
  'tent_0',
  'tent_1',
  'hut_0',
  'hut_1',
  'hut_2',
  'house_0',
  'house_1',
  'house_2',
  'granary',
  'shed',
  'crates',
  'shrine',
  'well',
  'stall_0',
  'stall_1',
  'hall',
  'wall_straight',
  'wall_tower',
  'wall_gate',
  'wall_vertical',
  'palisade_straight',
  'palisade_corner',
  'palisade_vertical',
  'lamp',
  'scaffold',
  'campfire',
  'ruin_0',
  'ruin_1',
  'ruin_2',
] as const;

/** Decor base names and their variant counts (public/assets/decor/). */
export const DECOR_KINDS: [string, number][] = [
  ['rock', 6],
  ['tree_broadleaf', 4],
  ['tree_conifer', 4],
  ['reed', 4],
  ['bush', 4],
];

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
  g.rect(0, 9, 18, 5).fill(0x6b6258);
  g.rect(0, 8, 1.6, 1).fill(0x7b7268);
  g.rect(4, 8, 1.6, 1).fill(0x7b7268);
  g.rect(8, 8, 1.6, 1).fill(0x7b7268);
  g.rect(12, 8, 1.6, 1).fill(0x7b7268);
  g.rect(16, 8, 1.6, 1).fill(0x7b7268);
  g.rect(2.5, 4, 5, 6).fill(0x7d6347);
  g.poly([2, 4, 5, 1.4, 8, 4]).fill(0x59412c);
  g.rect(4.3, 6, 1.4, 2).fill(0xffd089);
  g.rect(11, 1.5, 4, 8.5).fill(0x8a8076);
  g.poly([10.5, 1.5, 13, -1, 15.5, 1.5]).fill(0x4f4a44);
  g.rect(12.2, 3.4, 1.5, 1.8).fill(0xffd089);
  g.rect(12.2, 6.4, 1.5, 1.8).fill(0xffd089);
  return gen(renderer, g);
}

function makeBanner(renderer: Renderer): Texture {
  const g = new Graphics();
  g.rect(0, 0, 0.9, 7).fill(0xc9c2b4);
  g.rect(0.9, 0.4, 4, 3.2).fill(0xffffff);
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
    ruins: null,
    banner: makeBanner(renderer),
    citizen: makeCitizen(renderer),
    citizenAnims: null,
    glow: makeGlow(),
    raindrop: makeRaindrop(renderer),
    snowflake: makeSnowflake(renderer),
    smoke: null,
    wildfire: null,
    terrainTiles: null,
    riverTiles: null,
    pieces: null,
    decor: null,
    actionIcons: null,
    statusIcons: null,
  };
}

// ── Real asset loading ─────────────────────────────────────────────

const ASSET_BASE = 'assets/';

async function tryLoad(name: string): Promise<Texture | null> {
  try {
    const tex = await Assets.load<Texture>(ASSET_BASE + name);
    return tex ?? null;
  } catch {
    return null;
  }
}

/** Cut a horizontal strip into equal frames. */
function sliceStrip(base: Texture, frames: number): Texture[] {
  const w = base.width / frames;
  return Array.from(
    { length: frames },
    (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * w, 0, w, base.height) }),
  );
}

/** Cut a 3-column × 9-row terrain sheet into [terrain][variation] cells. */
function sliceTerrainSheet(base: Texture): Texture[][] {
  base.source.autoGenerateMipmaps = true;
  const cell = base.width / 3;
  const inset = cell * 0.15; // trim the grid gutters baked into the sheet
  const out: Texture[][] = [];
  for (let t = 0; t < 9; t++) {
    const row: Texture[] = [];
    for (let v = 0; v < 3; v++) {
      row.push(
        new Texture({
          source: base.source,
          frame: new Rectangle(
            v * cell + inset,
            t * cell + inset,
            cell - 2 * inset,
            cell - 2 * inset,
          ),
        }),
      );
    }
    out.push(row);
  }
  return out;
}

/** Cut a 3-column × 2-row river sheet into [shape: bend, mouth][variation] cells. */
function sliceRiverSheet(base: Texture): Texture[][] {
  base.source.autoGenerateMipmaps = true;
  const cell = base.width / 3;
  const inset = cell * 0.15;
  const out: Texture[][] = [];
  for (let s = 0; s < 2; s++) {
    const row: Texture[] = [];
    for (let v = 0; v < 3; v++) {
      row.push(
        new Texture({
          source: base.source,
          frame: new Rectangle(
            v * cell + inset,
            s * cell + inset,
            cell - 2 * inset,
            cell - 2 * inset,
          ),
        }),
      );
    }
    out.push(row);
  }
  return out;
}

/**
 * Load real art over the procedural placeholders. Returns the number of
 * assets found (0 means the game runs fully procedural).
 */
export async function loadRealTextures(tex: GameTextures): Promise<number> {
  const [
    camp,
    village,
    town,
    ruins,
    banner,
    glow,
    raindrop,
    snowflake,
    smoke,
    walk,
    work,
    fight,
    rest,
    spring,
    summer,
    autumn,
    winter,
    wildfire,
    rivSpring,
    rivSummer,
    rivAutumn,
    rivWinter,
  ] = await Promise.all([
    tryLoad('settlement_camp.png'),
    tryLoad('settlement_village.png'),
    tryLoad('settlement_town.png'),
    tryLoad('settlement_ruins.png'),
    tryLoad('banner.png'),
    tryLoad('fx_glow.png'),
    tryLoad('fx_raindrop.png'),
    tryLoad('fx_snowflake.png'),
    tryLoad('fx_smoke.png'),
    tryLoad('citizen_walk.png'),
    tryLoad('citizen_work.png'),
    tryLoad('citizen_fight.png'),
    tryLoad('citizen_rest.png'),
    tryLoad('terrain_spring.png'),
    tryLoad('terrain_summer.png'),
    tryLoad('terrain_autumn.png'),
    tryLoad('terrain_winter.png'),
    tryLoad('fx_wildfire.png'),
    tryLoad('terrain_river_spring.png'),
    tryLoad('terrain_river_summer.png'),
    tryLoad('terrain_river_autumn.png'),
    tryLoad('terrain_river_winter.png'),
  ]);

  let loaded = 0;
  const count = (t: Texture | null): boolean => {
    if (t) loaded++;
    return t !== null;
  };

  if (count(camp)) tex.settlement[0] = camp!;
  if (count(village)) tex.settlement[1] = village!;
  if (count(town)) tex.settlement[2] = town!;
  if (count(ruins)) tex.ruins = ruins;
  if (count(banner)) tex.banner = banner!;
  if (count(glow)) tex.glow = glow!;
  if (count(raindrop)) tex.raindrop = raindrop!;
  if (count(snowflake)) tex.snowflake = snowflake!;
  if (count(smoke)) tex.smoke = sliceStrip(smoke!, 4);
  if (count(walk) && count(work) && count(fight) && count(rest)) {
    tex.citizenAnims = {
      walk: sliceStrip(walk!, 4),
      work: sliceStrip(work!, 4),
      fight: sliceStrip(fight!, 4),
      rest: sliceStrip(rest!, 2),
    };
  }
  if (count(spring) && count(summer) && count(autumn) && count(winter)) {
    tex.terrainTiles = [
      sliceTerrainSheet(spring!),
      sliceTerrainSheet(summer!),
      sliceTerrainSheet(autumn!),
      sliceTerrainSheet(winter!),
    ];
  }
  if (count(wildfire)) tex.wildfire = sliceStrip(wildfire!, 4);
  if (count(rivSpring) && count(rivSummer) && count(rivAutumn) && count(rivWinter)) {
    tex.riverTiles = [
      sliceRiverSheet(rivSpring!),
      sliceRiverSheet(rivSummer!),
      sliceRiverSheet(rivAutumn!),
      sliceRiverSheet(rivWinter!),
    ];
  }

  // Settlement-cluster building pieces; any subset may exist while the art
  // batches are incomplete. The cluster layouts substitute or skip missing
  // kinds, and with no pieces at all the legacy single sprites stay in use.
  const pieceTextures = await Promise.all(PIECE_KINDS.map((k) => tryLoad(`pieces/${k}.png`)));
  const pieces: Record<string, Texture> = {};
  let pieceCount = 0;
  for (let i = 0; i < PIECE_KINDS.length; i++) {
    const t = pieceTextures[i];
    if (t) {
      pieces[PIECE_KINDS[i]] = t;
      pieceCount++;
    }
  }
  if (pieceCount > 0) {
    tex.pieces = pieces;
    loaded += pieceCount;
  }

  const actionEntries = await Promise.all(
    Object.entries(ACTION_ICON_FILES).map(
      async ([state, file]) => [state, await tryLoad(`icons/${file}`)] as const,
    ),
  );
  const actionIcons: Record<string, Texture> = {};
  let actionCount = 0;
  for (const [state, t] of actionEntries) {
    if (t) {
      actionIcons[state] = t;
      actionCount++;
    }
  }
  if (actionCount > 0) {
    tex.actionIcons = actionIcons;
    loaded += actionCount;
  }

  const [plagueIcon, famineIcon, warIcon] = await Promise.all([
    tryLoad('icons/event_plague.svg'),
    tryLoad('icons/event_famine.svg'),
    tryLoad('icons/event_warDeclared.svg'),
  ]);
  if (plagueIcon || famineIcon || warIcon) {
    tex.statusIcons = { plague: plagueIcon, famine: famineIcon, war: warIcon };
    loaded += [plagueIcon, famineIcon, warIcon].filter(Boolean).length;
  }

  const decor: Record<string, Texture[]> = {};
  let decorCount = 0;
  for (const [base, variants] of DECOR_KINDS) {
    const list = (
      await Promise.all(Array.from({ length: variants }, (_, i) => tryLoad(`decor/${base}_${i}.png`)))
    ).filter((t): t is Texture => t !== null);
    if (list.length > 0) {
      decor[base] = list;
      decorCount += list.length;
    }
  }
  if (decorCount > 0) {
    tex.decor = decor;
    loaded += decorCount;
  }

  return loaded;
}
