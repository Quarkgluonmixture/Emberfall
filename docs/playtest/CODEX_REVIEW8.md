# Emberfall Review 8: Where Next (settlement grammar mature)

Screens: macro-roles, review-town2 (Emberreach), castle-briarstead, burg-abbey
(Fernhaven), burg-market-river (Moormarch). gpt-5.5 high-reasoning, multimodal.
Seed 48, year 6, noon.

## A. Did review-7 land? — yes

The game now reads like an authored medieval world, not a tile generator.
- **Furlong fields**: mostly successful — angled strips read as open-field
  agriculture; ragged seams help. Still slightly "soft rectangular brush stamps"
  where parallel blocks share values; want more ownership logic (bend around
  lanes/commons/wet ground/walls/edges).
- **Castle siting + oriented keep**: working — Briarstead clearly commands the
  eastern mountains; keep-toward-commanded-side is legible, walls reinforce
  status. "Why it commands the heights" is less obvious at mid-zoom because the
  terrain elevation itself still looks flat.
- **Abbey cloister**: partially — right ecclesiastical identity, but the
  quadrangle isn't as instantly readable as castle/market; the central garth/
  ranges need stronger negative space + cleaner enclosure (crowd/roofs/fields/
  walls compete with the cloister form).
- **Macro glyphs**: big improvement — keep/spire/diamond/square/dot give the
  macro map real semantic shape; dark backing discs are the right call. Still a
  bit small vs terrain noise; role icons compete with civ-color markers.

**Newly exposed:** now that settlement grammar is good, the weak point is no
longer "does this look medieval?" but "can I understand what is happening
historically?"

## B. The big picture — the bottleneck has shifted

**Single biggest remaining gap: simulation/gameplay legibility.** Visually
Emberfall has crossed a threshold; the medieval grammar is no longer the
bottleneck. But as a watch-it-unfold aquarium you still can't easily follow
**why** things happen: why a civ declines/rises, why a war started, which road/
field/castle/abbey/market is strategically important, whether a town is starving/
overextended/pious/rebellious/rich/raided/unlucky. The map has the richness to
support these stories; the UI/sim layer isn't making them visible. The event log
+ civ panel are still too low-contrast and passive; the dominant glow rings
sometimes shout louder than the actual historical logic.

## C. Top 3 next

1. **[sim] Make rise/war/collapse causality visible** (maybe a few small icons).
   Unpark the sim items — now highest value. Clearer mid/late-game turnover:
   decisive wars, front-loaded growth, exhaustion, succession crises, famine,
   religious fracture, trade booms, border pressure. Key: not just deeper sim
   but VISIBLE causes — "this castle controls the pass," "this market enriched
   the town," "this civ collapsed after losing its grain belt."
2. **[ui] Replace passive logs with readable historical narration overlays.**
   Contrast/readability pass on event log + civ panel, but mainly HIERARCHY:
   surface 2-3 active story threads (war front, growth boom, succession/
   religious unrest, famine, founding, collapse). Click/hover a civ/settlement →
   cause chains ("Ashvale losing: manpower low, Thornwick raid pressure, market
   town captured"). The UI reports events; it doesn't yet explain the world.
3. **[layout-algo] Strengthen strategic geography.** Make roads visibly matter;
   passes, river crossings, coasts, fertile belts, border towns become the
   obvious reasons settlements thrive or fight — more legible consequence from
   the art that already exists.

Bottom line: review-7 landed; settlement art now has diminishing returns. The
next leap is making the world's history readable while it unfolds.
