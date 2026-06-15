I did not modify files because your instruction also said “Do NOT modify files.” Here is the content intended for `docs/playtest/CODEX_KCD.md`.

```md
# Emberfall KCD / Medieval Settlement Read

Touchstones: KCD's Rattay, Sasau, Skalitz, Talmberg, Merhojed, Uzhitz. The current Emberfall settlements are charming and readable, but they still read more like fantasy board-game encampments than lived-in medieval places.

## Highest-Impact Changes

1. Replace concentric house rings with a main road spine plus irregular branching lanes.
   This is the biggest authenticity win. Rattay, Sasau, Uzhitz, and Merhojed read through roads first, not circular planning.

2. Add burgage plots, yards, gardens, fences, and backs-of-houses.
   Medieval towns are not just houses placed near streets; they are parcels. Long narrow plots perpendicular to the road would instantly improve the read.

3. Add church/churchyard as a major separate landmark.
   The shrine/well is too small and central. A medieval town or village needs a large church, churchyard wall, graves, and a spatial relationship to the settlement.

4. Add outside-gate sprawl, fields, mills, and terrain-specific siting.
   The regional view needs productive land and messy expansion: suburbs along roads, strip fields, commons, riverside mills, and castles on defensible high ground.

## Gaps And Fixes

### 1. Street Pattern Is Too Radial / Concentric

Gap: In Image #1, the walled town uses organic rings around a central market. It looks pleasing, but not very KCD-medieval. Real towns more often grew along a through-road, with lanes splitting off irregularly toward gates, church, river, castle, mills, or fields.

Fix [layout-algo]:
Generate a primary road spine through the settlement first. Place gates on the road endpoints. Add 2-5 branching lanes at uneven intervals, with curved but purposeful routes. Houses should front these streets, not orbit the center. Reserve ring placement only for rare planned/fantasy towns.

### 2. Missing Burgage Plots / Tofts

Gap: In Image #1, houses are packed as objects in a cluster. Image #2 village huts also sit as loose sprites. Neither shows the medieval parcel logic: narrow street frontage, long fenced yards behind, sheds, gardens, animal pens, woodpiles, and workshops.

Fix [layout-algo]:
For each street-facing house, generate a rectangular or tapered plot perpendicular to the lane. Plot depth should vary. Town plots should be narrow and dense; village plots wider and messier.

Fix [art]:
Add low fences, rear gardens, pig/goat pens, sheds, stacked timber, hayricks, privies, small orchards, drying racks, and workshop clutter.

### 3. Building Orientation Does Not Obey Streets Enough

Gap: In Image #1 and Image #2, many buildings feel arranged around a center rather than aligned to lanes. KCD settlements read strongly because house fronts face roads, yards fall behind, and lanes create frontage.

Fix [layout-algo]:
Orient building doors/facades toward the nearest lane or market edge. For villages, align huts loosely along a road or green. For towns, snap front walls to street frontage with slight rotation noise.

### 4. Market Square Is Too Central And Too Perfect

Gap: Image #1 has a central market square with hall, stalls, shrine, and well. It works as game readability, but real market spaces are often widened sections of the main road, triangular/irregular spaces at junctions, or spaces near gates/church/civic buildings. Rattay especially reads as an elongated town, not a bullseye.

Fix [layout-algo]:
Generate market squares as irregular widenings along the main street or at a gate-road/church-road junction. Use trapezoids, dogleg spaces, and offset halls. Keep some stalls spilling into the street.

Fix [art]:
Add market cross, butcher/fish tables, covered stalls, notice post, hitching rails, cart ruts, dung/mud patches.

### 5. Church Is Too Small / Too Central / Too Shrine-Like

Gap: In Image #1 and Image #2, the sacred feature is a shrine/well-scale object. Medieval towns and villages need a distinct church landmark. In KCD terms, Sasau and Uzhitz are memorable partly because church/monastic architecture anchors the settlement.

Fix [layout-algo]:
Place a church as a separate large footprint, often near but not identical with the market. Give it a churchyard boundary. In villages, church can sit on a slight rise or beside the green. In towns, it may sit off the market or near a gate.

Fix [art]:
Add church sprites in multiple sizes, churchyard walls, graves, lychgate, bell tower, crosses, cemetery trees.

### 6. Castle / Keep Is Missing As A Separate Power Center

Gap: Image #3 shows walled towns, but no distinct castle on high ground. KCD's Rattay, Talmberg, and Skalitz read through the relationship between town/village and lordly fortification. The castle should not just be another wall tile around the town.

Fix [sim]:
When terrain has hills/cliffs, reserve a defensible high-ground site for a castle, keep, motte, or fortified manor.

Fix [layout-algo]:
Connect castle to town by a road, bridge, stair lane, or gate. Sometimes castle touches the town wall; sometimes it sits above or beside it. Keep it spatially dominant.

Fix [art]:
Add keep, bailey wall, palisade/stone variants, lord's hall, stables, chapel, steep access path.

### 7. Walls Are Too Clean And Rectangular

Gap: Image #1's wall is readable but very regular. Image #3's towns look boxed. Medieval walls usually hug the built form and terrain irregularly, bulging around old property lines, slopes, roads, and water. Towers and gates are tied to roads, not just corners.

Fix [layout-algo]:
Generate walls after buildings/roads, using an irregular hull around dense town fabric. Add bulges, pinches, and terrain-following segments. Put gates where major roads enter/exit, not just south. Add posterns or river gates.

Fix [art]:
Add angled wall pieces, short jogs, ruined/older wall segments, ditch/earthwork edge, gate variants, wall-walk details.

### 8. No Suburbs Outside Gates

Gap: Image #3 shows settlements as contained packets. Medieval towns often had houses, inns, barns, smithies, gardens, and poor sprawl outside the gates along approach roads. This is especially important for KCD-style reads: life leaks beyond fortifications.

Fix [layout-algo]:
Place 5-25% of town buildings outside walls along gate roads. Use looser density, more workshops, inns, barns, and gardens. Roads should visibly continue through gate to suburb.

Fix [art]:
Add roadside inn, smithy, stable yard, charcoal hut, fenced garden plots, wayside cross.

### 9. Missing Density Gradient

Gap: Image #1 is dense everywhere inside the wall; Image #2 is loose everywhere. Real settlements grade from dense street frontage/core to looser edge plots, then gardens, paddocks, fields, and woodland.

Fix [layout-algo]:
For towns: dense frontage near market/main street, medium density on lanes, loose plots near walls/suburbs. For villages: houses cluster near road/green/church, then barns/yards, then fields.

Fix [sim]:
Tie settlement growth stages to density bands: hamlet -> village green -> street village -> market town -> walled town.

### 10. Villages Need Road/Green Logic, Not Spirals

Gap: Image #2's village is a loose spiral around well/shrine/granary. It reads cozy, but not like Merhojed or Uzhitz. Villages should be road villages, green villages, river crossing villages, or church/manor clusters.

Fix [layout-algo]:
Use village archetypes:
- street village: houses on both sides of a road
- green village: houses around an irregular common
- river/bridge village: mill + bridge + inn cluster
- church/manor village: church and manor offset from cottages

Fix [art]:
Add village green grass variation, pond, common well, fenced goose/common area, barns, threshing floors.

### 11. Fields, Commons, And Strip Farming Are Underdeveloped

Gap: Image #3 has terrain, forests, roads, and towns, but the land around settlements is not strongly agricultural. Medieval settlements should be embedded in fields, meadows, commons, orchards, and pasture.

Fix [sim]:
Generate agricultural halos around villages and towns, avoiding steep mountain/forest/water. Use strips radiating from roads and settlement edges.

Fix [art]:
Add strip fields, furrows, crop color variants, fallow strips, hay meadows, orchards, pasture fences, scarecrows, field paths.

### 12. Mills By Rivers Are Missing

Gap: Settlements are placed near rivers and bridges appear, but Image #3 does not show the classic river economy: mills, millponds, leats, footbridges, washer spots.

Fix [sim]:
When a settlement is near a river, reserve a downstream/upstream mill site reachable by lane.

Fix [art]:
Add watermill, mill wheel animation, millrace/leat, sacks, carts, small dock, fishing nets.

### 13. Roads Need Hierarchy And Gate Relationships

Gap: Image #3 roads connect centers, but roads should shape settlements before buildings are placed. Gates, markets, bridges, inns, and suburbs should all respond to road hierarchy.

Fix [layout-algo]:
Generate regional roads first: main trade road, local lanes, field paths. Town walls and gates then conform to these roads. Market appears on main road widening. Villages grow along roads rather than around a central object.

### 14. Towns And Villages Need Stronger Differentiation

Gap: Current difference is mostly walls vs no walls, dense rings vs loose spiral. The medieval difference should be economic, religious, defensive, and agricultural.

Fix [layout-algo]:
Town:
- main road through gates
- market widening
- burgage plots
- church/churchyard
- workshops
- suburbs
- possible castle/civic hall

Village:
- road/green/church/manor pattern
- larger yards
- barns and animals
- fields immediately around it
- maybe no market, or only a small green/well

Fix [sim]:
Give towns trade/defense functions and villages production/field functions. Let villages feed towns visually and mechanically.

## Opinionated Recommendation

Do not start by adding more decorative sprites. First change the settlement grammar.

The strongest next implementation pass should be:
1. Road-first settlement generation.
2. Street-facing buildings with burgage/toft plots.
3. Distinct church + churchyard placement.
4. Agricultural halo and outside-gate sprawl.

Those four changes would make Emberfall read far closer to KCD/medieval Europe even with the existing art set. New art should then support that structure: fences, plots, churches, mills, fields, and gate suburbs.
```