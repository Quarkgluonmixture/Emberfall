# Emberfall Wall + Citizen Art Direction Pass

Basis: the two attached close-zoom town screenshots, plus brief context from
`CLAUDE.md`, `ASSET_PROMPTS.md`, `src/render/settlementCluster.ts`, and
`src/render/citizenLayer.ts`. No files were modified beyond this assessment.

## 1. Horizontal Town Walls Read As Short Slanted Segments [render-fix] [needs-art]

### What I see

The owner's concern is valid. In both screenshots, the top and bottom stone
wall runs do not read as one continuous rampart. They read as repeated short
diagonal panels: each piece has its own perspective slant, shadow, and visible
end, so the eye counts separate modules instead of seeing a single wall line.
This is strongest along the northern wall of the central town, where the
segments create a sawtooth rhythm between the corner towers.

The current layout repeats `wall_straight` across the top and bottom with
overlap (`w * 0.82`). That is a reasonable code strategy only if the source
tile has flush ends and a continuous top course. The current asset appears to
have angled/capped visual ends, so overlap cannot fully hide the joins.

### Concrete fix

Priority recommendation: replace the horizontal wall art with a clean tiling
piece, then adjust layout overlap.

Render/layout:

- Keep repeated placement, but tune overlap from art, not a fixed `0.82`.
- Use a wall-specific overlap/snap value that makes merlons and walkway boards
  line up exactly.
- Consider rendering one continuous horizontal strip per side for stone walls,
  with independent width scaling, if the new asset is generated as a long strip.
  This would match the successful intent already documented for vertical walls.

Art:

- Generate new stone and palisade horizontal runs with flush vertical cut ends,
  no diagonal cap, and a continuous battlement/walkway that tiles.
- The segment should look straight across the screen in 3/4 view, not like a
  free-standing fence panel leaning down-right.

### GPT-Image prompt spec

Add as a new batch, e.g. `Batch 14 - wall run replacements -> assets_src/raw/14/`.

Use the shared preamble from `ASSET_PROMPTS.md`:

> Cozy dark-fantasy video game sprite set, painterly pixel-art hybrid, top-down
> three-quarter view (camera tilted about 45 degrees), muted earthy palette with
> warm ember accents, soft ambient light from the upper left. Mid-tones brighter
> than typical dark fantasy: rooftops clearly lighter than walls so structures
> stay readable against dark terrain. Crisp, readable silhouettes at small
> sizes. Each object isolated on a plain solid white background, with only a
> small soft contact shadow directly beneath it. No checkerboard, no text, no
> watermark, no border, no smoke, no fire glow, no light halos. Objects must not
> touch each other or the image edges.

| File | Size | Pieces | Prompt body after the preamble |
| --- | --- | --- | --- |
| `01_walls_horizontal_clean.png` | 1536x1024 | 2 | Two long horizontal defensive wall runs in a horizontal row, same scale. (1) STONE rampart: a straight medieval town wall segment running left-to-right, with a continuous crenellated top edge and wooden inner walkway, flush vertical cut ends that can tile seamlessly into the next copy, no diagonal end caps, no tower, no gate. (2) WOODEN LOG PALISADE: a straight left-to-right palisade segment, tight sharpened logs and simple inner brace, flush cut ends that tile seamlessly, no corner post, no gate. The top edge must remain visually level across the whole piece; three-quarter depth comes from a thin visible wall face and soft shading only. Stone on the left. |
| `02_wall_joint_masks.png` | 1536x1024 | 3 | Three small wall joint cover pieces in a horizontal row, same scale: a square stone corner tower with visible sockets where horizontal and vertical walls tuck behind it; a smaller square palisade corner watchpost with sockets for log walls; a short stone buttress/joiner cap that can hide a seam between two straight wall segments. No large ground patch. |

Processed target intent: horizontal wall runs should land around 90-140 px wide
before on-map scaling, with enough length to reduce visible repetition. Joint
masks should remain tower-sized, around the current `wall_tower` footprint.

Regenerate if any straight wall has diagonal/capped ends, if merlons do not
continue to the edges, or if a copy placed next to itself forms a visible notch.

## 2. Vertical Walls Do Not Connect To Horizontal Walls / Corner Towers [render-fix] [needs-art]

### What I see

The concern is valid. The side walls look like separate stone columns placed
near the town rather than walls joined into the same defensive ring. In the
central town, the northern horizontal wall runs behind/near the towers, while
the vertical wall stacks sit as their own vertical objects. The corner towers
do not convincingly cover the junctions.

This is partly layout. `wallRect` places horizontal runs, then vertical side
segments, then corner towers, and sorts only by `dy`. The vertical art is
currently stacked as repeated cells with `w` only. In `settlementLayer`, pieces
without `h` or `rot` use anchor `(0.5, 0.82)`, so a vertical wall strip is
bottom-anchored like a house instead of center-anchored like a structural run.
That makes exact endpoint alignment with corners harder.

