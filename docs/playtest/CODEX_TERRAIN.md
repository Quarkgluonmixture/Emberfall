# Emberfall Terrain Cross-Review

Date: 2026-06-15  
Scope: screenshots `docs/playtest/shots/terr-macro.jpg` and `terr-close.jpg`, plus a code pass over worldgen, founding, resources, roads, terrain/road rendering and terrain config.

## Short Verdict

The owner's complaint is correct. Emberfall's terrain currently reads as a painted board under the actual toy village, not as a world that the villages physically and politically inhabit.

The internal map is mostly accurate, but it misses a few important nuances:

- Settlement cluster rendering now has a terrain veto for houses/walls, so the close-up renderer is not completely blind to rivers/ocean.
- Citizens choose work targets by terrain type, but their movement is straight-line and not terrain-constrained.
- Decor has terrain awareness: reeds favor river-adjacent tiles, mountain formations scatter on mountain tiles, and decor avoids roads/settlements.
- Forests can mutate through wildfire/regrowth. Rivers and mountains do not currently mutate.
- Roads pathfind over terrain cost, but the visual result is still just a dirt stroke. There is no bridge/ford object, tunnel/pass object, embankment, cut, or road conforming.

Those nuances help, but they are not enough. The dominant player read is still: terrain is a low-res background layer, while towns/citizens/walls are the real authored scene.

## Code-Map Validation

### Confirmed

Terrain affects gather yields. `src/sim/resources.ts` sums `TERRAIN_DEFS` food/wood/stone inside a settlement gather radius, with tier-based radius in `BALANCE.resources.gatherRadiusByTier`.

Roads use A* costs by terrain. `src/sim/roads.ts` makes ocean impassable, mountains very expensive (`30`), rivers expensive (`6`), swamp/forest moderately expensive, and grassland cheap. This changes route shape, but only at road recompute time.

Founding rejects the center tile if it is not buildable. `scoreSite()` in `src/sim/founding.ts` rejects non-buildable terrain through `isBuildable(terrainAt(...))`, then gives a strong `+4` for a river within 2 tiles and `+1.5` for ocean within 2 tiles.

After founding, the settlement model stores only `x`, `y`, population, resources, morale, tier, etc. There is no persistent "this settlement is riverine/mountain/coastal" tag, no slope, no elevation band, no terrain claim footprint, and no ongoing siting modifier.

Rivers are single-tile paths carved downhill to ocean. `carveRivers()` picks high sources and marks one current tile per step as `Terrain.River`. There is no river width, floodplain, tributary hierarchy beyond joining an existing river, meander width, bank class, or navigability.

Mountains are a terrain threshold: `elevation > BALANCE.map.mountainLevel` (`0.72`). There is no massif/ridge system, slope band, pass generation, cliff edge, valley logic, or mountain footprint beyond per-tile classification.

Terrain is rendered as a baked seasonal texture under independent draw layers. The composition order in `src/render/renderer.ts` is terrain, roads, decor, territory, settlements, citizens, markers, FX, macro. There is no shared geometry pass that lets roads cut bridges into rivers, settlements terrace into slopes, or terrain occlude actors.

Flood exists and is river-proximity based. `maybeFlood()` only checks spring, river within `BALANCE.events.floodRiverRange` (`2`), chance `0.004`, then reduces food/wood/morale.

No terrain effect was found on baseline growth, morale, military strength, defense, capture chance, diplomacy, border friction, siege/capture targeting, or aggregate movement. War targeting is nearest-settlement distance, not route/path/terrain constrained.

### Corrections / Extensions

Settlement cluster placement is partially terrain-aware. `src/render/settlementLayer.ts` passes a `buildable(dx, dy)` function to the cluster layout. Houses/plaza pieces avoid ocean and river tiles. Wall rings may cross rivers but avoid ocean. This is a visual-only veto, not a sim footprint, and it only works at the piece-layout level after a center tile has already been chosen.

The visual veto is incomplete for the complaint. A settlement can still be founded beside a one-tile river, then its visual footprint can wrap over/around that river. The walls are explicitly allowed to span rivers to keep the ring closed, which is why a town can appear to fence or swallow a river rather than bridge it.

