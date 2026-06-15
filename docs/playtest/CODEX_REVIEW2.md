# Emberfall Review 2: Medieval Layout Pass

Screens reviewed: rev-town, rev-village, rev-region. Touchstone remains KCD-style European medieval settlement logic: roads, plots, church, productive hinterland, defensive siting, and messy growth over time.

## Honest Read

This is a meaningful jump toward a believable medieval town. The old "fantasy ring of houses around a center" read has been mostly broken. The town now has a recognizable south-gate-to-market spine, buildings that generally understand frontage, a large church/churchyard landmark, and enough rear clutter to suggest households instead of isolated sprites. At a glance, rev-town now reads as "a compact walled market town" rather than "a circular board-game camp." That is the most important improvement.

It is not fully KCD-convincing yet. The settlement grammar is now pointed in the right direction, but it still feels generated from decorative modules more than grown from roads, parcels, water, fields, and power structures. The close views have improved faster than the regional read.

## What Clearly Improved

### Town Scale

- rev-town: The main street is now legible. The south gate, market/hall area, and northern internal route give the eye a civic path through town instead of a bullseye.
- rev-town: Houses front the street more convincingly. The two-sided frontage gives the market core a denser, more urban feel.
- rev-town: The church is finally large enough to matter. It is visually grander than houses and stalls, and the churchyard wall/graves immediately push the scene toward European medieval town language.
- rev-town: Yard dressing helps a lot. Gardens, hay, fences, pens, and work clutter behind buildings make the town feel occupied by households, not just populated by citizens.
- rev-town / rev-region: The walls are clean and readable. The gatehouse/towers now communicate "formal town defense" instantly.

### Village Scale

- rev-village: The village feels distinct from the town: unwalled, looser, lower-status, and more rural.
- rev-village: Yard clutter and farm elements give the small settlement a better working-life read than the previous hut cluster.
- rev-village: The occasional chapel direction is correct. Even when small, a sacred/civic anchor helps separate a village from a generic camp.

### Region Scale

- rev-region: Settlement hierarchy is clearer now. Walled towns, loose villages, roads, coasts, forests, and mountains can be read as a political/geographic region.
- rev-region: Roads and bridges/fords are doing real work. The settlements look connected, and the geography no longer feels like towns dropped on a texture sheet.
- rev-region: Mountain massifs and terrain variation make siting more plausible, especially around Aldergate and the northern uplands.

## What Still Reads Wrong Or Fake

### Town Problems

- rev-town: The main street is improved but still too composed. It curves, but it reads like a designed S-curve rather than a road inherited from terrain, property boundaries, gate alignment, or desire lines. Fix [layout-algo]: add tiny doglegs, uneven widening, local pinches, and side lanes that imply older growth.
- rev-town: The market square is still too centrally perfect. It now sits on the street, which is better, but it remains a neat civic blob. Fix [layout-algo]: make the market an irregular widening of the main road, offset the hall, and let stalls spill into the street edge.
- rev-town: Burgage logic is only suggested, not structurally present. The yards are there, but they often feel like dressing around houses rather than long, narrow plots with consistent street frontage and rear land. Fix [layout-algo]: create actual plot polygons perpendicular to the street before placing rear clutter. Fix [art]: add stronger fence lines, rear sheds, privies, gardens, and plot-end clutter.
- rev-town: The church is the right idea but still awkwardly integrated. The spire poking past the wall is visually interesting, but the churchyard seems compressed against the defensive edge and not fully resolved as a sacred precinct. Fix [layout-algo]: give churchyards their own irregular enclosure and a lane/gate relationship; avoid making the church feel wedged into leftover wall space.
- rev-town: The walls still look like a rectangular enclosure placed around a new internal layout. The new road-first plan wants gates and walls to react to the street network, but the wall hull remains very regular. Fix [layout-algo]: generate an irregular wall hull after roads/plots, with gates where roads actually enter, not only where the box permits.
- rev-town: Frontage gaps and odd rear placements still appear. Some buildings sit at appealing painterly angles but do not clearly present doors/fronts to the street. Fix [layout-algo]: enforce facade-to-road orientation for street buildings, then use smaller rotation noise.

### Village Problems

- rev-village: The settlement still reads as a compact game cluster more than a road village, green village, or manor/church village. It needs a stronger generative archetype. Fix [layout-algo]: choose one village plan per settlement: road-side, green-side, river-crossing, church/manor, or scattered hamlet.
- rev-village: The yards are pleasant but float as local decoration. They do not yet form a rural production pattern. Fix [layout-algo]: attach every cottage to a yard/toft with a direction, access path, and rear work zone. Fix [art]: make pens, gardens, hay, and woodpiles align to those yard boundaries.
- rev-village: The nearby river/bridge/mountain context is strong, but the village is not exploiting it. There is no mill, ford economy, riverside work, or field edge. Fix [sim]: if a village sits near water, reserve a mill or washing/fishing/work site connected by a lane.
- rev-village: It lacks an agricultural halo. The village feels rural because it is small, but not because the land around it is visibly worked. Fix [sim]: place fields, meadows, orchards, pasture, and common land before or alongside village growth.