It is also partly art. The corner tower asset needs to be a joint mask with
clear wall sockets/overlap areas. Right now it reads more like an isolated
tower block than a connector.

### Concrete fix

Render/layout:

- Add wall-run metadata or placement flags so `wall_vertical` uses a center
  anchor, or provide explicit `h` for side runs so the existing center-anchor
  path applies.
- Align vertical side endpoints to tuck under the corner tower silhouette, not
  simply to share the same center coordinate.
- Ensure corner towers are always drawn after adjacent wall runs at the same
  corner. Sorting by `dy` alone can still leave ambiguous ties; wall joints need
  an explicit layer/order.
- Treat tower overlap as part of the ring: horizontal and vertical walls should
  intentionally extend under the tower by a few pixels/world units.

Art:

- Use the `02_wall_joint_masks.png` prompt from issue 1 for better connector
  towers.
- If the vertical wall remains stacked, generate a true short modular vertical
  tile, not a long strip repurposed as a cell.

### GPT-Image prompt spec

Use the shared preamble from `ASSET_PROMPTS.md`, then:

| File | Size | Pieces | Prompt body after the preamble |
| --- | --- | --- | --- |
| `03_walls_vertical_modular.png` | 1536x1024 | 2 | Two SHORT modular vertical wall tiles in a horizontal row, same scale. Each tile runs straight down the image with its top end directly above its bottom end, designed to stack edge-to-edge into a continuous north-south wall. (1) STONE rampart tile with continuous crenellation along the visible top edge, flush top and bottom cut ends, no cap, no tower. (2) WOODEN LOG PALISADE tile with tight sharpened logs, flush top and bottom cut ends, no watchpost. Three-quarter depth comes only from a thin side face and shading; the footprint must stay perfectly vertical with no stair-step or diagonal lean. Stone on the left. |

Regenerate if the vertical tile has a decorative cap at either end, leans left
or right, or changes width from top to bottom.

## 3. Vertical Wall Segments Look Inconsistent In Size [render-fix] [needs-art]

### What I see

The concern is valid. The side-wall pieces read as alternating tall blocks,
short blocks, and towers rather than a uniform run. Some of that comes from
the art's perspective and trimming, but the stronger issue is that the current
code scales vertical wall sprites by width only and stacks them as individual
objects. If the source image was intended as one continuous vertical strip, the
stacked-cell approach exaggerates every cap, shadow, and trim difference.

This also explains why the vertical walls in the screenshots feel less like
walls and more like a sequence of freestanding stone pillars.

### Concrete fix

Preferred render fix:

- Render `wall_vertical` and `palisade_vertical` as one continuous side strip
  per side with explicit `h`, matching the older comment in `PiecePlacement`.
- Scale X to match the wall thickness and scale Y to span from corner overlap
  to corner overlap.
- Keep towers/posts as separate seam covers on top.

Alternative render fix if stretching looks bad:

- Keep stacking, but use a newly generated short modular tile
  (`03_walls_vertical_modular.png`) and normalize every vertical segment to a
  fixed target height and center anchor.

Art need:

- If the current `wall_vertical` asset is a long strip, use it as a long strip.
- If the team prefers stacked modules, generate the modular vertical tile from
  issue 2. The current visual does not support both roles cleanly.

### GPT-Image prompt spec

Use `03_walls_vertical_modular.png` from issue 2 for the stacked-cell route.
For the one-strip route, regenerate/refine the existing batch-11 prompt:

Use the shared preamble from `ASSET_PROMPTS.md`, then:

| File | Size | Pieces | Prompt body after the preamble |
| --- | --- | --- | --- |
| `04_walls_vertical_long_strips.png` | 1536x1024 | 2 | Two LONG continuous vertical wall strips in a horizontal row, same scale. Each strip runs straight down the image from near the top to near the bottom, with perfectly flush cut ends so the game can stretch or crop it under corner towers. (1) STONE rampart: continuous crenellated top edge for the full length, consistent wall thickness, no repeating block caps, no tower, no gate. (2) WOODEN LOG PALISADE: continuous tight sharpened logs for the full length, consistent width, no watchpost or cap. The footprint must be perfectly vertical; no diagonal skew, no stair-step, no perspective lean. Stone on the left. |

Regenerate if the strip has visible end caps, a changing width, or a stair-step
silhouette.

## 4. Citizens Vary In Size And All Look Identical [render-fix] [needs-art]

### What I see

The owner's concern is strongly valid. The citizens dominate the close-up view,
and almost all of them read as the same tan hooded person repeated dozens of
times. The animation states may differ, but at this density the silhouette is
effectively identical: same hood, same cloak color, same stance language.

