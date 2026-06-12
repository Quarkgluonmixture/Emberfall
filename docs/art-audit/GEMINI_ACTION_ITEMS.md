# Gemini Action Items — Emberfall

_Model: gemini-3.1-pro-preview · 2026-06-12 · seed 48 · 12 shots from `docs/art-audit/current/`, one call per shot_

- [ ] **Add UI Backplates to World Elements**
In-world settlement text and overhead citizen action icons vanish directly into chaotic rooflines and busy terrain art. Place dark, semi-transparent pills behind settlement name labels and citizen icons to ensure they read cleanly regardless of the background art. *Impact: High*

- [ ] **Overhaul Night Settlement Lighting**
Settlement lights render as harsh, sharp-edged orange UI squares that leave the actual buildings as pitch-black smudges. Replace the square UI light blocks with soft, circular, radiating glow alphas that illuminate and highlight the tops of the buildings inside the walls. *Impact: High*

- [ ] **Fix Value Contrast in Weather States**
Rain looks like a flat, dirty grey filter and autumn trees perfectly camouflage into the ground, crushing all value contrast. Lighten the ground in Autumn and Rain states so trees, buildings, and citizens have distinct silhouettes, and replace the flat darkening rain filter with screen-space directional effects. *Impact: High*

- [ ] **Scale Down and Differentiate Citizens**
At close zoom, citizens are gigantic, scale-breaking monolithic orange meeples that lack directional facing or readable action states. Shrink the sprites to be proportionally smaller than buildings, and add visual facing (front/back/side) along with distinct color-coding to denote working, resting, and trading. *Impact: High*

- [ ] **Replace Macro Settlements with High-Contrast Icons**
When fully zoomed out, settlements vanish into the terrain or appear as muddy grey pixel clusters. Anchor the macro view by using bold, high-contrast, varied icons that scale with population size rather than attempting to render tiny clusters of buildings. *Impact: Medium*

- [ ] **Thicken and Outline Roads**
Roads are currently thin, faint dirt lines that are completely swallowed by high-frequency grass, snow, and mountain textures. Widen the road network lines and add a subtle dark edge or drop shadow so they punch through the environment and are easily trackable from town to town. *Impact: Medium*

- [ ] **Add Global Night Illumination**
Night lighting currently swallows the world into a flat, pitch-black indistinguishable mass outside of settlements. Introduce ambient cool blue moonlight to maintain topological depth across the terrain, and add subtle specular highlights (rim-lighting) along coastlines to separate land from water. *Impact: Medium*

- [ ] **Redesign Event and Crisis Visuals**
High-stakes events lack atmospheric tension, with wars rendering as glitchy dark-grey vertical stripes and fires appearing as tiny muddy smudges. Remove the grey vertical lines and replace them with glowing, high-contrast border friction lines, scorched earth decals, and larger, brighter fire VFX. *Impact: Medium*

- [ ] **Standardize and Smooth Territory Borders**
Borders swing between being unreadable 1px thin lines or aggressively jagged 90-degree neon stair-steps. Draw a smooth, anti-aliased perimeter line paired with a subtle, semi-transparent inner color fill, utilizing bold semi-transparent fills when fully zoomed out. *Impact: High*

- [ ] **Space Out Settlement Interiors**
Buildings are densely packed into overlapping, monochromatic brown and orange blobs that destroy any sense of town layout, hierarchy, or scale. Stop endlessly stacking identical house sprites and introduce clear negative space for streets and plazas, utilizing varied building shapes to differentiate camps, villages, and towns. *Impact: High*

- [ ] **Break the Settlement Grid**
Every settlement is encased in an identical, perfectly square palisade wall that behaves like a rigid rubber stamp and ignores natural geography. Replace these square enclosures with organic, irregularly shaped walls that conform smoothly to both the terrain and the population footprint. *Impact: High*

- [ ] **Smooth Tile and Coastline Transitions**
Coastlines and riverbanks suffer from aggressive, 90-degree stair-stepped grid alignments that violently clash with the organic terrain textures. Implement blending, alphas, or organic transition tiles for water-to-sand, grass-to-rock, and rivers to completely eliminate the jagged grid lines. *Impact: High*

- [ ] **Add Depth to Mountain Terrain**
Mountains appear as flat, high-frequency static pasted directly over the grid without volume. Add shading, ambient occlusion, and an organic base transition to make the mountains look like they naturally rise from the earth. *Impact: Medium*

- [ ] **Fix Settlement Clipping Intersections**
Environmental features like rivers currently cut cleanly through solid stone settlement walls. Create proper bridge or wall-gate visual intersections wherever terrain features intersect with settlement defenses. *Impact: Low*
