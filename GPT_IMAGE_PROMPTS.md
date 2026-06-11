# Emberfall — Image Generation Prompts

Prompts for building a consistent art library (e.g. with GPT-Image or another
image model). Generate at the dimensions in `ASSET_MANIFEST.md`, then
downscale; request transparent backgrounds for sprites.

## Global style anchor

Prepend this to **every** prompt for consistency:

> Cozy dark-fantasy video game art, top-down orthographic view, painterly
> pixel-art hybrid, muted desaturated palette of deep greens, slate blues and
> umber browns with warm amber ember-light accents, soft volumetric dusk
> lighting, gentle film grain, readable silhouettes at small scale, no text,
> no watermark.

## Terrain tiles (seamless, 32×32)

For each, request: "seamless tileable square texture tile, flat top-down". Add
the season modifier (below) and generate 3 variations per season.

- **Ocean**: deep midnight-blue sea water, subtle wave caps, faint moonlit shimmer.
- **Coast**: wet sand and shingle shoreline, scattered pale pebbles, foam edge.
- **Grassland**: rolling meadow grass, tiny wildflowers, soft tussocks.
- **Forest**: dense treetop canopy of dark pines and oaks seen from above, tiny clearings.
- **Mountain**: craggy grey stone peaks from above, sharp ridgelines, scree.
- **River**: clear flowing freshwater channel over dark stones, gentle ripple highlights.
- **Swamp**: black-green marsh water between mossy hummocks, lily pads, mist.
- **Desert**: rippled dune sand, sparse dry scrub, sun-bleached bones.
- **Tundra**: frost-hardened mossy ground, lichen patches, thin snow crust.

Season modifiers:

- *Spring*: "fresh vivid growth, light haze, small blossoms"
- *Summer*: "warm saturated light, dry highlights"
- *Autumn*: "amber and rust foliage, fallen leaves, long shadows"
- *Winter*: "snow-dusted, pale blue cold light, bare branches"

## Settlements (transparent background)

- **Camp** (48×40): a single weathered canvas tent with patched hide walls
  beside a small glowing campfire with drifting sparks, top-down three-quarter
  view, tiny supply crates.
- **Village** (64×48): three rustic timber huts with mossy thatched roofs
  around a dirt yard, warm candlelight in tiny windows, woodpile and fence,
  top-down three-quarter view.
- **Town** (80×64): a small walled medieval town from above — rough stone
  curtain wall, central keep with a steep slate roof, clustered timber houses,
  market square with stalls, lanterns glowing warm in the dusk.
- **Ruins** (64×48): the same small town collapsed and abandoned — broken
  walls, charred beams, moss reclaiming the stones, a single crow.
- **Banner** (16×28): a simple heraldic cloth banner on a wooden pole, plain
  white cloth (it will be tinted in-engine), slight tatter and wind curl.

## Citizens (sprite sheets, transparent, 12×24 per frame)

- **Walk cycle, 4 frames**: a tiny hooded medieval villager in a plain white
  tunic (tint target), seen from above and slightly behind, simple 4-frame
  walking animation, side view.
- **Work cycle, 4 frames**: the same tiny villager swinging a tool downward
  (axe/hoe), 4-frame loop.
- **Fight cycle, 4 frames**: the same tiny villager thrusting a spear, 4-frame
  loop.
- **Rest, 2 frames**: the same tiny villager seated by a fire, gentle breathing
  shift between frames.

## Effects (transparent)

- **Warm glow** (64×64): soft radial amber light bloom, no source object,
  feathered edge to full transparency.
- **Smoke puffs** (16×16, 4 frames): small curling grey-blue chimney smoke
  puff dissipating.
- **Wildfire** (24×24, 4 frames): low licking orange flames with ember sparks,
  loopable.
- **Raindrop / snowflake**: single elongated translucent rain streak; single
  soft six-point snowflake, slightly blurred.

## UI

- **Panel frame** (96×96, 9-slice): dark oiled-wood and wrought-iron panel
  border with subtle ember-orange corner filigree, center fully transparent.
- **Icon set** (24×24 each): minimal line-icons with amber glow on dark —
  pause, play, double-chevron speed, quill (save), open tome (load), hourglass
  (history), gear (debug).
- **Event icons** (20×20 each): crossed swords (war), rat (plague), empty bowl
  (famine), laurel (golden age), wave (flood), flame (wildfire), cracked crown
  (succession), split sun (schism), cart (migration), fallen tower (collapse).