There is also a perceived size problem. Some citizens look huge beside houses
and wall sections, while others appear smaller depending on pose, overlap, and
frame. `citizenLayer.ts` scales each displayed frame to
`BALANCE.render.citizenHeight / frame.height`, so the render code is trying to
normalize height. However, if different animation sheets or poses have
different visual padding and silhouette height, normalization by texture frame
height can still make bodies feel inconsistent.

### Concrete fix

Art first:

- Replace the single citizen design with a small cast of silhouettes: villager,
  worker, trader, guard/militia, elder/child-sized small figure, and builder.
- Do not make every citizen hooded. Use hair, hats, shawls, aprons, packs,
  helmets, tools, and cloak variations.
- Keep faction tinting possible, but avoid making the whole body a flat
  civ-colored cloak. Tint should affect a scarf, sash, hood trim, small cloak,
  or tabard accent.

Render/layout:

- Support multiple citizen sprite sets or a variant index per agent, chosen
  deterministically from agent id/civ id/state. Do not draw all agents from
  one sheet.
- Normalize by a declared baseline body height or per-sheet metadata rather
  than raw frame height, so a raised-arm worker does not shrink and a compact
  resting pose does not swell.
- Slightly reduce default citizen visual height if needed after new art. In the
  screenshots the crowd is charming, but the individual bodies are near the
  upper edge of comfortable scale beside houses.

### GPT-Image prompt spec

Add as a new batch, e.g. `Batch 15 - citizen variety -> assets_src/raw/15/`.

Use the shared preamble from `ASSET_PROMPTS.md`, with this citizen-specific
override appended:

> For this batch, each figure is an animated character sprite on a plain solid
> white background. Keep a consistent foot position and body scale across all
> frames. Small soft contact shadows are okay. No large ground patch. No text,
> no watermark. Figures must not touch each other or the image edges.

| File | Size | Pieces / layout | Prompt body after the preamble |
| --- | --- | --- | --- |
| `01_citizen_walk_variety.png` | 1536x1024 | 24 frames: 6 rows x 4 columns | Six different medieval townspeople, one per row, each with a 4-frame walking cycle across the row. Same scale and foot baseline in every frame. Roles: plain villager with uncovered hair and simple tunic; farmer with straw hat and small shoulder sack; trader with pack and short cloak; builder with rolled sleeves and tool belt; guard/militia with small kettle helm and padded vest; elder in shawl with walking stick. Cozy dark-fantasy but friendly, expressive, and readable at tiny size. Only small faction-color accent areas such as scarf, sash, hood trim, or tabard; do not make the whole body one colored robe. Avoid identical hooded silhouettes. |
| `02_citizen_work_variety.png` | 1536x1024 | 24 frames: 6 rows x 4 columns | The same six townspeople and same row order as the walk sheet, each with a 4-frame working cycle across the row. Actions should vary by role but fit a shared work animation: farmer hoeing or gathering, builder hammering, trader sorting a pack, guard lifting supplies, villager carrying a basket, elder tending a small bundle. Same scale and foot baseline in every frame. Distinct silhouettes, no identical hooded clones. |
| `03_citizen_fight_variety.png` | 1536x1024 | 24 frames: 6 rows x 4 columns | The same six townspeople and same row order, each with a 4-frame tense/fighting or defending cycle. Improvised medieval town defense: short spear, small shield, staff, tool-as-weapon, guarded stance. Keep it readable and not gory. Same scale and foot baseline in every frame. Distinct silhouettes, no identical hooded clones. |
| `04_citizen_rest_variety.png` | 1536x1024 | 12 frames: 6 rows x 2 columns | The same six townspeople and same row order, each with a 2-frame resting/idle cycle: sitting, leaning, talking gesture, warming hands, checking pack, relaxed guard stance. Same scale and foot baseline in every frame. Distinct silhouettes, no identical hooded clones. |

Processed target intent: each row is one variant, each column is an animation
frame. The renderer should slice rows and columns, then choose a stable variant
per agent.

Regenerate if the rows drift in scale, if the feet do not share a baseline, if
most figures are hooded cloaks, or if the civ-tintable area covers the entire
body.

## 5. Hooded Figure Design Is Not Attractive [needs-art]

### What I see

The concern is valid. The hooded citizen has useful readability, but it is too
generic and too dominant. At close zoom it becomes the visual identity of the
whole town, and that identity is currently "many identical tan hooded figures."
The shape is also top-heavy: large hood, small body, little personality. It
leans more like a placeholder cultist/monk than a cozy civilization aquarium
citizen.

### Concrete fix

Replace the default design with a warmer villager-first cast:

- Faces can remain tiny and simple, but hoods should be optional, not universal.
- Favor medieval workwear: tunics, aprons, shawls, hats, small packs, belts,
  sleeves, helmets for militia only.