Citizens are cosmetically terrain-aware but not physically terrain-aware. In `src/sim/agents.ts`, work tasks choose farm/gather targets from terrain types: grassland/coast/desert for farming, forest/swamp/tundra for gathering. Mountains/rivers/ocean are not work targets. But movement to any target is a straight interpolation in world pixels. Fleeing, fighting, trading without a road, returning home, and some work paths can cross water/mountains visually.

Terrain decor is a useful but cosmetic interaction layer. `src/render/decorLayer.ts` scatters rocks, trees, reeds, canopies, and mountain formations by biome, blocks them near settlements and roads, and boosts reed chance next to rivers. This improves flavor but does not change sim consequence.

Forests are the only meaningfully mutable terrain. Wildfire changes forest to grassland; spring regrowth changes some grassland back to forest. Rivers and mountains are static after worldgen. There is no erosion, flooding tile-state, snow passability, bridge construction, road upgrading, quarry depletion, or farmland conversion.

Terrain art is not as low-source-resolution as it may feel. Current terrain sheets are `384x576`, i.e. 6 columns x 9 rows of 64px source cells. The renderer crops an inset and bakes at `terrainBakeScale: 4`, so technically it has enough pixels for an 8px world tile. The problem is more "small tile repeated and flattened" than "tiny file." The high-res town pieces are composed objects with shadows, lamps, and silhouettes; the terrain is still repeated square cells.

## Root Diagnosis

The complaint has three separate roots. Treating them as one bug will lead to expensive churn with disappointing results.

### A. Terrain Art Quality / Resolution / Style Match

In screenshots, the new settlement pieces have authored 3/4 silhouettes, contact shadows, lamps, wall thickness, roof color separation, and little human figures. The terrain underneath is a tiled overhead fabric. Even with 64px cells and bake-time tinting, the visual language is weaker:

- mountains appear as mottled rocky patches rather than landforms with mass, height, shadow, scree, passable valleys, and cliff edges;
- rivers appear as thin blue strokes in the tile grid rather than bodies of water with banks, wet ground, reeds, ford shallows, and crossing infrastructure;
- biome transitions are softened, but not composed into recognisable places;
- the terrain is deliberately softened (`terrainSoftenAlpha`) so actors pop, which helps readability but pushes terrain farther toward "background."

The issue is not only resolution. It is authored scale and semantic richness. A 64px mountain tile can still look like wallpaper if every tile is an equal local texture rather than part of a ridge/massif.

### B. Terrain Scale / Prominence

The world uses 8px tiles on a 160x100 grid. Rivers are single-tile paths. Mountains are single classified tiles. A town cluster spans multiple tiles, and a walled town visually occupies enough screen area to overpower one-tile terrain features.

This makes the simulation's geography too small relative to the authored villages:

- a one-tile river is narrower than a town wall, so a town can visually swallow it;
- single mountain tiles read as rough ground rather than major settlement constraints;
- roads crossing rivers look like ordinary dirt lines over blue texture, not deliberate crossings;
- a settlement "near a river" is often visually indistinguishable from a settlement "on top of a river-adjacent texture seam."

This scale mismatch is especially visible in `terr-close`: the settlement art has village-scale detail, while terrain still operates at boardgame tile scale.

### C. Terrain-to-Entity Interaction

Mechanically, terrain matters at founding, gathering, road route choice, flood events, and some citizen work-target selection. It does not meaningfully change the strategic story after the settlement exists.

Visually, terrain and entities are also mostly independent:

- roads do not instantiate bridge/ford/tunnel/pass pieces when crossing rivers/mountains;
- towns do not reserve and clear a coherent footprint before founding/upgrading;
- rivers do not force quay/waterfront/open-bank layouts;
- mountains do not force hill towns, terracing, cliff shadows, mining camps, or wall adaptation;
- citizen pathing does not respect impassable terrain;
- combat/capture ignores defensible rivers, passes, hills, forests, and chokepoints;
- the inspector reports terrain yields, but the main view does not dramatize "this town lives from the river/mountain/forest."

This is the deepest root. Better art will make the board prettier, but if a village on a plain still plays like a village on a mountain, players will keep calling terrain cosmetic.

## Prioritized Plan

### 1. [render] Add explicit bridge/ford sprites at road-river crossings

Effort: 0.5-1.5 days once art exists; 2-3 days including prompt/process pipeline.

