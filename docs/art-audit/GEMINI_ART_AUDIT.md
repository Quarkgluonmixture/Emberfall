# Gemini Art Audit — Emberfall

_Model: gemini-3.1-pro-preview · 2026-06-12 · seed 48 · 12 shots from `docs/art-audit/current/`, one call per shot_

### [macro day] Whole 160x100 world at noon, fully zoomed out. (01-macro-day.jpg)
The map's foundational land-to-water split reads clearly in the first two seconds, and the dark, semi-transparent UI panels provide stark, legible contrast against the bright world. However, critical strategic information fails entirely at this zoom level due to poor contrast and a lack of scale hierarchy. The single-pixel colored territory borders are disastrously thin, vanishing completely when they intersect with the dark green forest textures or busy brown terrain patches. Settlements are reduced to muddy, low-contrast grey pixel clusters and tiny diamond markers that fail to draw the eye or communicate relative population size. Furthermore, thin grey road networks bleed directly into the highly noisy, visually jarring grey textures in the southern and northeastern regions, making infrastructure nearly impossible to track. Conversely, the harsh, jagged sand outline wrapping every single coastline artificially dominates visual attention, overpowering the actual player subjects. The biggest visual blockers are these near-invisible political borders competing with overly dominant coastal outlines; territory boundaries desperately need thicker strokes or semi-transparent interior fills, and settlements require distinct, high-contrast silhouettes to anchor this macro view.

### [macro night] Whole world at midnight: settlement lights, glow control. (02-macro-night.jpg)
At a two-second glance, this macro night shot fails to convey a living world due to overwhelmingly muddy, low-contrast terrain. The dark green landmasses and deep blue water bleed together, leaving the map looking flat and devoid of ambient moonlight or topological depth. The biggest visual blockers are the settlement lights, which render as harsh, sharp-edged orange squares rather than soft, radiating glows, making them look like placeholder UI blocks instead of actual illumination. Territory borders, drawn as faint 1-pixel outlines in dark purple and red, are almost entirely lost against the shadowed environment. While the UI panels successfully maintain crisp readability with high-contrast beige text on dark backgrounds, the simulation beneath them feels visually dead. The map desperately needs subtle coastal rim-lighting or specular highlights to separate land from water. Furthermore, the settlement lights require a radial bloom and varying intensity to pull the viewer's eye and establish the scale of civilization in the darkness.

### [mid day] Default play zoom (2.2x) on the largest settlement region (Briarcairn) at noon. (03-mid-day.jpg)
1. The thick, orange territory border provides instant readability, though its strict 90-degree angles clash harshly with the softer, sand-fringed coastlines.
2. The UI effectively uses dark, opaque panels to maintain crisp text legibility without cluttering the central simulation view.
3. However, the settlements suffer from a severely rigid, stamped appearance due to the identical, perfectly square wooden palisades enclosing every town.
4. Inside these walls, the structures collapse into a muddy, low-contrast jumble of brown and orange pixels, destroying any sense of scale or internal layout.
5. Individual citizens or dynamic actions are completely illegible at this zoom level, lost entirely within the noisy textures of the grass and settlement interiors.
6. The mountain ranges fail to read as raised topography; they appear as a flat, chaotic gray static pasted directly over the map grid.
7. Faint dirt paths connecting the camps are present but lack sufficient contrast to stand out clearly against the uniform green grass texture.
8. The flat midday lighting exacerbates these issues, offering no shadows, ambient occlusion, or highlights to separate overlapping elements and give depth to the scene.
9. Ultimately, the biggest visual blocker is the unnatural, grid-locked repetition of the perfectly square settlement walls dominating the otherwise organic landscape.

### [mid night] Same framing at midnight: lighting quality and building visibility. (04-mid-night.jpg)
The overall readability of this night scene fails due to an aggressively low-contrast, muddy color palette that crushes the grass, water, and mountains into a flat, indistinguishable mass. The orange settlement glows successfully highlight town locations, but the light fails to illuminate the structures beneath, leaving the buildings as illegible dark smudges. Settlement name labels use a dull grey-blue text that vanishes against the dark green ground, destroying readability. Territory borders rely on thin, faint dashed lines that are almost completely lost in the darkness, failing to communicate civilization footprints at a glance. The hard, stair-step transitions between the dark water and land are visually jarring and lack any shoreline softening. Central mountains read as a noisy, flat patch of dark grey rather than conveying volume or impassable terrain. The global darkness completely swallows any roads, citizens, or interconnecting details, making the world feel static and empty. While the UI panels remain fully legible due to their solid backgrounds and high-contrast text, the game world itself fails the two-second comprehension test.

