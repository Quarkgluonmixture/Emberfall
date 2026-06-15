# Emberfall Review 6: Role Grammar + Castle Keep

Screens: review-region, review-town2 (Emberreach, mid), burg-market-river
(Moormarch), burg-fort (Aldergate, with keep), burg-abbey (Fernhaven). gpt-5.5
high-reasoning, multimodal. Seed 48, year 6, noon.

## A. Did it land? — yes, mostly

Role grammar is legible at close and mid zoom.

- **Market** lands best. Moormarch reads as a proper market town (wall, gate,
  widened central space, stalls, road convergence, burgage edges); Emberreach a
  richer road town. Long plot strips are a real improvement — owned town land,
  not decorative clutter (some strips still blend into crop patches).
- **Fort/castle**: yes — the stone keep does the job; Aldergate has a hard
  military identity that was missing. Muster yard reads (though crowd density
  partly buries it). Still fake: a castle in PLAN but not yet a lordly seat in
  LANDSCAPE — sits flat beside forest/shore, reads "fortified town with a keep
  asset" not "strategic castle controlling terrain."
- **Abbey**: closest-but-weakest of the three. Reads religious (church/
  churchyard) but not strongly as a cloistered precinct — enclosure too soft,
  quadrangle/cloister logic not obvious, crowd overwhelms the sacred/ordered
  feeling. "Church village with many people," not "monastic precinct."
- **Forest**: least separable — reads as settlement-in-trees, not a distinct
  civic/economic role.

## B. Three-axis read
- **Visual**: much stronger; the keep raises the ceiling. Best image is
  Emberreach (road town + walls + suburbs + farms + neighbors support each
  other).
- **Playability**: close-up role readability improved, but **macro readability
  is the weak layer** — at region distance settlements collapse into "walled
  blob / village blob" unless you already know the role. The idle camera spends
  a lot of time at this zoom, so role identity needs to survive there.
- **Medieval authenticity**: much better grammar (burgage strips, gate suburbs,
  market widening, fort core). Least authentic now: too-regular field patches,
  very orthogonal enclosure geometry, intense population clustering.

**Single most immersion-breaking thing now: citizen visual density.** People are
oversized and too numerous — towns become RTS rally points. Hurts all three axes
(hides layouts, harder to read, breaks the lived-in illusion).

## C. Best next step

**Do (b) settlement LOD identity next — [layout-algo] / render-only.** The
close-up grammar has landed enough to prove the direction; the bigger remaining
problem is the aquarium view needs to read from region distance. Market / abbey
/ fort / forest should be distinguishable before zooming in (role silhouettes/
markers: market = square/road-cross emphasis, abbey = church/cloister mass, fort
= keep/tower dominance, forest = timber/clearing logic).

After that, castle-on-high-ground [sim] — makes the keep socially/strategically
medieval, not just visually castle-like.

Specific queue:
1. [layout-algo] Lower visible citizen density, especially inside walls/abbeys.
2. [layout-algo] Macro role silhouettes/markers for settlement LOD.
3. [sim] Site castles/lordly seats on high ground, river crossings, coastal
   approaches, passes, border pressure points.
4. [layout-algo] Strengthen abbey enclosure (clearer cloister square, calmer
   inner precinct, more separation from lay houses).
5. [layout-algo] Break field patch regularity (ownership strips, furlongs,
   road-facing strips, irregular edges).
- [art] No urgent blocker — the keep solved the biggest missing asset. Abbey
  cloister/wall/garden art could help later, but layout can carry most first.
