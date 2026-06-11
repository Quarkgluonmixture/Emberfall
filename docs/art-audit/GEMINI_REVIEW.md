# Gemini Before/After Review — Emberfall

_Model: gemini-3.1-pro-preview · 2026-06-11 · 10 pairs (baseline vs current)_

### macro day (01-macro-day.jpg)
**Improved.** The harsh 1x1 terrain grid has been completely eliminated and citizens are properly culled at macro zoom. This massively reduces visual static and transforms the map from a spreadsheet into a clean, readable overworld for the player.

### macro night (02-macro-night.jpg)
**Improved.** The pure black backdrop was replaced with an ambient dark blue, and the blinding orange lights were drastically reduced in radius and intensity. The player can now easily read terrain, roads, and borders at night without the screen being blown out.

### mid day (03-mid-day.jpg)
**Improved.** Straight, 1-pixel vector lines were replaced by organic, curved dirt roads, and civilization borders are now soft, semi-transparent glows. The region looks much more natural and integrated, significantly aiding geographical readability.

### mid night (04-mid-night.jpg)
**Improved.** The contained glow control allows the settlement structures and their new civilization banners to actually be seen at night. The ambient lighting keeps the surrounding roads and terrain perfectly navigable for the player.

### close settlement (05-close-settlement.jpg)
**Improved.** The removal of the grid and the smooth connections of the curved roads help ground the settlement into the environment. The addition of colored banners improves civilization identification at a glance.

### close citizens (06-close-citizens.jpg)
**Improved.** The cleaner, smoothed terrain provides a much less noisy backdrop, allowing the individual citizen sprites and their drop shadows to stand out. While deciphering exact actions is still slightly difficult, overall visual separation from the background is much better.

### winter (07-winter.jpg)
**Improved.** The continuous, grid-less snow textures create a cohesive winter landscape. The soft glowing civilization borders and brown dirt roads provide excellent, readable contrast against the white terrain, ensuring players don't lose their bearings in winter.

### rain (08-rain.jpg)
**Improved.** The atmospheric rain overlay darkens the mood without muddying the screen. The smooth terrain and lack of grid lines ensure the player can still easily read the map state despite the weather.

### active crisis or war (09-war-crisis.jpg)
**Improved.** The thickened, inner-glow civilization borders make the frontlines incredibly clear and easy to read. The player can instantly understand the territorial division without the jagged stair-stepping distraction of the old borders.

### town upgrade / large settlement (10-town-large.jpg)
**Unchanged.** Large towns with hundreds of citizens still use the exact same constrained, single-tile footprint as smaller villages. This completely fails to deliver any visual scale fantasy or sense of sprawling growth for the player.

***

### 1. Overall Verdict
The readability pass was a massive success, directly addressing the most severe pain points from the baseline audit. By eliminating the harsh terrain grid, curving the roads, softening borders, and fixing the completely broken night lighting, the game successfully transitioned from a messy prototype to a readable, atmospheric "living diorama." The visual hierarchy is now clear and screen-noise is vastly reduced, though physical settlement scale remains a glaring omission.

### 2. Re-scored Categories (1 to 10)
- **macro readability:** 9 (+4)
- **terrain beauty:** 8 (+5)
- **terrain clarity:** 8 (+2)
- **settlement readability:** 6 (+2)
- **settlement scale fantasy:** 2 (Unchanged)
- **building variety:** 3 (Unchanged)
- **lighting quality:** 8 (+6)
- **glow control:** 9 (+7)
- **citizen readability:** 7 (+2)
- **action readability:** 4 (+1)
- **event readability:** 5 (+1)
- **UI integration:** 8 (Unchanged)
- **screenshot appeal:** 8 (+5)

### 3. Top 3 Remaining Problems
1. **Settlement Scale & Sprawl:** Towns of 300+ citizens still occupy the exact same 1x1 tile footprint as a tiny camp. Settlements must spill over into adjacent tiles as they grow to provide a satisfying scale fantasy.
2. **Building Art & Variety:** The internal art of the settlements is still a single dense, muddy clump of dark structures; they need more internal contrast, variety, and distinct upgrades to not look like static stickers.
3. **Action Readability:** While citizens stand out better against the clean terrain, differentiating a working citizen from a fighting or walking one at a glance remains difficult due to tiny sprite size and subtle silhouettes.