### [close settlement] Close-up of the largest settlement at 4.5x: building art, grounding, glow. (05-close-settlement.jpg)
The rigid, perfect-square settlement walls clash aggressively with the organic terrain, making the towns look like artificial stamps. Inside these walls, the extreme, chaotic overlapping of buildings creates a jumbled mass of roofs that destroys any sense of coherent town layout or architectural readability. The biggest visual blocker is the massive, monochromatic orange citizen sprites, which are nearly as tall as the houses and severely break the world's scale. These flat, meeple-like figures lack directional facing or readable action states, rendering the simulation static and lifeless despite the high unit density. Terrain transitions—particularly the sharp, unblended grid edges between water, sand, and grass—feel harsh and unfinished. Similarly, the river cutting directly through the solid stone wall of Briarcairn exposes broken terrain-to-structure blending. The UI panels feature strong dark-to-light contrast and frame the scene well without obscuring the central map. While the pale brown roads read passably against the dark green forests, they are frequently swallowed up by the oversized citizens. Ultimately, the visual appeal is severely hampered by the glaring scale mismatch between the giant meeples and the cramped, boxy towns.

### [close citizens] Citizen close-up at 6.5x: action icons above heads — can you tell who is working, trading, resting? (06-close-citizens.jpg)
To answer the core question: no, I absolutely cannot tell who is working, trading, or resting, because the uniform, orange-brown citizen sprites lack clear visual state variations or distinct action icons above their heads. The few yellow wheat icons that are visible get completely swallowed by the chaotic, high-contrast rooftops and dense stone walls behind them. Citizen readability fails across the board, as the monochromatic wooden figures blend seamlessly into the dirt roads and brown palisades, destroying any quick 2-second comprehension of population movement. Furthermore, the settlements are claustrophobically packed; the tall, overlapping defensive walls around "Riarcairn" create jagged visual noise that obscures both the architecture and the actors trapped inside. On-map text readability is also compromised, as the thin serif settlement labels lack sufficient drop shadows or dark plates to pop against the textured terrain. Finally, the environmental aesthetic completely breaks down in the bottom right corner, where the water tiles meet the grass with harsh, unfinished right angles that ruin the organic illusion of the map.

### [winter] Mid-winter (snow terrain, snowfall if rolled) over the same region. (07-winter.jpg)
The stark white and pale grey snow terrain provides excellent contrast for the warm, wooden settlement structures, ensuring the towns immediately stand out. However, the bright orange and yellow staircase-shaped territory borders are a massive visual blocker, overpowering the scene and clashing severely with the organic pixel landscape. Roads, rendered as faint grey dashed lines, fail completely here; they blend into the snowy background and sever the visible connections between towns. Within the palisade walls, the settlement sprites are densely packed and visually noisy, obscuring individual building scale or functional hierarchy. Citizens are reduced to minuscule dark specks that are nearly impossible to track against the heavily textured snow, nullifying any sense of a living, active world. Settlement name labels remain legible with their dark text and light strokes, though they occasionally collide with the aggressive territory lines. The dark UI panels anchor the screen well against the bright terrain, but the bottom-left event log floats awkwardly, leaving a massive, unused black void beneath the map. Ultimately, the serene winter aesthetic is ruined by the dominant, jagged borders and the complete lack of visible, readable ground paths.

### [rain] Heavy rain over the largest settlement region, noon, default zoom. (08-rain.jpg)
The "noon rain" state reads more like a dirty lens filter than weather; the global darkening flattens the entire map into a muddy, low-contrast wash of desaturated greens and dark greys. The rain effect itself relies on sparse, short white dashes that add visual noise without conveying a heavy downpour or interacting with the environment. Stark, jagged orange territory lines harshly clash with the blocky tan coastlines, creating a distracting double-outline effect that heavily dominates the composition. Furthermore, the grey, high-frequency mountain textures sit completely flat on top of the forest without any organic base blending or ambient occlusion. Settlements look like rigid, perfectly square wooden pens crammed with overlapping, illegible building assets and indistinguishable clusters of colored citizen dots. Thin, dark brown roads connecting these towns are entirely swallowed by the darkened green background layer. While the solid dark UI panels keep the text highly legible, their crisp white and yellow fonts feel aesthetically disconnected from the dingy, muted map beneath them. The absolute biggest visual blocker is this severe lack of tonal contrast—ocean, forests, and settlements all share the same dark, muddy value range, destroying depth and making the simulation exhausting to parse.

