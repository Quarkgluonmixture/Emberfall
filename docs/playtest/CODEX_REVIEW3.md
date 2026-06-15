# Emberfall Review 3: Countryside-Economy Pass (fields / walls / mills)

Screens reviewed: review-region, review-town (Moormarch, riverside walled),
review-town2 (Emberreach, E–W through-road), review-village (Wolfstead,
riverside). Touchstone remains KCD-style European medieval settlement logic.
gpt-5.5 high-reasoning, multimodal. Seed 48, year 6, noon.

## Verdict: the three features landed

The world now reads much more like settled, worked countryside rather than
isolated sprite clusters.

### 1. Agricultural field halo — strongest improvement
Settlements now sit in an agricultural envelope; Moormarch, Emberreach/
Briarcairn, Wolfstead all feel economically grounded. Still fake: fields read as
decorative rectangular stamps, not owned parcels — they don't obey roads, slope,
water access, walls, or household frontage; no hedges/ditches/lanes/fences; at
regional zoom it becomes a quilt of repeated hay/crop tiles.
- [layout-algo] Snap fields to access logic: road-facing strips, river-meadow
  strips, back-lot gardens behind houses.
- [layout-algo] Thin harder near cliffs, dense forest, town walls; reserve
  immediate wall edges for roads/yards/pasture/chapels/suburbs.
- [art] Parcel separators: hedgerows, ditches, low fences, furrows, cart tracks,
  haystacks, scarecrows, orchard rows.
- [sim] Tie field density/type to settlement age, prosperity, terrain, season.

### 2. Irregular wall hull + gates — landed directionally, halfway visually
Towns look less like centered boxes; the south gatehouse reads, roads cutting
through with defended openings is visible. Still fake: walls read as
"axis-aligned enclosure placed around sprites" — too much rectilinear symmetry
(Moormarch); they enclose settlement mass but not urban logic (no market square
at the gate, no burgage plots along the through-road, no extramural spillover, no
defensive relationship to slope/bridge/river/high ground). "Grand gatehouse
always on the south face" risks looking systemic — in Emberreach the main story
is the E–W road, so the most important gates should be on that road, not south.
- [layout-algo] Choose primary gates from road importance / bridge approach /
  trade route / terrain, not a fixed face.
- [layout-algo] Generate wall hull from streets/plots first, THEN walls.
- [layout-algo] Market/church/inn cluster just inside the main gate/crossing.
- [art] Wall-walk variation, repaired sections, ditch/berm outside walls, dirt
  desire paths at gate approaches.
- [sim] Walls only after wealth/threat justifies; not every nearby town should
  mature into a similarly walled compound so quickly.

### 3. Watermills — good, not yet loud enough as a system
Wolfstead's mill gives the village a productive riverside reason to exist;
Moormarch's SW water contact reads intentional. Still fake: the mill doesn't
immediately announce "water power" — the millpond/channel/jetty/wheel
relationship should be clearer, especially at regional zoom.
- [art] Make the wheel/channel/millrace silhouette legible: wheel on bank,
  sluice, narrow race, foam/water disturbance.
- [layout-algo] Place where road + river + settlement edge meet, near bridge/ford.
- [layout-algo] Service path from mill to settlement core and fields.
- [sim] Correlate mill presence with grain fields and town prosperity.

## Three-axis read
- **Visual**: much richer; the countryside has lived-in texture, a strong
  watchable-diorama effect.
- **Playability/readability**: main problem is identity at a glance — at
  regional zoom many towns have similar wall scale, density, field blobs, road
  treatment. Settlements aren't visually distinct in role (market town,
  monastery town, river-mill village, frontier fort, mining, fishing, failed
  hamlet).
- **Medieval authenticity**: weakest immersion-breaker now is **the absence of
  plot/street logic inside and around settlements.** Fields helped massively but
  exposed the next missing layer. Buildings still cluster as attractive sprite
  compositions rather than growing from roads, burgage plots, yards, lanes,
  gates, churches, mills, commons. The world says "medieval," the settlement
  grammar still sometimes says "placed assets."

## Next direction (codex's sharpened order)

**#1 next: true long burgage plots** — road-front parcels first, then place
houses, workshops, gardens, sheds, wells, pens, and rear fields INSIDE them.
Best authenticity-per-effort; the missing connective tissue that makes roads,
fields, walls, and mills snap together.

Recommended order:
1. True long burgage plots [layout-algo]
2. Outside-gate suburbs [layout-algo] — loose extramural houses/inns/barns/
   smiths/chapels/market spillover along roads outside gates.
3. Strategic castle / high-ground siting [sim] — only AFTER plot logic, else
   castles become another impressive placed object.
4. Macro strategic overlay + settlement LOD identity [art]/[sim].

**One insertion, before or alongside burgage plots: settlement role
specialization** [sim] — give each settlement a dominant reason to exist (river
mill, bridge market, mining, abbey/church, forest hamlet, coastal/fishing,
frontier fort), then bias buildings/fields/walls/roads from that role. Helps
both readability and medieval plausibility quickly.

Bottom line: fields/walls/mills were the right move and they worked. The next
leap is not more decoration; it's making every house, road, wall, field, and
mill feel like it belongs to the same land-use grammar.
