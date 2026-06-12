# Emberfall — GPT-Image Prompt Spec: Batches 9–13

Building pieces (batch 9) and terrain decor (batch 10) for the settlement-scale
rework: settlements become procedural clusters assembled from individual pieces,
so every piece is generated **isolated** — no baked ground patches, no
composition. The layout engine owns placement, shared ground, glow and shadows.

## How to generate & deliver

- Model: GPT-Image. Size: **1536×1024 (landscape)** for multi-piece strips,
  **1024×1024** for singles (noted per image below).
- Save into `assets_src/raw/9/` and `assets_src/raw/10/` with the **exact
  filenames** below — the pipeline picks files in sorted order.
- Then run `node scripts/process-assets.mjs` (folder 9/10 handlers land with the
  cluster engine; generating can start before that).
- Background: ask for plain white; a fake checkerboard is also fine — both key
  out via the existing border flood-fill (it removes connected neutral-bright
  pixels). **Never a colored or dark background.** Nothing in these batches
  needs the black-background mode.

**Regenerate a piece if:** it has baked smoke/glow/light halos · a large ground
patch (small contact shadow directly under the object is good, a terrain disc is
not) · pure-white or near-white edges touching the background (the key will eat
them) · pieces in a strip touch each other or the image edge · the silhouette
turns to mush when you shrink the image to ~48 px wide (zoom-out test — squint).

## Shared style preamble — paste at the START of every prompt

> Cozy dark-fantasy video game sprite set, painterly pixel-art hybrid, top-down
> three-quarter view (camera tilted about 45 degrees), muted earthy palette with
> warm ember accents, soft ambient light from the upper left. Mid-tones brighter
> than typical dark fantasy: rooftops clearly lighter than walls so structures
> stay readable against dark terrain. Crisp, readable silhouettes at small
> sizes. Each object isolated on a plain solid white background, with only a
> small soft contact shadow directly beneath it. No checkerboard, no text, no
> watermark, no border, no smoke, no fire glow, no light halos. Objects must not
> touch each other or the image edges.

(The existing art skews charcoal-dark — the brighter-mid-tones line is
deliberate; it fixes the "muddy clumps" critique from the Gemini audit.)

## Batch 9 — building pieces → `assets_src/raw/9/`

| File | Size | Pieces (left → right) | Prompt body (after the preamble) |
| --- | --- | --- | --- |
| `01_tents.png` | 1536×1024 | 2 | Two nomad tents in a horizontal row, same scale: a weathered beige canvas tent with wooden poles and rope stakes; a darker hide-and-fur tent with a smoke flap. Rustic early-settlement look. |
| `02_huts.png` | 1536×1024 | 3 | Three small peasant huts in a horizontal row, same scale, each different: round wattle-and-daub hut with conical thatched roof; square timber hut with mossy thatched roof; stone-based hut with turf roof. Tiny warm-lit window on each. |
| `03_houses.png` | 1536×1024 | 3 | Three medieval village houses in a horizontal row, same scale, each different: timber-framed house with steep amber shingle roof; stone cottage with slate roof and chimney; two-story half-timbered house with overhanging upper floor. Distinct roof colors (warm amber, cool slate, faded red) so they read apart at small sizes. |
| `04_storage.png` | 1536×1024 | 3 | A raised wooden granary on stilts with a ladder; a low open-sided storage shed with stacked sacks; a neat stack of wooden crates and barrels. Horizontal row, same scale. |
| `05_civic.png` | 1536×1024 | 2 | A small weathered stone shrine with a candle niche and moss; a round stone well with a wooden roof and bucket. Horizontal row, same scale. |
| `06_market.png` | 1536×1024 | 2 | Two wooden market stalls in a horizontal row, same scale: one with a faded red-striped cloth awning displaying fruit baskets, one with a plain canvas awning displaying cloth bolts and pottery. |
| `07_temple.png` | 1024×1024 | 1 | A single grand hall: long stone-and-timber great hall with a steep wood-shingled roof, carved doorposts, small bell gable, warm-lit windows. The landmark building of a town — larger and more ornate than a house, but still rustic, not a cathedral. |
| `08_walls_stone.png` | 1536×1024 | 3 | Medieval town fortification pieces in a horizontal row, same scale: a short straight stone wall segment with a wooden walkway; a square stone corner tower with a small roof; an arched stone gatehouse with wooden doors. Designed to tile into a wall ring. |
| `09_palisade.png` | 1536×1024 | 2 | Village palisade pieces in a horizontal row, same scale: a straight segment of sharpened wooden log palisade; a palisade corner post with a small watch platform. Designed to tile into a defensive ring. |
| `10_props.png` | 1536×1024 | 3 | A wrought-iron street lamp post with a glass lantern, unlit; a wooden construction scaffold around a half-built stone wall corner; a stone-ringed campfire with small orange flames and embers, no smoke. Horizontal row, same scale. |
| `11_ruins.png` | 1536×1024 | 3 | Ruined remains in a horizontal row, same scale: a broken stone wall stub with moss and ivy; a collapsed house corner with charred roof beams; a low rubble heap with ash and scattered stones. Somber, overgrown, long-abandoned. |

