# Gemini Action Items — Emberfall

_Model: gemini-3.1-pro-preview · 2026-06-11 · seed 48 · 10 shots from `docs/art-audit/current/`_

- [ ] **Overhaul Ambient Night Lighting**
  Night is currently pure black, which completely obscures the terrain, roads, buildings, and borders. Change the pure black night overlay to a dark, cool slate blue (deep navy/purple) so the world remains fully readable.
  *Impact: High*

- [ ] **Nerf Settlement Light Glow**
  Settlement point lights are blown-out, opaque orange blobs that hide buildings instead of illuminating them. Drastically reduce the glow radius by at least 80% and lower the additive intensity. The light must illuminate the structures underneath rather than act as an opaque blinding sun.
  *Impact: High*

- [ ] **Correct Citizen Sprite Scale**
  Individual citizen sprites are massively out of proportion, appearing nearly half the size of an entire settlement icon. Reduce the render scale of citizen sprites so they are proportionally grounded relative to the buildings.
  *Impact: Medium*

- [ ] **Implement Citizen LOD Culling**
  At mid-to-macro zooms, citizens create massive visual static resembling a swarm of identical yellow dots. Completely hide all citizens at macro zoom. At mid-zoom, reduce citizen contrast to eliminate visual noise, reserving full-contrast sprites and specific animations (walking, fighting) exclusively for close zoom.
  *Impact: High*

- [ ] **Soften Civilization Borders**
  Civilization borders clash with the visual style due to harsh, aliased stair-step edges. Thicken the civilization border lines and apply anti-aliasing or a semi-transparent inner glow.
  *Impact: High*

- [ ] **Ground the Settlements**
  Settlements look like flat, noisy stickers pasted unnaturally onto a single background tile. Draw a dirt, stone, or paved base layer directly underneath the settlement sprites. This base must visually connect and blend into the surrounding grass or sand tiles.
  *Impact: High*

- [ ] **Simplify Building Silhouettes**
  Settlement buildings are drawn with low contrast, making them look like dark, muddy clumps of pixels rather than distinct structures. Redraw the building silhouettes with simplified shapes. Use higher contrast between rooftops and walls to make the structures visually pop.
  *Impact: Medium*

- [ ] **Simplify Terrain Textures**
  Mountains and forests rely on noisy, repetitive, high-frequency pixel patterns that look messy from a distance. Flatten the colors used in mountains and forests, relying on broad shapes and shadows rather than pixel noise. Group mountain tiles into continuous ranges with shared highlights and shadows instead of individual textured squares.
  *Impact: High*

- [ ] **Curve the Roads**
  Roads are 1-pixel-thin, perfectly straight vector lines that cut unnaturally across organic terrain. Replace straight point-to-point lines with splines or pathfinding-based organic curves.
  *Impact: High*

- [ ] **Eliminate Harsh Grid via Terrain Blending**
  Obtrusive 1x1 grid lines destroy immersion, making the world look like a spreadsheet. Implement marching squares or edge transitions to blend terrain tiles seamlessly and completely hide the tile grid.
  *Impact: High*

- [ ] **Add Coastline Transitions**
  Land meets water with a hard, unstyled edge, lacking any transition, shallow depth, or beach. Introduce transitional tiles for sand or dirt where the land meets the sea.
  *Impact: Medium*

- [ ] **Add Water Depth and Movement**
  Water looks like a flat, repeating wallpaper pattern lacking any natural feel. Replace the static water texture with shaders or animated textures that convey depth and movement.
  *Impact: Low*

- [ ] **Expand Settlement Footprints**
  Growing settlements lack a sense of scale, simply swapping a 1x1 icon rather than expanding to reflect a true population increase. Make large towns visually spill over into adjacent tiles to expand their footprint as they grow from a camp to a town, completely abandoning the single-tile sticker look.
  *Impact: High*