Impact: Very high for the specific "roads/rivers do not interact" complaint. Cheap, visible, and narratively obvious.

Implementation shape:

- During road render bake, detect road segments/tile indexes where `world.terrain[i] === Terrain.River`.
- Draw a bridge/ford sprite above terrain and below citizens/settlements, aligned to the local road direction or river direction.
- Start simple: one straight plank bridge for N/S rivers and one rotated for E/W, plus a shallow stone ford fallback for diagonal/ambiguous crossings.
- Keep the pathing cost the same initially. This is a visual truth pass, not a bridge-building sim yet.

Why first: it directly converts an ugly overlap into a readable interaction. A river crossed by roads is no longer just blue paint under brown paint.

Risk: Low. It touches render only if implemented as a road-layer adjunct.

### 2. [render] Stop walls from spanning rivers without a crossing treatment

Effort: 0.5-1 day for a conservative visual rule; 2-4 days if adding gates/culverts/waterfront variants.

Impact: High at close zoom.

Implementation shape:

- Change the wall ring's loose veto from "walls may cross river" to "walls may cross river only if a bridge/gate/culvert piece is placed."
- Short-term conservative rule: walls treat rivers like buildings do and skip those segments, leaving river-facing openings.
- Better rule: if a river intersects a town footprint, force a bridge-gate or quay opening aligned to the river tile.

Why second: current code explicitly allows the visual that the owner hates. The town wall should either respect the river or deliberately bridge it.

Risk: Medium. Wall continuity was previously protected by allowing river crossing; removing it can create broken town silhouettes unless openings look intentional.

### 3. [sim/render] Add a settlement footprint validation pass, not just center-tile validation

Effort: 1-2 days for center+radius heuristics; 4-7 days if tied to actual cluster footprint and migration/founding balance.

Impact: High. Prevents the most immersion-breaking siting cases before render has to patch them.

Implementation shape:

- Extend `scoreSite()` with a footprint sample around the center. Reject or heavily penalize sites where too much of the expected footprint is river/ocean/mountain/swamp.
- Use tier-agnostic founding footprint at first: e.g. radius 2 must be mostly buildable, with river allowed adjacent but not through the center ring.
- Preserve river desirability by rewarding "near river with a clear bank" instead of "any river within 2."
- Mirror this for migration/rebirth because those use `scoreSite()`.

Why third: the renderer should not be asked to make impossible towns plausible.

Risk: Medium-high for seed stability and population distribution. It changes where civs found and migrate, so curated seeds and early-game balance need review.

### 4. [art] Regenerate terrain around semantic landforms, not just tile variety

Effort: 1-2 art sessions for better sheets/prompts; 1-2 days integration/QA.

Impact: High, but it will not solve interaction by itself.

Implementation shape:

- Keep the existing terrain sheet contract for compatibility, but strengthen the prompts: rivers with visible banks, mountains as crag/ridge/scree, grass/forest/desert/tundra with less mush and clearer macro read.
- Add separate bridge pieces and optional riverbank/ford decor pieces.
- Use the ready-to-paste prompts below.

Why after the first render/sim fixes: new terrain art will be judged against the same old overlaps unless bridges/footprints are addressed.

Risk: Low-medium. Asset iteration risk is real, but code risk is limited if the sheet contract remains.

### 5. [sim] Add terrain tags to settlements at founding

Effort: 1 day for tags and inspector text; 2-4 days if they affect balance.

Impact: Medium-high. This makes terrain identity survive after founding.

Implementation shape:

- At founding, compute tags such as `riverine`, `coastal`, `hill`, `forestEdge`, `mountainFoot`, `swampEdge`.
- Store tags on `Settlement` or derive them consistently from current terrain in a helper.
- Use tags for names/flavor first, then balance: riverine food/flood tradeoff, mountainFoot stone/defense tradeoff, forestEdge wood/wildfire risk.

Why: a settlement should have a geographic identity that the sim can keep referencing.

Risk: Medium if added to saves as persistent data; lower if derived.

### 6. [sim] Make terrain affect defense, capture, and war routes

Effort: 2-5 days for coarse modifiers; 1-2 weeks for true route-aware campaigns.

Impact: High for "terrain matters" in the civilization fantasy.

Implementation shape:

- Cheap version: target settlement gets defense modifiers based on surrounding terrain: river adjacent, hill/mountain adjacent, forest cover, open plains.
- Modify capture/skirmish outcomes, morale damage, and raid frequency.
- Better version: use road/path distance and terrain barriers to choose war targets instead of raw Euclidean nearest settlement.

Why: terrain becomes story. Mountain towns should be hard to capture; river crossings should be contested; forests should hide raids or slow them.

Risk: Medium. It changes long-run balance and needs stress/seed review.

### 7. [sim/render] Make agent movement respect water/mountains at close zoom

Effort: 2-4 days for local pathing; 1 week if unified with roads and crowds.

Impact: Medium. It mainly affects close-up believability.

Implementation shape:

- Add a local walkability pathfinder for visible agents, using `TERRAIN_DEFS.passable` plus bridge/road exceptions.
- Keep it cosmetic and bounded to nearby tiles to avoid sim cost.
- Let roads/caravans use road paths as they do now, but do not let ordinary walkers cut across rivers.

Risk: Medium. Visual agents are cosmetic, so bugs are not game-breaking, but pathing can create jitter/stalls if overbuilt.

### 8. [worldgen] Widen rivers into channels, banks, and floodplains

Effort: 1-2 weeks minimum, plus seed gallery and save compatibility review.

Impact: Very high, but expensive.

Implementation shape:

- Keep a river centerline, then stamp width by flow/order: headwaters 1 tile, lower rivers 2-3 tiles.
- Add bank/floodplain terrain or secondary render mask around river tiles.
- Make river crossings rarer and bridge-worthy.
- Revisit settlement scoring so towns prefer banks but avoid channel footprints.

Why not first: this is the "true" scale fix, but it changes world determinism, curated seeds, road routing, settlement distribution, terrain counts, and screenshots.

Risk: High. Requires broad testing.

### 9. [worldgen/render] Replace single-tile mountains with massifs, ridges, foothills, and passes

Effort: 1-2 weeks for generation/render polish; longer if gameplay uses passes.

Impact: Very high for mountain believability.

Implementation shape:

- Generate mountain regions from elevation plus connected-component/ridge analysis.
- Classify `MountainCore`, `Foothill`, `Pass` either as new terrain types or render masks layered over existing terrain.
- Make roads seek passes, not simply pay `30x` over arbitrary mountain tiles.
- Place mountain formation decor along ridges, not uniform random scatter.

Risk: High. New terrain classes ripple through art sheets, config, pathing, founding, tests, and saves unless implemented as secondary masks.

### 10. [ui/sim] Surface terrain consequences in inspector/chronicle

Effort: 0.5-2 days depending on scope.

Impact: Medium. Helps players notice terrain after systems exist.

Implementation shape:

- Inspector: show "River town: +food, flood risk", "Mountain foot: +stone, defense", "Forest edge: +wood, wildfire risk."
- Chronicle: use geography in events: "raiders failed at the bridge," "the pass at X froze," "floodplain fields drowned."

Risk: Low.

## Suggested Sequence

Do these first:

1. Bridge/ford render pieces and road crossing detection.
2. Wall/settlement river-overlap cleanup.
3. Settlement footprint scoring.
4. Terrain art prompt pass.

Then add systems:

5. Settlement terrain tags.
6. Defense/capture modifiers.
7. Agent local pathing.

Only then take on major generation:

8. Wider rivers/floodplains.
9. Mountain massifs/ridges/passes.

This order is deliberate. The cheap visible fixes will answer the owner's immediate "why is the river under the village?" complaint. The later worldgen reworks should happen after the team agrees that seed/gallery churn is worth it.

## Asset Prompt Specs

These are written in the same style as `ASSET_PROMPTS.md`. They assume the current pipeline can be extended with new batches. The terrain-sheet prompt keeps the opaque-sheet convention; bridges/landform decor use the isolated white-background convention.

### Shared Piece Preamble

Paste at the start of every isolated sprite prompt:

> Cozy dark-fantasy video game sprite set, painterly pixel-art hybrid, top-down three-quarter view (camera tilted about 45 degrees), muted earthy palette with warm ember accents, soft ambient light from the upper left. Mid-tones brighter than typical dark fantasy so silhouettes stay readable against dark terrain. Crisp, readable shapes at small sizes. Each object isolated on a plain solid white background, with only a small soft contact shadow directly beneath it. No checkerboard, no text, no watermark, no border, no smoke, no fire glow, no light halos. Objects must not touch each other or the image edges.