### [active crisis or war] War frontier between two civilizations: border friction, skirmish markers, military readability. (09-war-crisis.jpg)
The most glaring visual blocker in this shot is the heavy, dark grey vertical striping over the central frontier, which looks like a rendering glitch rather than a readable contested war zone. The rigid, pixelated neon green, yellow, and red territory lines severely clash with the organic, painted terrain textures beneath them. The snowy terrain itself is aggressively noisy and lacks contrast, turning the map into a flat, textured grey expanse that swallows small details. Because of this high-frequency background noise, the citizens are reduced to minuscule, undifferentiated pixel clusters, making military skirmishes and unit actions completely illegible. The settlement palisades are perfectly square and heavily repeated, making towns like "Fernfell" and "Briarstead" look like rigid rubber stamps rather than organic winter outposts. Furthermore, despite the UI declaring multiple wars, the lighting remains entirely flat with zero atmospheric tension, and the only indicator of destruction is a tiny, muddy orange smudge of fire on "Hollowfell." While the dark UI panels contrast well and remain readable against the bright snow, the map entirely fails to visually emphasize the dramatic conflict listed in the event log.

### [town upgrade / large settlement] Largest town (Briarcairn, pop 320) with surroundings: scale fantasy, road connections. (10-town-large.jpg)
1. The instant 2-second read is dominated by chaotic, overlapping blobs of bright orange roofs that fail to convey structured towns or increasing scale. 
2. Settlement walls are rigidly square, ignoring the organic shapes of the towns and terrain, and awkwardly colliding with neighboring structures. 
3. The aggressively blocky, stepped coastlines and rigid river tiles clash severely with the hand-drawn aesthetic of the mountain and tree sprites. 
4. Thin, dark brown dirt roads lack contrast and disappear completely when passing through the noisy, high-frequency forest and mountain textures. 
5. Territory borders—rendered as a faint, thin orange line—are practically invisible against the saturated green terrain and dark blue water. 
6. While the dark, opaque UI panels are highly legible, the in-world white text labels for settlement names are too small and easily lost against the busy background art. 
7. The extreme density of identical house sprites stacked on top of each other creates a noisy visual mess rather than a readable, sprawling settlement. 
8. The biggest visual blocker is the rigid grid alignment of all terrain transitions (water to sand, grass to rock), which aggressively breaks the fantasy of a natural, organic world.

### [summer] Mid-summer over the same region, noon, default zoom. (11-summer.jpg)
The immediate 2-second read establishes a populated coastal landscape, but immersion is instantly broken by the severe, stair-stepped yellow sand borders starkly dividing the green forests and deep blue water. Rivers suffer the same fate, appearing as rigid, blocky blue trenches that cut unnaturally through the terrain. Settlements act as visual black holes: they present as dense, messy clumps of brown and red roofs jammed into perfectly rectangular, artificial palisade walls that ignore natural geography. At this zoom level, citizens and localized actions are completely invisible, swallowed by the noisy, overlapping building sprites and dark background textures. Territory lines and dirt roads are far too thin, frequently disappearing into the jagged coastlines or the dark green forest canopy. While the dark UI panels offer crisp, readable typography, the bottom fifth of the image is an unpolished, dead black void that ruins the overall composition. Furthermore, the active white rain streaks overlaying the scene muddy the intended "summer noon" lighting, flattening the contrast and washing out the vibrancy. The most critical visual blockers are the aggressively blocky, unblended tile edges and the hopelessly cluttered, box-like settlement interiors.

