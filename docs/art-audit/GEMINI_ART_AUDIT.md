# Gemini Art Audit — Emberfall

_Model: gemini-3.1-pro-preview · 2026-06-11 · seed 48 · 10 shots from `docs/art-audit/current/`_

Here is the visual review of the Emberfall screenshots.

### SCORING (1 to 10)
- **macro readability:** 5
- **terrain beauty:** 3
- **terrain clarity:** 6
- **settlement readability:** 4
- **settlement scale fantasy:** 2
- **building variety:** 3
- **lighting quality:** 2
- **glow control:** 2
- **citizen readability:** 5
- **action readability:** 3
- **event readability:** 4
- **UI integration:** 8
- **screenshot appeal:** 3

---

### A. Top 10 problems, ranked by severity.
1. **Harsh Grid:** Obtrusive 1x1 grid lines destroy immersion, making the world look like a spreadsheet.
2. **Broken Night Lighting:** Night is just giant, blown-out orange blobs on pure black, completely obscuring the world, buildings, and terrain.
3. **Lack of Settlement Scale:** Settlements look like flat, noisy stickers pasted onto a single tile; there is no sense of a 300-person town vs. a 50-person village.
4. **Artificial Roads:** Roads are 1-pixel-thin, perfectly straight vector lines that cut unnaturally across organic terrain.
5. **Jagged Borders:** Civilization borders are harsh, aliased stair-steps that clash with the visual style.
6. **Citizen Noise:** At mid-zoom, citizens look like a swarm of identical yellow dots, creating massive visual static.
7. **Noisy Textures:** Terrain (especially mountains and water) relies on repetitive, high-frequency pixel patterns that look messy from a distance.
8. **Unfinished Coastlines:** Land meets water with a hard, unstyled edge; there is no transition, beach, or shallow water depth.
9. **Scale Mismatch:** Individual citizen sprites are nearly half the size of an entire settlement icon.
10. **Muddy Silhouettes:** Settlement buildings are drawn with low contrast, making them look like dark smudges rather than distinct structures.

### B. Top 10 concrete fixes, ranked by impact.
1. **Implement terrain blending:** Use marching squares or edge transitions to completely hide the tile grid.
2. **Fix ambient night:** Change the pure black night overlay to a readable deep navy/purple so terrain remains visible.
3. **Nerf the glow:** Drastically reduce the radius and opacity of settlement point lights so they illuminate buildings rather than hiding them.
4. **Ground the settlements:** Draw a dirt/paved base layer underneath settlements to visually connect them to the map.
5. **Curve the roads:** Replace straight point-to-point lines with splines or pathfinding-based organic curves.
6. **Soften borders:** Thicken the civilization border lines and apply anti-aliasing or a semi-transparent inner glow.
7. **LOD Culling:** Completely hide all citizens at macro zoom to clean up the screen.
8. **Expand settlement footprints:** Make large towns visually spill over into adjacent tiles instead of just swapping a 1x1 icon.
9. **Simplify terrain art:** Flatten the colors in mountains and forests, relying on broad shapes and shadows rather than noisy pixel textures.
10. **Add coastlines:** Introduce transitional tiles for sand/dirt where land meets the sea.

### C. Specific instructions for settlement visuals.
Stop using single, noisy icons. Settlements must feel grounded in the world. Draw a dirt or stone base underneath them that blends into the surrounding grass/sand tiles. As a settlement grows from a camp to a town, its visual footprint *must* expand to occupy more area, not just swap to a slightly different icon of the exact same size. Simplify the building silhouettes; currently, they look like muddy, dark clumps of pixels. Use higher contrast between rooftops and walls.

### D. Specific instructions for terrain visuals.
The grid must be eliminated immediately. The visual transition between grass, forest, mountain, and water needs blending tiles. Water requires depth and movement—currently, it is a flat, repeating wallpaper pattern. Mountains look like noisy gray blocks; group them into continuous ranges with shared highlights and shadows instead of individual textured squares.

### E. Specific instructions for night lighting and glow.
The current night mode is broken. Ambient night color should never be pure black; use a dark, cool slate blue so the terrain, roads, and borders remain readable. The settlement lights are completely blowing out the image—reduce the glow radius by at least 80% and lower the additive intensity. The light should *illuminate* the buildings, not act as an opaque orange sun that covers them up. 

### F. Specific instructions for zoom-level rendering.
Manage visual hierarchy strictly based on camera distance. At macro zoom, hide citizens entirely; the player only needs to see biomes, borders, and settlement locations. At mid-zoom, reduce citizen contrast so they don't look like television static. Reserve the current citizen sprites and their specific animations (walking, fighting) exclusively for close zoom.

### G. What should NOT be changed because it already works.
The UI panels, typography, and layout are excellent. The text color choices, dark semi-transparent backgrounds, and cleanly integrated event feed look like a polished, modern game. The core color coding for civilizations (orange, green, blue, pink, purple) is distinct and highly readable. 

### H. A one-paragraph art direction summary for the next implementation pass.
Transition the game from a "grid-based board game prototype" to a "living diorama." Your immediate priority is softening every harsh line: blend the terrain tiles, curve the roads organically, and smooth the civilization borders. Ground your cities into the earth by giving them dirt bases and expanding footprints, breaking away from the single-tile sticker look. Finally, overhaul the lighting to create a moody but readable night scene, dialing back the blinding orange glows so the world's atmosphere enhances, rather than obscures, the simulation.
