# Emberfall — Asset Manifest

Status legend: **placeholder** = drawn procedurally at runtime in
`src/render/textures.ts` or as flat tile colors; **generated** = produced by an
image model and shipped in `public/assets/`; **downloaded** = sourced from an
asset pack. _Currently every asset is placeholder; the game has zero binary
dependencies._

Target style for final art: cozy dark-fantasy, top-down, muted palette with
warm ember accents, painterly-pixel hybrid, readable at small sizes.

## Terrain tiles

One tile is 8×8 px on screen; author at 32×32 px (4× resolution) so zoom holds
up. Each terrain needs 4 seasonal variants + 3 jitter variations per season
(12 images each) to break up tiling.

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| tile_ocean (deep/shallow gradient set) | 32×32 | 12 | placeholder (flat color + shade) |
| tile_coast (sand/shingle) | 32×32 | 12 | placeholder |
| tile_grassland | 32×32 | 12 | placeholder |
| tile_forest (canopy) | 32×32 | 12 | placeholder |
| tile_mountain (peaks, snowcapped in winter) | 32×32 | 12 | placeholder |
| tile_river (straight, bend, mouth) | 32×32 | 12×3 shapes | placeholder |
| tile_swamp | 32×32 | 12 | placeholder |
| tile_desert | 32×32 | 12 | placeholder |
| tile_tundra | 32×32 | 12 | placeholder |

## Settlements

Authored at 4× (sprite footprint on map ≈ 12–20 px wide).

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| settlement_camp (tent + campfire) | 48×40 | 2 (fire flicker) | placeholder (Graphics) |
| settlement_village (2–3 huts, lit windows) | 64×48 | 2 (window glow) | placeholder (Graphics) |
| settlement_town (walls, keep, market) | 80×64 | 2 (window glow) | placeholder (Graphics) |
| settlement_ruins (collapsed town) | 64×48 | 1 | **missing** (not yet rendered) |
| banner_civ (tintable flag) | 16×28 | 1 | placeholder (Graphics, white = tint target) |

## Citizens

Tiny agents, tinted per civilization. Authored at 4× (12×24 px source,
3×6 px on screen).

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| citizen_walk | 12×24 | 4 | placeholder (static sprite + code bob) |
| citizen_work (swing/gather) | 12×24 | 4 | placeholder (code bob) |
| citizen_fight | 12×24 | 4 | placeholder (code lunge) |
| citizen_rest (sitting) | 12×24 | 2 | placeholder (alpha fade) |

## Atmosphere & effects

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| fx_glow_warm (radial light) | 64×64 | 1 | placeholder (canvas gradient) |
| fx_raindrop | 4×20 | 1 | placeholder (Graphics) |
| fx_snowflake | 8×8 | 3 | placeholder (Graphics, 1 frame) |
| fx_smoke_puff (chimneys) | 16×16 | 4 | **missing** (not yet rendered) |
| fx_fire_wildfire | 24×24 | 4 | **missing** (wildfire is terrain-only) |

## UI

| Asset | Dimensions | Frames | Status |
| --- | --- | --- | --- |
| ui_panel_frame (9-slice, parchment-on-dark) | 96×96 | 1 | placeholder (CSS) |
| ui_icons (pause/play/speed/save/load/history/debug) | 24×24 each | 1 each | placeholder (text/emoji) |
| ui_season_icons (spring/summer/autumn/winter) | 20×20 | 1 each | placeholder (emoji) |
| ui_event_icons (war/plague/famine/golden-age/…, 12 kinds) | 20×20 | 1 each | **missing** (text only) |