### [autumn] Mid-autumn over the same region, noon, default zoom. (12-autumn.jpg)
The 2-second read fails completely because the entire landmass is swallowed by a muddy, mid-tone brown color palette that lacks any value contrast. Autumn trees share the exact same hue and value as the ground beneath them, appearing merely as noisy stippling rather than distinct objects. Settlement palisades and buildings are constructed from wood tones that perfectly camouflage into this brown backdrop, turning towns into cluttered, indistinct blobs. Faint, semi-transparent grey roads lack opacity and are entirely lost within the busy ground texture, failing to connect the map visually. Citizens are reduced to microscopic specks whose faint colors are completely consumed by the noisy terrain, making their actions totally unreadable at this default zoom. In violent opposition to the muted terrain, the territory borders use harsh, saturated neon greens and yellows on a jagged, heavily stepped grid that shatters the organic feel of the map. The lighting is uniformly flat across the landscape, offering no shadows or highlights to pull the settlements out from the background. Ultimately, the severe lack of contrast in the world art forces the eye straight to the jarring neon borders rather than the simulation itself.

---

Here is the synthesized art audit and UX readability review for Emberfall, based strictly on the provided screenshot critiques.

### Readability & Aesthetics Scores
- **Macro readability:** 3/10
- **Terrain beauty:** 3/10
- **Terrain clarity:** 4/10
- **Settlement readability:** 2/10
- **Settlement scale fantasy:** 2/10
- **Building variety:** 2/10
- **Lighting quality:** 2/10
- **Glow control:** 1/10
- **Citizen readability:** 1/10
- **Action readability:** 1/10
- **Event readability:** 2/10
- **UI integration:** 8/10
- **Screenshot appeal:** 3/10

---

### A. Top 10 Problems (Ranked by Severity)
1. **Broken Citizen Scale & States:** At close zoom, citizens are gigantic, scale-breaking monolithic orange meeples with no directional facing or readable action states. At macro zoom, they are invisible.
2. **Artificial Settlement Rigidness:** Every settlement is encased in an identical, perfectly square palisade wall that ignores natural geography and looks like a rigid rubber stamp.
3. **Chaotic Settlement Interiors:** Buildings are densely packed into overlapping, illegible blobs of brown and orange pixels, destroying any sense of town layout, hierarchy, or scale. 
4. **Harsh, Blocky Terrain Transitions:** Coastlines and riverbanks suffer from aggressive, 90-degree stair-stepped grid alignments that violently clash with the organic terrain textures.
5. **Muddy Tonal Palettes:** Rain, autumn, and night states crush value contrast. Autumn trees match the ground perfectly, rain looks like a dirty grey filter, and night swallows the world into a flat, indistinguishable mass.
6. **Failed Night Lighting:** Settlement lights render as harsh, sharp-edged orange UI squares instead of soft environmental illumination, leaving the actual buildings as pitch-black smudges.
7. **Unreadable Territory Borders:** Borders swing between two broken extremes: they are either 1px thin lines that completely vanish into terrain noise, or harsh, jagged neon stair-steps that overpower the entire composition.
8. **Invisible Infrastructure:** Roads are thin, faint dirt lines that are completely swallowed by high-frequency grass/snow textures or dwarfed by the oversized citizens.
9. **Illegible Events & Conflict:** Wars render as a glitchy dark-grey vertical striping, and fires are tiny muddy smudges. High-stakes events lack atmospheric tension.
10. **Swallowed Labels & Icons:** In-world settlement text and overhead citizen action icons lack backplates or drop shadows, vanishing directly into the chaotic rooflines and busy terrain art.

---

### B. Top 10 Concrete Fixes (Ranked by Impact)
1. **Resize and Redesign Citizens:** Shrink the citizen sprites so they are proportionally smaller than buildings. Add visual facing (front/back/side) and distinct color-coding or animations to denote working, resting, and trading.
2. **Break the Settlement Grid:** Replace the perfectly square palisades with organic, irregularly shaped walls that conform to the terrain and population size.
3. **Space Out Buildings:** Stop endlessly stacking identical house sprites. Introduce clear negative space (streets/plazas) within walls to establish a readable architectural footprint.
4. **Smooth Tile Transitions:** Implement blending, alphas, or organic transition tiles for water-to-sand, grass-to-rock, and rivers to eliminate the jagged, stair-stepped grid lines.
5. **Overhaul Lighting & Bloom:** Replace the square orange light blocks with soft, radial glow alphas. Introduce ambient blue moonlight to the terrain so the world remains visible at night.
6. **Standardize Territory Borders:** Use a smooth, anti-aliased perimeter line paired with a subtle, semi-transparent inner color fill. Eliminate the jagged 90-degree corner snapping.
7. **Fix Value Contrast:** Lighten the ground in Autumn and Rain states to ensure trees, buildings, and citizens have distinct, readable silhouettes against the terrain. 
8. **Thicken and Outline Roads:** Widen the road network lines and add a subtle dark edge or drop shadow so they punch through the high-frequency forest and mountain textures.
9. **Add UI Backplates to World Elements:** Place dark, semi-transparent pills behind settlement name labels and citizen action icons to ensure they read cleanly regardless of the background art.
10. **Redesign Crisis Visuals:** Remove the grey vertical glitch lines for war fronts. Replace them with glowing, high-contrast border friction lines, scorched earth decals, and larger, brighter fire VFX.