### Region Problems

- rev-region: The regional map is the biggest remaining authenticity gap. The towns are now better internally, but the countryside still lacks the medieval production layer: strip fields, paddocks, orchards, mills, barns, commons, and field tracks.
- rev-region: Walled settlements still appear as neat packets. Emberreach, Briarstead, Briarcairn, Greycairn, and Aldergate are readable but too self-contained. Fix [layout-algo]: add outside-gate suburbs and roadside sprawl along approach roads.
- rev-region: There is still no castle/high-ground power center. The region has defensible terrain, but no clear lordly site controlling road, river, coast, or town. Fix [sim]: site castles/manors on high ground near strategic roads, river crossings, or coast approaches.
- rev-region: Settlement LOD identity is still mostly wall/no-wall plus size. From a distance, towns need different silhouettes: church spire, market core, castle, fields, mill, suburb, road junction. Fix [art]: add LOD markers for church towers, mills, field bands, keeps, and road-gate suburbs.

## Top 3 Next Authenticity Wins

The current not-yet-done list is mostly right, but I would reorder it for authenticity impact:

1. Fields / agricultural halo [sim] [art]
   This is now the highest-impact next step. The close town has improved enough that the regional context is the weakest part. Medieval settlements should sit inside worked land. Strip fields, hay meadows, orchards, pasture, barns, and field lanes would instantly make rev-region feel less like isolated settlements on wilderness terrain.

2. Irregular wall hull + multiple road gates [layout-algo]
   The new road-first town exposes the old wall logic. The walls are readable, but they still feel rectangular and independent of the roads/plots. Irregular hulls, road-based gates, posterns, and wall bulges would make walled towns feel grown and defended rather than boxed.

3. Mill by the river [sim] [art]
   The mill is a fast, high-authenticity win because the region already has rivers, bridges, and villages near water. A mill ties settlement to economy, terrain, road access, and animation. It would especially help rev-village, where the nearby water currently feels underused.

Close fourth: true long burgage plots [layout-algo]. This is foundational, but the new yard pass already suggests plots enough that fields/walls/mills will probably create a bigger immediate before/after. For the next town-internal pass, burgage plots should jump back to the top.

## Is The Current Ordering Right?

Not quite. I would prioritize the not-yet-done list like this:

1. Fields/agricultural halo.
2. Irregular wall hull + multiple gates on roads.
3. Mill by the river.
4. True long burgage plots.
5. Outside-gate suburbs.
6. Castle on high ground.
7. Macro strategic overlay + settlement LOD identity.

Reasoning: fields and mills fix the countryside economy; irregular walls fix the biggest contradiction introduced by the new road-first town; burgage plots deepen the already-improved internal town grammar; suburbs and castles are excellent but need the road/wall/field grammar to land properly; macro overlay benefits most after those visible identity markers exist.

Castle could move above suburbs if the sim can already identify high-ground strategic sites. Visually, though, it risks becoming another decorative packet unless roads, fields, and hierarchy are stronger first.

## New Issues Introduced By This Pass

- Street too intentionally scenic [layout-algo]: rev-town's main street is curved, but it risks reading like a painterly promenade. Medieval roads should have awkwardness: pinch points, jogs, uneven market widening, and secondary lanes.
- Churchyard compression [layout-algo]: the church is correctly grand, but its precinct needs more breathing room and clearer access. It should feel like a civic-sacred space, not a landmark squeezed between market logic and wall logic.
- Yards as scatter dressing [layout-algo] [art]: the new clutter helps, but without visible plot boundaries some pieces float. The next improvement is not more yard objects; it is stronger parcel ownership.
- Walls contradict the new internal layout [layout-algo]: the settlement is now road-first inside but box-first outside. This makes the walls feel inherited from the previous layout system.
- Frontage is better but not strict enough [layout-algo]: some houses still appear placed for composition rather than for door-to-street access. A medieval read depends heavily on fronts, backs, and lanes being unambiguous.
- Village cluster still too object-centered [layout-algo]: rev-village has better dressing but still lacks a strong archetype. It should be visibly a road village, green village, mill village, or church/manor village.
- Regional scale now lags the close-up scale [sim] [art]: the town close-up has gained medieval grammar; the region needs productive land and economy so the improved settlements do not look like isolated dioramas.

## Bottom Line

This pass worked. The game is substantially closer to a real European medieval town/village read than it was in the KCD gap analysis. The biggest success is that roads, church, and yards now carry settlement meaning instead of merely decorating a cluster.

The next authenticity leap is not more houses or more citizens. It is countryside economy and growth logic: fields around settlements, mills on water, irregular walls around road-shaped towns, and parcels that make every house feel like it owns a piece of land.
