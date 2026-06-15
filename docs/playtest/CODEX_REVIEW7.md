# Emberfall Review 7: Thinner Crowds + Macro Role Identity

Screens: macro-roles (macro cluster), 01-macro-day (full region), burg-market-
river (Moormarch), burg-fort (Aldergate), burg-abbey (Fernhaven). gpt-5.5
high-reasoning, multimodal. Seed 48, year 6, noon.

## A. Did the fixes land?

**Crowd fix landed** — settlement plans are readable again: Moormarch's market
core / wall / river edge / mill / road bends, Aldergate's keep / muster yard /
gate / wall, Fernhaven's abbey cluster + farm plots are no longer swallowed by
people. Remaining crowd issue is not raw density but **visual competition**: the
large golden selection/attraction rings obscure the market town (Image 3) more
than the citizens now; the abbey's purple agents still make the precinct feel
busier than a contemplative center.

**Macro role glyphs — partially successful**:
- Fort reads best (keep/tower silhouette distinct).
- Abbey readable at close macro but risks "generic building marker" at full
  region unless you know the legend.
- Market diamond readable but competes with other diamond markers.
- Forest/conifer weakest — blends into actual forest terrain.
- Village square / camp dot functional but low personality.
The concept is right; the issue is scale/contrast — needs slightly larger
silhouettes, a dark outline/halo, or role-specific color accents in addition to
the civ tint. Discoverable up close (Image 1), too easy to miss full-region.

## B. Three-axis read
- **Visual**: strong; much better macro-to-close rhythm. Walled towns (3,4) are
  the strongest pieces; the keep is a major "this place matters" anchor.
- **Playability**: much improved. Remaining offenders are overlay-related — the
  event log + civ panel are very dark/low-contrast, and the selection rings
  (Image 3) too dominant for an idle aquarium view.
- **Medieval authenticity**: better at settlement scale, weakest at landscape-
  agriculture scale — fields still too modern/tile-regular; rectangular crop
  patches repeat like board-game tiles, not furlongs/strips/commons.

**Single weakest immersion-breaker now: field-patch regularity** — more
noticeable now that crowds no longer hide the terrain. Settlements got organic;
the farmland hasn't caught up.

## C. Next direction

**#1: break field-patch regularity [layout-algo]** (no new art). Improves all
three axes at once and benefits every settlement type.
- Replace repeated rectangular blocks with ownership strips, furlongs, curved/
  angled edges, partial enclosure.
- Let fields bend around roads, woods, streams, walls, village edges.
- Mix long narrow strips with small crofts near houses + larger irregular
  open-field patches farther out.
- Reduce perfect crop-grid repetition (esp. Fernhaven, Aldergate).

Then **castle-on-high-ground [sim]** (the keep deserves geographic logic), then
stronger **abbey enclosure [layout-algo]** third.