- Keep the dark-fantasy mood through muted fabric and ember accents, not by
  making every civilian mysterious.
- Make the default walk/rest silhouette appealing even before animation:
  readable head, shoulders, hands/tool, and a stable foot contact.

### GPT-Image prompt spec

Use the `Batch 15 - citizen variety` prompt from issue 4. If only one immediate
replacement is affordable before a full variant renderer, generate this smaller
drop-in:

Use the shared preamble from `ASSET_PROMPTS.md`, with the citizen-specific
override from issue 4, then:

| File | Size | Pieces / layout | Prompt body after the preamble |
| --- | --- | --- | --- |
| `05_citizen_base_replacement.png` | 1536x1024 | 14 frames: 4 walk, 4 work, 4 fight, 2 rest in one horizontal strip | A single improved default medieval townsperson animation set, same scale and foot baseline across all frames. Friendly cozy dark-fantasy villager, not a faceless hooded cultist: visible simple face or hair shadow, practical tunic, small shoulder cape or scarf, belt pouch, boots, warm ember accent trim, muted cloth. Frames 1-4 walking, frames 5-8 working with a small tool, frames 9-12 defending with a short staff or tool, frames 13-14 resting/idle. Clear readable silhouette at tiny size, attractive and humane, not cute-modern, not chibi, not all robe. |

This is a fallback only. The full six-variant sheet is the better product fix.

## 6. It Probably Needs More Assets [needs-art] [render-fix]

### What I see

Yes. The screenshots show a strong foundation: the buildings, walls, roads,
citizen density, rain, and terrain already sell the "living aquarium" idea.
The remaining weakness is not lack of detail in general; it is lack of modular
asset coverage in the exact places the camera now invites inspection.

The biggest asset gaps are:

- clean horizontal wall runs that tile as one wall,
- reliable vertical wall pieces matched to the chosen render strategy,
- joint/corner masks that hide wall intersections,
- citizen silhouette variety,
- better base citizen design,
- a few town-life props that break repeated building/citizen rhythms.

Render work is also needed so the new assets can be used correctly:

- wall-specific anchoring/layering,
- one-strip or true-modular vertical wall placement,
- deterministic citizen variant selection,
- row/column animation slicing for multi-variant citizen sheets.

### Concrete asset recommendations

Generate in this order:

1. Wall run replacements: `01_walls_horizontal_clean.png`,
   `03_walls_vertical_modular.png` or `04_walls_vertical_long_strips.png`, and
   `02_wall_joint_masks.png`.
2. Citizen variety sheets: walk/work/fight/rest with six rows of roles.
3. Small town-life props that occupy streets and plazas without becoming
   buildings.

### GPT-Image prompt spec

Use the shared preamble from `ASSET_PROMPTS.md`, then:

| File | Size | Pieces | Prompt body after the preamble |
| --- | --- | --- | --- |
| `06_town_life_props.png` | 1536x1024 | 6 | Six tiny town-life prop clusters in a horizontal row, same scale: stacked firewood beside a wall; laundry line between two short posts with muted cloth; handcart with sacks; small notice board with blank parchment shapes and no readable text; water trough with bucket; tiny vegetable crates with a folded cloth. These are small street/plaza props, lower and simpler than buildings, with minimal contact shadow and no ground patch. |
| `07_wall_detail_overlays.png` | 1536x1024 | 4 | Four small fortification detail overlays in a horizontal row, same scale: a banner bracket hanging from a stone wall; a wooden ladder leaning against a wall; a small repair scaffold section; a pile of stones and mortar beside a wall. No text, no faction symbols, no large ground patch. Designed to place near walls to reduce repetition. |

These are secondary to the core wall/citizen fixes. They should not be used to
hide broken wall joins; joins need the structural fixes above.

## Priority Order: Impact To Effort

1. **Render fix: vertical wall anchoring and connection order.** High impact,
   low-to-medium effort. Center-anchor or explicit-height side walls, extend
   runs under towers, and force corner towers/joint masks above runs.
2. **Art fix: clean horizontal wall run + joint mask assets.** Highest wall
   readability impact. The current horizontal asset shape is the main reason
   the top/bottom walls read as slanted fragments.
3. **Render fix: choose one vertical wall strategy.** Either one continuous
   side strip with explicit `h`, or true modular vertical tiles. The current
   middle ground produces inconsistent visual size.
4. **Art fix: citizen base replacement.** Immediate close-zoom improvement even
   before a full variant system; removes the unattractive hooded-clone read.
5. **Render + art fix: six citizen variants by role.** Very high product impact
   but more implementation work because the renderer needs stable variant
   selection and row/column slicing.
6. **Art garnish: town-life props and wall detail overlays.** Nice atmosphere
   after the structural wall and citizen problems are solved; low urgency.
