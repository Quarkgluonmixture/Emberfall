# Gemini Before/After Review — Emberfall

_Model: gemini-3.1-pro-preview · 2026-06-11 · 10 pairs (baseline vs current)_

### macro day (01-macro-day.jpg)
**Improved.** Settlements transitioned from illegible, dark mud-piles into clearly defined towns with circular palisades and faction banners. This instantly fixes the visual hierarchy, allowing the player's eyes to snap directly to points of interest instead of hunting for them in the organic terrain.

### macro night (02-macro-night.jpg)
**Improved (Marginally).** The massive, blown-out light blooms are still far too large for this zoom level, but the addition of colored faction markers floating in the dark finally helps identify who owns the glowing blobs. It's better for gameplay, but the bloom scaling itself is still a visual problem at this height.

### mid day (03-mid-day.jpg)
**Improved.** The introduction of actual architectural pixel art (pitched roofs, varying house colors, structured walls) completely replaces the placeholder debris look. The towns now read as structural settlements that contrast beautifully against the green landscape. 

### mid night (04-mid-night.jpg)
**Improved.** The glow radius was dramatically reined in and now acts as a proper lighting pass rather than a blinding lens flare. You can cleanly read the illuminated palisades and rooftops within the firelight, completely fixing night-time legibility.

### close settlement (05-close-settlement.jpg)
**Improved.** The structural grounding is fantastic; you can see distinct houses, pathways, and the defensive rings wrapping the town. It fully resolves the visual ambiguity of the original chaotic pixel clusters and firmly grounds the settlement in the world.

### close citizens (06-close-citizens.jpg)
**Improved.** Citizens now have distinct states and props—you can spot individuals hauling white resource sacks or performing actions rather than just being featureless orange gingerbread men. This micro-level contrast helps players instantly read economic activity at a glance.

### winter (07-winter.jpg)
**Improved.** Previously, the dark smudge of a settlement clashed horribly against the white snow, exacerbated by overblown lighting. Now, the colored roofs and clean palisade lines sit comfortably on the snow, maintaining contrast without looking like a graphical glitch.

### rain (08-rain.jpg)
**Improved.** The screen-darkening weather overlay previously swallowed the dark settlement blobs entirely. The new vibrant roof colors and defined wooden walls cut right through the storm, ensuring the player never loses track of their towns during heavy weather.

### active crisis or war (09-war-crisis.jpg)
**Improved.** The border tension is much clearer now that the actual settlements are legible and fly distinct, faction-colored banners (red vs. green) along the frontier. The structural presence of the towns makes the border lines feel like actual defended territory rather than arbitrary painted hexes.

### town upgrade / large settlement (10-town-large.jpg)
**Improved.** The scale fantasy is finally being delivered; large settlements now visibly expand into sprawling, multi-ringed complexes with dense housing. It visually communicates a high population and tier upgrade brilliantly compared to the old "wider mud puddle" approach.

---

### Overall Verdict
The readability pass was a resounding success and practically saved the game's aesthetic core. By replacing the illegible placeholder "mud piles" with actual medieval architectural pixel art, colored roofs, and circular palisades, the visual hierarchy is finally intact. Taming the night bloom to illuminate structures rather than blind the camera was a critical fix. The game has transitioned from a messy prototype into a charming, readable strategy game where civilization distinctly pops against the natural canvas. 

### 13-Category Score Delta
1. **Settlement Art / Architecture:** 1 → 9 *(+8)*
2. **Scale Fantasy (Upgrades):** 2 → 9 *(+7)*
3. **Micro Readability (Zoomed in):** 2 → 8 *(+6)*
4. **Composition & Grounding:** 2 → 8 *(+6)*
5. **Lighting & Glow Control:** 2 → 7 *(+5)*
6. **Faction / Territory Identity:** 4 → 8 *(+4)*
7. **Citizen State Readability:** 3 → 7 *(+4)*
8. **Color Palette & Contrast:** 4 → 8 *(+4)*
9. **Weather Effects Integration:** 4 → 7 *(+3)*
10. **Macro Hierarchy (Zoomed out):** 3 → 5 *(+2)*
11. **Terrain & Biome Art:** 5 → 5 *(Unchanged)*
12. **Road & Infrastructure:** 4 → 4 *(Unchanged)*
13. **UI & Typography:** 8 → 8 *(Unchanged)*

### Top 3 Remaining Problems
1. **Macro-Night Bloom Scaling:** While the mid-zoom lighting is great, the fully zoomed-out macro night map (Shot 02) is still dominated by massive, featureless fuzzy orange blobs. The bloom shader desperately needs a scale-clamping mechanism at max zoom so the world isn't swallowed by light.
2. **Terrain Monotony & Blending:** The forests and mountains remain repetitive, tiled green/grey blocks with harsh geometric stepping. The natural world lacks organic variation and feels incredibly flat compared to the new, highly detailed towns.
3. **Rigid Road Infrastructure:** Roads remain flat, 1-pixel geometric tan lines that clip awkwardly under the new palisades and terrain edges. They need dirt blending, path wear, and organic visual transitions to properly connect the beautiful new settlements to the map.