### Batch T1 - Improved Terrain Sheets

This replaces/extends Batch 13. Use the opaque sheet workflow, not the isolated sprite preamble.

Format:

- 4 images, one per season: `assets_src/raw/T1/01_spring.png`, `02_summer.png`, `03_autumn.png`, `04_winter.png`.
- Size: `1024x1536`.
- Grid: 6 columns x 9 rows of square cells with thin dark gutters.
- Row order: Ocean, Coast, Grassland, Forest, Mountain, River, Swamp, Desert, Tundra.
- Fully opaque, top-down terrain plane.
- The six cells in each row must match palette/brightness but vary layout.

Prompt body:

> Top-down terrain tile sheet for a cozy dark-fantasy idle civilization game, painterly pixel-art hybrid, muted earthy palette, soft ambient light from the upper left. A precise grid of 6 columns by 9 rows of square terrain tiles separated by thin dark gutter lines; every cell completely filled with seamless ground texture seen straight from above. No text, no labels, no watermark, no borders beyond gutters. Each row is one terrain type; the six tiles in a row are six different layout variants of the same terrain, identical palette and brightness, different arrangement of details. Rows top to bottom: (1) deep ocean water with dark blue wave texture and subtle foam flecks; (2) wet coastal sand and shingle with pebbles, driftwood fragments, and sparse beach grass, no directional waterline; (3) grassland meadow with readable grass clumps, small flowers, wheel-rut hints, and patches of bare earth; (4) dense broadleaf forest canopy from above, individual crowns readable but forming a continuous forest mass; (5) mountain terrain as rocky crags, ridge spines, scree fans, shadowed cracks, and tiny snow/lichen highlights, more like impassable high ground than flat gravel; (6) a wider straight river flowing from top edge to bottom edge, centered, dark blue-green water with visible grassy/muddy banks on both sides, reeds and wet earth, river occupying about 55 percent of tile width; (7) swamp with dark pools, moss mats, reeds, and soft muddy hummocks; (8) desert with dune ripples, cracked dry flats, and scattered stones; (9) tundra with frost-bitten rock, lichen, pale grass, and patchy snow.

Season lines:

- Spring: `Spring palette: fresh greens, thawed wet banks, new flowers, cool bright water, soft cool light.`
- Summer: `Summer palette: lush greens, warm golden light, deep water, dry road dust in grassland details.`
- Autumn: `Autumn palette: amber, russet, faded gold foliage, muted brown grass, cold grey-blue water, wet dark banks.`
- Winter: `Winter palette: snow-dusted ground, pale frozen tones, bare frosted trees, dark icy water, mountain snow highlights.`

Regenerate if: grid is not exact, rows are mislabeled, river row becomes a skinny line, mountain row looks like flat gravel, coast contains a directional ocean edge, variants differ by color instead of layout, or any text appears.

### Batch T2 - Bridge / Ford Pieces

Use the shared piece preamble.

`01_bridges.png` - `1536x1024` - 4 pieces left to right:

> Four road-river crossing pieces in a horizontal row, same scale, designed to sit on top of a narrow river tile in a strategy map. (1) A rustic wooden plank bridge running left-to-right, with short rail posts and packed dirt ramps at both ends. (2) The same style bridge running straight down the image, top end directly above bottom end, no diagonal lean. (3) A shallow stone ford running left-to-right, flat stepping stones and pale wet gravel, water visible between stones. (4) A shallow stone ford running straight down the image. Keep each piece compact, readable at tiny size, no baked river beyond a small wet edge directly under the crossing, no large ground patch.

Processed target suggestion: 64-96px source width each; on-map footprint about 1.5-2.5 tiles long depending on orientation. Render above terrain/river and below citizens/settlements.

Regenerate if: bridge includes a whole river scene, perspective is isometric/diagonal, pieces touch, ramps are too huge, or the bridge reads as a house/roof.

### Batch T3 - Riverbank / Waterfront Decor

Use the shared piece preamble.

`01_riverbanks.png` - `1536x1024` - 4 pieces left to right:

