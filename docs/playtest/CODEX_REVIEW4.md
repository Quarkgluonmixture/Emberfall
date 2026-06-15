# Emberfall Review 4: Settlement Roles + Burgage Plots

Screens: review-region, burg-market-river (Moormarch), burg-abbey (Fernhaven),
burg-fort (Aldergate), burg-forest-vill (Crowreach). gpt-5.5 high-reasoning,
multimodal. Seed 48, year 6, noon. Touchstone: KCD-style European medieval.

## A. Did roles + burgage land? — yes, unevenly

- **Market (Moormarch)** — strongest. Walled town + busy center + mill = "prosperous
  river market" instantly. Bent street visible, buildings front it. But the
  market/crowd/selection rings bury the plot grammar — can't cleanly see owned
  strips. Fix: [layout-algo] faint plot-boundary fences/hedges perpendicular to
  the street; keep rear-yard objects in long narrow strips not clumps; [art]
  1–2 tiny street-front stall/awning sprites.
- **Abbey (Fernhaven)** — role reads at a glance (large church, no market). But
  reads "church village," not "abbey" — no distinct sacred precinct. Wants
  enclosure, ordered yard, cemetery/orchard, service buildings, village pushed
  off the precinct. Fix: [layout-algo] reserve a precinct footprint before
  houses; houses orbit the precinct edge, don't crowd the door; [art] cloister/
  service-building variants.
- **Fort (Aldergate)** — wall + mountain siting helps; reads "defensive place."
  But interior is still a normal walled town; the role is carried by walls, not
  internal economy. Needs keep/hall/barracks/stables/training yard. **Hard art
  constraint matters: without keep/castle/barracks sprites this role plateaus.**
  Fix: [art] keep/tower-hall/barracks (the real blocker); [layout-algo] less
  domestic clutter; [sim] fewer civilians, patrol/muster behavior.
- **Forest hamlet (Crowreach)** — reads (clearing in woods, woodpile tofts) but
  shares too much house-road-village DNA. Should feel extracted from the forest:
  irregular clearing, timber yards, sawpit/charcoal pits, fewer fields. Fix:
  [layout-algo] non-rectangular clearing, buildings tucked into the edge; [art]
  sawpit/charcoal clamp/timber stacks; [sim] export wood/charcoal, grow clearing.

On **burgage plots**: now read as "street-front settlement" (major win) but not
yet as *owned strips* — rear yards lack visible parcel boundaries and consistent
depth; the land behind houses still reads like decorative clutter.

## B. Three-axis read
- **Visual**: still strong (painterly terrain, civ colors, variety, charming
  regional map). Main problem: **overdraw** — units, flags, role props, selection
  rings, walls, labels, roads compete in the same vertical slice; in close shots
  the sim actors obscure the settlement design.
- **Playability**: regional readability good; close-up role identity depends too
  much on zoom + inspection — player reads "town/walled/in-forest" but not
  "market/abbey/fort" instantly unless they know what to look for.
- **Medieval authenticity**: weakest is **settlements still feel like sprites
  arranged in a footprint rather than land tenure + institutions shaping space**
  — missing parcel boundaries, precincts, extramural sprawl, role-specific
  production yards.

**Single weakest thing overall: unit/crowd overdraw hiding the settlement
grammar** — the watcher sees a mass of bodies before streets/plots/yards. Fix:
[layout-algo] crowd dispersal anchors by role; [sim] loose activity zones, not
stacking at the core; [art] lower-opacity / smaller far-zoom unit treatment.

## C. Next direction (codex's revised order)

**#1: outside-gate suburbs + visible parcel boundaries** [layout-algo] — biggest
authenticity-per-effort without major new hero art. Medieval towns shouldn't
stop cleanly at the wall: roads thicken at gates; houses/stalls/inns/workyards
leak outside; fields respect approach roads; poorer/younger growth clings to
entrances. Concrete:
- [layout-algo] For each walled settlement, pick 1–3 active gates from road
  connections, then generate short extramural street segments with sparse
  houses/gardens/paddocks/market-spill/inns/workshops outside those gates.
- [layout-algo] Parcel-strip fences/hedges inside AND outside walls so burgage
  ownership becomes visible.
- [sim] Suburbs appear under population/wealth pressure; raids/war damage them
  first.
- [art] Mostly existing house/fence/yard/stall/garden/road sprites.

Revised order:
1. **Outside-gate suburbs + visible parcel boundaries** [layout-algo]
2. **Fort/castle identity pass once keep/barracks art exists** [art][layout-algo][sim]
3. **Settlement LOD identity overlays/silhouettes** [layout-algo][art]
4. **Mines/boats/trade-route enrichment** once sprites exist [art][sim]

Castle/keep comes after suburbs because new art is the blocker; a fort without a
keep only half-reads. Boats/mines also art-blocked (mines could start as terrain
decals near mountains).

Bottom line: roles landed; burgage plots landed directionally. The next
breakthrough is making the land around buildings legible as owned, used, and
historically pressured — plus taming crowd overdraw so the grammar is visible.