Processed targets (pipeline slices strips into equal columns, keys, trims,
resizes): regular pieces ~48 px wide, hall/gatehouse/tower ~80–96 px, props
~32–48 px. Final on-map footprints: hut ≈ 4–6 world px, house ≈ 5–7, hall ≈
10–12 (settlement clusters span 2–5 tiles).

## Batch 10 — terrain decor → `assets_src/raw/10/`

| File | Size | Pieces | Prompt body (after the preamble) |
| --- | --- | --- | --- |
| `01_rocks.png` | 1536×1024 | 3 | Three moss-and-lichen covered boulders in a horizontal row, same scale, different shapes: one tall weathered standing stone, one rounded boulder pair, one flat cracked slab. |
| `02_trees_broadleaf.png` | 1536×1024 | 2 | Two small broadleaf tree clusters in a horizontal row, same scale: a pair of oaks with full rounded canopies; a single large gnarled oak with exposed roots. Neutral mid-green foliage (the game tints foliage per season — avoid strong autumn or spring coloring). |
| `03_trees_conifer.png` | 1536×1024 | 2 | Two conifer clusters in a horizontal row, same scale: a tight group of three tall dark spruces; a single wind-bent pine with sparse branches. Slightly frost-dusted tips, neutral dark green. |
| `04_reeds.png` | 1536×1024 | 2 | Two riverbank reed clumps in a horizontal row, same scale: tall cattails with brown seed heads; a softer clump of marsh grass bending in the wind. |
| `05_bushes.png` | 1536×1024 | 2 | Two low shrubs in a horizontal row, same scale: a berry bush with small red berries; a rough heather/bramble shrub. Neutral mid-green. |

Processed targets: ~32–40 px wide each. Ground decals (clearings, snow patches)
are intentionally absent — those stay procedural (soft tinted patches at bake
time), keyed decals would bring hard edges.

## Batch 11 — vertical wall runs → `assets_src/raw/11/`

The horizontal wall art cannot turn corners: rotating it breaks the 3/4
perspective, and the current fallback (tightly stacked horizontal courses)
is serviceable but not pretty. One image upgrades every town wall:

| File | Size | Pieces | Prompt body (after the preamble) |
| --- | --- | --- | --- |
| `01_walls_vertical.png` | 1536×1024 | 2 | Two wall segments running VERTICALLY (top of image to bottom, seen in three-quarter view so the left face of each wall is visible): a straight stone wall segment with battlements, drawn as if the wall runs north-south; a sharpened wooden log palisade segment also running north-south. Each segment should tile seamlessly when repeated vertically. Horizontal row, same scale. |

Processed targets: ~28 px wide each. They are auto-preferred by the town
wall layout the moment `process-assets.mjs` runs.

## Batch 12 — terrain variety (anti-repetition) → `assets_src/raw/12/`

The biome tiles only have 3 variants each, so big mountain ranges and forests
read as repeating wallpaper (worst in autumn). Large landmark decor breaks the
tiling without touching the terrain pipeline — these render as oversized decor
sprites scattered over the matching biomes.

| File | Size | Pieces | Prompt body (after the preamble) |
| --- | --- | --- | --- |
| `01_mountain_formations.png` | 1536×1024 | 3 | Three large rocky mountain formations in a horizontal row, same scale: a twin-peaked craggy summit with snow dusting; a long weathered ridge spine with exposed strata; a dramatic single crag with scree slopes at its base. Grey-brown stone, mossy footings. These are landmark formations, larger and more detailed than common boulders. |
| `02_forest_canopies.png` | 1536×1024 | 2 | Two large broadleaf forest canopy clusters in a horizontal row, same scale: a dense interlocking crown of five or six mature oaks reading as one mass; a looser grove with a clearing hint at its center. Neutral mid-green foliage (the game tints per season — avoid autumn or spring coloring). |

Processed targets: formations ~90 px wide, canopies ~80 px. On-map: formations
span ~2 tiles over mountain ranges, canopies over forest interiors.

## Batch 13 — terrain tile variants 3→6 → `assets_src/raw/13/`

**This is an opaque big-sheet batch (like the original season sheets), NOT a
sliced-piece batch — the shared white-background preamble above does NOT
apply.** The sheets are processed with a plain resize (no keying, no slicing
by components); the loader cuts a fixed grid and crops a 15% inset from each
cell edge, so thin gutter lines between cells are expected and harmless.