---

### C. Specific Instructions for Settlement Visuals
*   **Walls:** Eradicate all perfectly square enclosures immediately. Defenses must wrap organically around the cluster of buildings.
*   **Interiors:** Do not merge building roofs into monochromatic blobs. You must show distinct structures with varied shapes to communicate the difference between a camp, village, and large town.
*   **Clipping:** Ensure environmental features (like rivers) do not cut cleanly through solid stone settlement walls. Create proper bridge or wall-gate intersections.
*   **Scale:** Settlements must anchor the macro view. When zoomed out, use distinct, high-contrast icons that scale with population size rather than muddy grey pixel clusters.

---

### D. Specific Instructions for Terrain Visuals
*   **Coastlines & Rivers:** Eliminate all hard right angles. The game is supposed to look organic; stair-stepped water borders instantly break the illusion of nature.
*   **Mountains:** Stop pasting flat, high-frequency static over the grid. Mountains need shading, ambient occlusion, and an organic base transition to look like they rise from the earth.
*   **Weather states:** Rain cannot just be a flat darkening filter with white dashes. Retain terrain contrast and use screen-space directional effects. 
*   **Autumn:** Differentiate the value (lightness/darkness) of the autumn trees from the autumn ground. They currently camouflage into each other.

---

### E. Specific Instructions for Night Lighting and Glow
*   **Light Sources:** The orange settlement glows must be soft, circular, radiating blooms. The sharp, square UI blocks are unacceptable.
*   **Illumination:** Ensure the settlement lights cast a glow that highlights the tops of the buildings inside the walls, rather than leaving the town as an illegible black silhouette.
*   **Global Illumination:** Night cannot be a pitch-black wash. Use ambient cool blues to maintain topological depth, and add subtle specular highlights (rim-lighting) along coastlines to separate land from water.

---

### F. Specific Instructions for Zoom-Level Rendering
*   **Macro (Fully Zoomed Out):** Stop relying on 1px lines and muddy clusters. Use bold, semi-transparent fills for civilization territories. Ensure settlements pop out from the terrain using clear, varied icons.
*   **Mid (Default Play):** Emphasize structural layout and road networks. Roads must be thick enough to track from town to town without getting lost in the forest.
*   **Close (Settlements/Citizens):** Fix the massive scale discrepancy. The monolithic orange meeples must be shrunk down and given varied visual states so the player can actually see the simulation happening without UI text. 

---

### G. What Should NOT Be Changed (Because It Already Works)
*   **The UI Panels:** The dark, opaque panels with crisp white, yellow, and beige text provide excellent legibility. They frame the scene beautifully without cluttering the map.
*   **The Foundational Macro Split:** The underlying land-to-water ratio and layout in the macro view reads instantly.
*   **Winter Base Contrast:** The stark white snow provides excellent natural contrast for the warm, wooden settlement structures (provided the borders don't ruin the composition).

---

### H. Art Direction Summary for Next Implementation Pass
The current art direction suffers from a severe, jarring clash between rigid, pixelated grid alignments and organic terrain textures, resulting in a noisy, unpolished look. The next implementation pass must focus on **organic integration and tonal contrast**. We must break the 90-degree tyranny of perfectly square settlement palisades and stair-stepped coastlines, replacing them with smoothed, natural transitions. Simultaneously, we must aggressively adjust color values—especially in autumn, night, and rain states—to ensure actors (citizens, buildings, roads) pop clearly against the environment rather than drowning in mud. By scaling down the oversized citizens to a readable proportion, replacing blocky UI lights with soft radial bloom, and adding global depth via shadows and ambient occlusion, we will transform this from a flat, stamped prototype into a readable, beautiful living diorama.
