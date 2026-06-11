# Emberfall — Asset Manifest

Status legend: **placeholder** = drawn procedurally at runtime in
`src/render/textures.ts` or as flat tile colors; **generated** = produced by an
image model and shipped in `public/assets/`; **downloaded** = sourced from an
asset pack.

_Most assets are now **generated** (GPT-Image, 2026-06-11). Raw exports live in
`assets_src/raw/`; run `node scripts/process-assets.mjs` to regenerate the
game-ready PNGs in `public/assets/` (it chroma-keys the fake checkerboard
"transparency" baked into the exports, then resizes). The procedural
placeholders remain as automatic fallbacks if any file is missing._

**Keying note:** white/neutral-bright art (banner cloth, smoke, glow
gradients, rain streaks) cannot be separated from a baked checkerboard. Those
four were regenerated on solid black (`assets_src/raw/6/`) and are extracted
via dark flood-fill (banner) or luminance-as-alpha (smoke, glow, raindrop).

Target style for final art: cozy dark-fantasy, top-down, muted palette with
warm ember accents, painterly-pixel hybrid, readable at small sizes.

## Terrain tiles

One tile is 8×8 px on screen; author at 32×32 px (4× resolution) so zoom holds
up. Each terrain needs 4 seasonal variants + 3 jitter variations per season
(12 images each) to break up tiling.

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| tile_ocean (deep/shallow gradient set) | 64×64 cell | 12 | generated (terrain_*.png sheets) |
| tile_coast (sand/shingle) | 64×64 cell | 12 | generated |
| tile_grassland | 64×64 cell | 12 | generated |
| tile_forest (canopy) | 64×64 cell | 12 | generated |
| tile_mountain (peaks, snowcapped in winter) | 64×64 cell | 12 | generated |
| tile_river (straight, in season sheets) | 64×64 cell | 12 | generated |
| tile_river_bend + mouth (terrain_river_*.png, 3 variants × 2 shapes × 4 seasons) | 64×64 cell | 24 | generated (2026-06-11, `assets_src/raw/8/`); renderer rotates per neighbors |
| tile_swamp | 64×64 cell | 12 | generated |
| tile_desert | 64×64 cell | 12 | generated |
| tile_tundra | 64×64 cell | 12 | generated |

## Settlements

Authored at 4× (sprite footprint on map ≈ 12–20 px wide).

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| settlement_camp (tent + campfire) | 128×107 | 1 | generated |
| settlement_village (2–3 huts, lit windows) | 160×120 | 1 | generated |
| settlement_town (walls, keep, market) | 192×154 | 1 | generated |
| settlement_ruins (collapsed town) | 160×120 | 1 | generated |
| banner_civ (tintable flag) | 64×~66 | 1 | generated (black-bg regen) |

## Citizens

Tiny agents, tinted per civilization. Authored at 4× (12×24 px source,
3×6 px on screen).

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| citizen_walk | 48×96/frame | 4 | generated |
| citizen_work (swing/gather) | 48×96/frame | 4 | generated |
| citizen_fight | 48×96/frame | 4 | generated |
| citizen_rest (sitting) | 48×96/frame | 2 | generated |

## Atmosphere & effects

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| fx_glow_warm (radial light) | 128×128 | 1 | generated (black-bg regen, luma-alpha) |
| fx_raindrop | ~10×24 | 1 | generated (black-bg regen, luma-alpha) |
| fx_snowflake | 16×16 | 1 | generated |
| fx_smoke_puff (chimneys) | 64×64/frame | 4 | generated (black-bg regen, luma-alpha) |
| fx_fire_wildfire (fx_wildfire.png) | 64×64/frame | 4 | generated (black-bg regen in `assets_src/raw/7/`, luma-alpha); flames spawn on wildfire chronicle events |

## Music

Suno-generated instrumentals (2026-06-11). Masters live in `assets_src/music/`
(git-ignored); `scripts/process-assets.mjs` copies them to
`public/assets/music/` under the role names `src/audio/music.ts` plays.
Selection logic: season track by default, night track when darkness falls,
war/disaster/golden-age moods cut in on matching chronicle events, theme plays
once at boot. Toggle with M or the HUD button.

| Role | File | Source (Suno title) | Status |
| --- | --- | --- | --- |
| theme (boot, plays once) | theme.mp3 | Cinder Lullaby | **generated** |
| spring | spring.mp3 | Apple Orchard | **generated** |
| summer | summer.mp3 | Hearth Festival | **generated** |
| autumn | autumn.mp3 | Golden Harveststrings | **generated** |
| winter | winter.mp3 | Frosted Palimpsest | **generated** |
| night layer | night.mp3 | Owlwood Lullaby | **generated** |
| war mood | war.mp3 | Cinder Canticles | **generated** |
| disaster mood (plague/famine/fire/collapse) | disaster.mp3 | Golden Ashes | **generated** |
| golden-age mood | goldenage.mp3 | Candle Ironwood | **generated** |

To remap a track, edit `MUSIC_MAP` in `scripts/process-assets.mjs` and rerun it.

## UI

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| ui_panel_frame (9-slice, parchment-on-dark) | 96×96 | 1 | placeholder (CSS) |
| ui_icons (pause/play/speed/save/load/history/debug) | SVG, vector | 7 | **downloaded** (`icons/ui_*.svg`) — not yet wired into UI |
| ui_season_icons (spring/summer/autumn/winter) | SVG, vector | 4 | **downloaded** (`icons/season_*.svg`) — not yet wired |
| ui_event_icons (all 16 chronicle event kinds) | SVG, vector | 16 | **downloaded** (`icons/event_<kind>.svg`) — not yet wired |

Icons are white-on-transparent SVGs from game-icons.net (CC BY 3.0), fetched
2026-06-11 into `public/assets/icons/`; see `icons/ATTRIBUTION.md` for the
per-file author table (attribution required if redistributed). File names match
sim event kinds 1:1 (`wildfireWild` reuses `event_wildfire.svg`); tint via CSS
`filter` or use as masks.