Why: each biome currently has only 3 tile variants, so large uniform areas
(mountain ranges, forests, deserts) read as repeating wallpaper — the
"braided mountains" effect. Six genuinely different layouts per biome is the
root fix; the batch-12 landmark decor stays as garnish on top.

### Format (strict)

- **4 images, one per season**, saved as `assets_src/raw/13/01_spring.png`,
  `02_summer.png`, `03_autumn.png`, `04_winter.png` — exact filenames.
- Size: **1024×1536 (portrait)** — a grid of **6 columns × 9 rows** of square
  tiles (~170 px each), separated by thin dark gutter lines, exactly like the
  existing season sheets but twice the columns.
- Fully opaque: every cell completely filled with terrain texture, top-down
  view (NOT three-quarter — terrain is the ground plane).
- Row order is hard-wired in the engine, top to bottom:
  **1 Ocean · 2 Coast · 3 Grassland · 4 Forest · 5 Mountain · 6 River ·
  7 Swamp · 8 Desert · 9 Tundra**.
- The 6 cells of a row are **variants of the same terrain: same palette, same
  brightness, same feature density — different arrangement**. Variety must
  come from layout (where the rocks/tufts/cracks sit), not from recoloring.
  The engine only equalizes small brightness drift (±15%).
- Keep any signature feature inside the central ~70% of its cell (the edge
  inset is cropped), and keep contrast near cell edges low so random
  neighbors don't form visible seams.

### Prompt body (shared; swap the season line per image)

> Top-down terrain tile sheet for a cozy dark-fantasy strategy game,
> painterly pixel-art hybrid, muted earthy palette, soft ambient light from
> the upper left. A precise grid of 6 columns by 9 rows of square terrain
> tiles separated by thin dark gutter lines; every cell completely filled
> with seamless ground texture seen straight from above. No text, no labels,
> no watermark, no borders beyond the gutters. Each row is one terrain type;
> the six tiles in a row are six DIFFERENT layout variants of the same
> terrain — identical palette and brightness, different arrangement of
> details. Rows top to bottom: (1) deep ocean water with subtle dark waves
> and sparse foam flecks; (2) coastal wet sand with pebbles and sparse
> beach-grass tufts — a uniform sandy texture with NO waterline, NO sea edge;
> (3) grassland meadow with grass tufts and tiny flowers; (4) dense
> broadleaf forest canopy seen from above; (5) rocky mountain crags with
> ridges and scree; (6) a straight river flowing from the top edge to the
> bottom edge of each tile, centered, with narrow grassy banks; (7) murky
> swamp with dark still pools, moss and reeds; (8) dry desert sand with low
> dune ripples and scattered stones; (9) cold tundra with frost-bitten rock,
> lichen and patchy snow.

Season line to append (one per image):

| File | Season line |
| --- | --- |
| `01_spring.png` | Spring palette: fresh light greens with budding flowers, thawed lively water, soft cool light. |
| `02_summer.png` | Summer palette: lush saturated greens, warm golden light, deep blue water. |
| `03_autumn.png` | Autumn palette: amber, russet and faded gold foliage, muted brown grass, cold grey-blue water. |
| `04_winter.png` | Winter palette: snow-dusted ground, pale frozen tones, bare frosted trees, dark icy water. |

Tip for cross-season consistency: generate spring first, then use image-edit
("repaint this exact sheet in autumn palette, keep every layout identical")
for the other three — matching layouts make the in-game season crossfade
read as the same land changing season instead of a map swap. Independent
generations are an acceptable fallback.

**Regenerate a sheet if:** the grid is not exactly 6×9 · tile content bleeds
across gutters · the six variants of a row are near-identical (defeats the
whole point) or differ in palette/brightness instead of layout · the coast
row has any directional waterline (the shoreline transition is procedural at
bake time now) · the river row doesn't flow top-to-bottom (the engine
rotates it for E–W runs) · any text or labels appear.

### Delivery

Drop the 4 files into `assets_src/raw/13/` and run
`node scripts/process-assets.mjs` — the folder-13 handler resizes them to
384×576 over the same `terrain_<season>.png` targets, and the loader
auto-detects column count from the sheet aspect. **No batch 13 present →
the old 3-variant sheets keep working unchanged** (fallback philosophy).

## Priority order if generating in sessions

1. `02_huts` + `03_houses` + `01_tents` — the cluster engine's bread and butter
2. `07_temple` + `08_walls_stone` + `09_palisade` — town landmarks ("scale fantasy")
3. `04_storage` + `05_civic` + `06_market` + `10_props` + `11_ruins`
4. Batch 10 decor (engine ships with procedural stand-ins regardless)