> Four small riverbank dressing pieces in a horizontal row, same scale: a reed-heavy muddy bank clump; a pebbled ford approach with wagon ruts; a tiny wooden fishing jetty with two posts and planks; a short stone quay edge with moss and wet steps. These are terrain-edge accents, not buildings. Muted earthy colors, wet dark mud, no large opaque ground disc, no water body beyond a narrow contact edge.

Use for: river-adjacent towns, road-river crossings, and close-up waterfront openings.

Regenerate if: the jetty becomes a full dock building, pieces have huge painted terrain bases, or the bank detail disappears when shrunk.

### Batch T4 - Mountain Massif Decor

Use the shared piece preamble.

`01_massifs.png` - `1536x1024` - 3 pieces left to right:

> Three large mountain massif overlay pieces in a horizontal row, same scale, larger than ordinary rocks: (1) a connected twin-peak ridge with dark cliff faces, scree slopes, and snow dusting on upper edges; (2) a long horizontal ridge spine with exposed strata, broken crags, and a narrow shadowed pass notch; (3) a steep single crag with talus fan and mossy foothill rocks. They must read as landforms, not boulders. Grey-brown stone with cool shadows, warm lichen highlights, coherent upper-left lighting.

Processed target suggestion: 96-140px source width; on-map footprint 2-4 tiles. Scatter by connected mountain components/ridges, not uniform random.

Regenerate if: pieces look like small rocks, are too dark to separate from terrain, have white snow halos that key out, or include trees/buildings.

### Batch T5 - Foothill / Pass Tiles

This can be either isolated decor or a future terrain-sheet row if new terrain classes are added. Start as isolated decor to avoid terrain enum churn.

Use the shared piece preamble.

`01_passes.png` - `1536x1024` - 4 pieces left to right:

> Four mountain-transition pieces in a horizontal row, same scale: (1) a narrow dirt mountain pass running left-to-right between rocky shoulders; (2) the same pass running straight down the image; (3) terraced foothill ledges with small retaining stones and grass patches; (4) a quarry-like rocky clearing with pale chipped stone and cart-rut hints. No buildings, no people, no large flat base; these are overlays for mountain/foothill terrain.

Use for: road paths through mountains, mountain-foot settlements, quarry/mining visual identity.

Regenerate if: pass is diagonal, looks like a paved city road, includes houses, or lacks rocky shoulders.

### Batch T6 - Wider River Shape Sheet

This is a future river-specific opaque sheet if/when worldgen supports river widths.

Format:

- 4 seasonal images: `assets_src/raw/T6/01_spring.png`, `02_summer.png`, `03_autumn.png`, `04_winter.png`.
- Size: `1024x1024`.
- Grid: 4 columns x 4 rows.
- Rows: straight channel, bend, T-junction/confluence, mouth/delta.
- Columns: four variants.
- Fully opaque terrain-water pieces; renderer can crop/rotate.

Prompt body:

> Top-down river shape tile sheet for a cozy dark-fantasy strategy game, painterly pixel-art hybrid. A precise 4 by 4 grid of square river tiles separated by thin dark gutters. Every cell has a wider navigable river channel with visible muddy or grassy banks, wet earth, reeds, and foam flecks. Rows top to bottom: straight river flowing top-to-bottom; ninety-degree bend connecting top to right; T-shaped confluence with smaller tributary joining a main channel; river mouth/delta meeting darker ocean water. Four variants per row, same palette and brightness but different bank detail. River water occupies about half the tile width on main channels. No text, no labels, no bridges, no buildings, no boats.

Season lines mirror T1.

Use only after widening rivers in worldgen; do not spend integration time here before the sim can represent channel width.

## Design Principles Going Forward

The target should be: "terrain is a character in the aquarium." A player should be able to glance at a settlement and infer why it exists there, what risks it faces, and how armies/traders/citizens must move around it.

Rules of thumb:

- If a road crosses a river, show a crossing.
- If a town touches a river, show a bank/quay/opening, not houses sitting in water.
- If a town is near mountains, make it look and play like a mountain-foot town.
- If terrain changes the sim, give it a visible affordance.
- If terrain is visible as a major landform, give it at least one systemic consequence.
- Do not widen rivers or rewrite mountains until the team accepts seed-gallery churn.

