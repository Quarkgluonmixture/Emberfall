# Emberfall Review 5: Suburbs + Crowd Dispersal

Screens: review-region, review-town2 (Emberreach, mid), burg-market-river
(Moormarch), burg-fort (Aldergate), burg-abbey (Fernhaven). gpt-5.5
high-reasoning, multimodal. Seed 48, year 6, noon.

## A. Did the fixes land? — yes, mostly

Overdraw is meaningfully improved: in Images 2–4 the footprint reads before the
bodies; Emberreach's through-road/gates/walled cores/extramural houses/fields
all stay legible. Glow fade helped — close zoom no longer feels like a UI aura.

- **Suburbs [layout-algo]**: yes — outside-gate spill makes walled towns feel
  less like sealed tokens; Aldergate's south-gate suburb especially convincing.
- **Crowd dispersal [layout-algo]**: yes — citizens lively but no longer erase
  the plan.
- **Parcels [layout-algo]**: partially — still reads like "rear decorative
  fences" more than true burgage-strip ownership. Make plots longer, narrower,
  more perpendicular to the main street.
- **Glow fade [art]**: yes — buildings/people carry the read.

Still fake / newly exposed:
- Suburbs still too tokenized (1–2 houses + paddock) — medieval extramural
  growth should hug the road outward in ragged linear clusters.
- Walled towns still too square/self-contained — planned enclosures, not grown/
  patched spaces.
- Citizens better dispersed but still visually overrepresented — reads like a
  festival/muster, not ordinary town life. Issue is now density/visual weight,
  not center-piling. [sim]
- Fields too patch-tile regular — a quilt of rounded rectangles. [layout-algo]

## B. Three-axis read
- **Visual**: strong; region (Image 1) is the best composition — coast, mountain
  belt, forest, borders, towns, roads read as a living map.
- **Playability**: improved; remaining issue is identity at a glance — market vs
  fort vs abbey still leans on the label + shared sprites.
- **Medieval authenticity**: better but still weakest — grammar is a bit "asset
  compound" rather than "place grown from road, church, water, lordship, field
  systems, defensive episodes."

**Single weakest immersion-breaker: the wall-and-street geometry is still too
regular and too self-contained.** Walled settlements should feel like older
villages wrapped, pinched, extended, spilled through gates — many still read as
square precincts with buildings placed inside.

## C. Next direction

**Clear #1 unblocked next step: make settlement identity come from street/parcel/
precinct grammar, using existing art. No new art required. Do this BEFORE
generating new sprites.**

- **Market**: main road widens into a market street / small triangle-square;
  stalls cluster there; burgage strips run back from that street; rear fences
  align into long owned plots.
- **Abbey**: church gets a precinct enclosure (existing fence/wall/yard art) +
  a garden/cemetery/orchard quiet zone; houses sit outside / along the approach,
  not evenly around the church.
- **Fort**: algorithmic identity even without keep art — strongest wall
  regularity, fewer civilian plots inside, one clear mustering yard, tighter
  gate control, more empty defended space near the entrance.
- **Forest-edge**: irregular clearings that bite roads/fields into the woodland
  edge instead of rectangular cutouts.

Improves all three axes at once and attacks the weakest issue without waiting on
art.

**Generate keep/barracks art now?** Not as the main task — generate soon but
don't pause the layout pass. A keep dropped into the current square compounds
helps but doesn't fix the "game enclosure" read. So:

- **#1 next fix: role-specific settlement layout grammar — [layout-algo], needs
  new art: NO.**
- **Art priority after that: keep/barracks/gatehouse set for fort/castle
  identity — [art], needs new art: YES.**
