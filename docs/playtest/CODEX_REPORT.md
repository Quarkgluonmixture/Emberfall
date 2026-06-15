# Emberfall Playtest Report - Codex - 2026-06-15

## Method

The in-app Browser connector was unavailable in this session (`iab` failed to attach), so I used the allowed fallback: Playwright/headless Edge against `http://localhost:5173`, the deterministic `npm run art:shots` battery, source inspection, and read-only probes.

Evidence used:

- Fresh battery: `docs/art-audit/current/01-macro-day.jpg` through `12-autumn.jpg`; `npm run art:shots` passed with no console errors and QA green.
- Extra shots: `docs/playtest/shots/live-*.jpg`, `zoom-*.jpg`, and `ui-*.jpg`.
- Probe data: seed 48 at approx years 51, 101, 151 via `window.__emberfall.advanceDays`; `npx vite-node scripts/longrun.ts`; `node scripts/probe-cluster-perf.mjs`.
- `scripts/rebirth-probe.ts` and `scripts/treaty-probe.ts` did not complete under the available timeout; I do not rely on them except to note that the scripts are too slow here.

## (A) Gameplay

### 1. [major] The first minutes look alive, but the player does not learn causality

Evidence: `docs/playtest/shots/live-00-boot.jpg`, `live-01-early-12s.jpg`, `live-02-speed2-growth.jpg`.

The opening is visually strong: camps appear, the map claims itself, the chronicle immediately names peoples and places. The problem is that it reads like a beautiful screensaver more than a simulation the player can parse. Civ population numbers climb, settlements upgrade, borders appear, and the chronicle announces outcomes, but almost nothing explains why Briarcairn grows, why a settlement is founded where it is, or why a rivalry starts.

Concrete fixes:

- Add a lightweight "cause line" for selected chronicle events: `Briarcairn became a town because food surplus + trade road + high morale`. Do not make it a tutorial paragraph; make it a one-line inspector/history affordance.
- Make event rings clickable for a few seconds and open the relevant settlement/civ with cause data. The event feed is rendered in `src/ui/chroniclePanel.ts:24`; map FX are already event-driven, so the missing layer is selection/context.
- Add a first-run camera sequence that follows 3 events: founding, first village/town, first rivalry/war. The controls exist in `src/main.ts:319`; the director/attract system can probably carry this without a new mode.

### 2. [blocker] The macro arc is still too sleepy for an idle civilization watcher

Evidence: seed 48 probe, plus `docs/art-audit/current/09-war-crisis.jpg`.

Seed 48 at approx year 151: 4 civs alive, 3 civ falls, 2 rebirths, 162 settlements, 59 ruins. That is technically "rise/fall/rebirth," but the ratios expose the weakness: 267 wars, 116 treaties, 26 captures, 3 civ falls, 2 rebirths. The world produces constant diplomatic churn but few irreversible consequences. By approx year 101, there was only 1 civ fall and 1 rebirth despite 189 war declarations and 87 treaties.

This makes the game feel like it is simulating argument more than history. Wars are visible, but they usually resolve into reset conditions. Treaties are useful, but right now they function like anti-climax machines.

Code homes:

- Treaty knobs: `src/config/balance.ts:135-157`.
- Capture thresholds: `src/config/balance.ts:203-207`.
- Last-stand morale floors: `src/config/balance.ts:302-311` and `src/sim/simulation.ts:168-183`.

Concrete fixes:

- Add a "decisive war" phase after prolonged war: after `warExhaustionDays`, either peace becomes expensive or capture pressure rises. Do not just globally nerf treaties; gate the change by war age, military ratio, and border losses.
- Replace hard last-stand morale floors with decaying floors. A 1-settlement civ should not instantly evaporate, but if it has lost wars, paid tribute twice, and has no food base, it should be able to die.
- Add forced terms other than peace: vassalage, border cession, city independence, dynasty split. A losing civ surviving is fine only if the map changes.
- Give conquest an objective track: "war score" or "siege pressure" that the player can see. Capture events should feel earned, not like rare RNG spikes.

### 3. [major] Growth is too front-loaded; the game spends too little time in its most readable era

Evidence: `npx vite-node scripts/longrun.ts` output and `live-00-boot.jpg` to `live-03-speed3-events.jpg`.

The 10-year longrun ended with 65 settlements, many already towns. In the live pass, the world moved from founding camps to a dense settlement map very quickly. That is impressive for screenshots, but it burns through the best onboarding phase. Camps and early villages are when cause/effect is easiest to understand; towns arrive before the player understands what a town means.

Concrete fixes:

- Stretch the first 3 years: slower early migration, slower town upgrade, or tier-specific resource gates that require trade/roads before town.
- Give camps/villages more visual and mechanical identity. If camp to village to town is the core fantasy, each tier needs at least one distinct pressure: survival, expansion, specialization.
- Consider a "settlement ambition" meter in inspector: food, wood, morale, road access, danger. This makes upgrading legible without adding player control.

### 4. [major] The chronicle saga pass is directionally right, but the history panel still reads like an event dump

Evidence: `docs/playtest/shots/ui-history-live.jpg`, `ui-history-probe-y6.jpg`; code at `src/ui/chroniclePanel.ts:20-31`, `src/ui/historyPanel.ts:30-48`.

Filtering famine/plague out of the written feed is the correct move. The live feed is no longer buried in sickness spam. However, the history panel is now dominated by repeated towns/rivalries: by approx year 51 on seed 48, the kept chronicle had 327 town events, 196 collapses, 91 wars, 57 rivalries, 45 treaties, and 7 captures. It is cleaner, but not yet a saga. It is a ledger.

Concrete fixes:

- Add a "Saga" tab/filter for only importance-3 plus civFell/rebirth/capture/war/treaty/goldenAge. Keep the current importance>=2 list as "Full record."
- Collapse repeated event types per year: "7 towns rose", "4 rivalries formed", expandable on click.
- Add civ filters and clickable entries that center the map on the event. The panel currently renders static HTML in `src/ui/historyPanel.ts:39-48`.
- Add decade summaries generated from existing state: dominant civ, wars started/ended, cities captured, civs born/fallen.

### 5. [major] War is visible, but not readable as a tactical situation

Evidence: `docs/art-audit/current/09-war-crisis.jpg`, `docs/playtest/shots/live-03-speed3-events.jpg`.

The civ panel lists enemies, and the map shows border colors and occasional rings, but I cannot tell who is winning without reading the numbers and waiting. The war-crisis shot has red/green border tension and settlement markers, yet no clear front, pressure, direction, or stakes.

Concrete fixes:

- On macro zoom, show front arrows or pressure wedges at active war borders. The macro layer already owns this band (`src/config/balanceRender.ts:126-130`).
- Add war tooltips in civ panel: "war with X, 83 days, losing military 0.42x, 2 frontier towns at risk."
- Make capture/siege pressure visible on towns under threat. The existing status glyph system could carry it.

### 6. [major] Idle-watch loop needs better "come back later" payoffs

Evidence: year 51/101/151 probe summaries and `ui-worldstory-probe.jpg`.

The world is satisfying to leave running visually, but when I return, the game has not packaged what changed. I need to infer from chronicle entries and civ populations. In an idle aquarium, the return moment is crucial: "what happened while I was away?" Emberfall currently says "many events happened."

Concrete fixes:

- Add a return digest: civs that rose/fell, borders changed, biggest city, wars resolved, newest ruin/rebirth.
- Add a timeline scrub or "last 10 years" map replay using existing chronicle coordinates.
- Let players pin a civ/settlement and get a mini biography delta since last viewed.

### 7. [minor] UI overlays stack awkwardly

Evidence: `docs/playtest/shots/ui-worldstory-history-stack.jpg`, `ui-seed-gallery.jpg`, `ui-settings-menu.jpg`.

History, world story, gallery, and settings can overlap in states that feel accidental. The world story ribbon sits over modal-ish panels; the bottom-left chronicle remains visible under some overlays but becomes unreadable. This is not catastrophic, but it makes the UI feel less intentional than the map.

Code homes:

- Hotkey toggles: `src/main.ts:329-335`.
- Escape only closes inspector/history/gallery in one branch, not world story: `src/main.ts:339-346`.
- World story rendering: `src/ui/worldStory.ts:74-79`.

Concrete fixes:

- Treat history/gallery/settings as exclusive modal layers; opening one should hide world story and dim/suppress chronicle.
- Escape should close world story too, or world story should be non-modal and never overlap modal panels.
- Keep the bottom world story ribbon out of the settings/gallery vertical footprint.

## (B) Visuals

### 1. [major] Territory borders are the biggest visual offender

Evidence: `docs/art-audit/current/01-macro-day.jpg`, `07-winter.jpg`, `09-war-crisis.jpg`, `12-autumn.jpg`, and `docs/playtest/shots/zoom-00-macro.jpg`.

The natural terrain and settlement art are painterly; the borders are tile-stair, neon-edged geometry. Winter makes this especially bad: green/red/orange outlines sit on snow like debug overlays. At macro, borders are useful; at mid and close, they fight the world art and make frontiers look like spreadsheet cells.

Code homes:

- Border rect extraction: `src/render/territoryLayer.ts:32-48`.
- Border rendering: `src/render/territoryLayer.ts:61-90`.
- Alpha knobs: `src/config/balanceRender.ts:103-105`.

Concrete fixes:

- Render borders as path contours, not per-tile rectangles. Even a marching-squares contour would be a large improvement.
- Separate strategic and scenic border styles: stronger at macro, much softer/dashed/terrain-tinted at mid and close.
- Add contested-border styling only where wars exist, instead of making every peaceful frontier equally loud.

### 2. [major] Close zoom is lively but visually noisy

Evidence: `docs/art-audit/current/06-close-citizens.jpg`, `docs/playtest/shots/zoom-04-action-icons.jpg`.

The close view proves the sim is alive: citizens move, work, trade, and cluster around towns. But the action icons become a yellow confetti layer, especially over green terrain and dense towns. I can tell "activity is happening," but individual state readability is poor. The wheat/work icon is especially dominant.

Code homes:

- Citizen fade and icon fade: `src/render/citizenLayer.ts:70-87`.
- Icon placement/tint/size: `src/render/citizenLayer.ts:150-157`.
- Icon size knob: `src/config/balanceRender.ts:131-135`.

Concrete fixes:

- Add a small dark circular/diamond backing behind action icons at close zoom.
- Reduce simultaneous icon count: show icons for selected/hovered settlement, crises, trade, and unusual actions; let routine working citizens be body animation only.
- Desaturate or civ-tint work icons so yellow does not compete with wheat fields, lamps, and event rings.

### 3. [major] Macro zoom wastes screen space and under-explains strategy

Evidence: `docs/playtest/shots/zoom-00-macro.jpg`, `docs/art-audit/current/01-macro-day.jpg`.

At the fully zoomed-out band, the map can sit inside a large black void depending on camera scale/framing. The glyphs are readable, but the screen composition says "debug overview" more than "strategic atlas." The macro layer also shows ownership and sites, but not enough relationship structure: trade, war pressure, and dominance do not pop as clearly as the civ list.

Code homes:

- Macro band thresholds: `src/config/balanceRender.ts:126-130`.
- Camera zoom clamp likely around `src/config/balanceRender.ts:29-30` and `src/render/camera.ts`.

Concrete fixes:

- Add a "fit world to viewport" macro floor so the map fills either width or height, with less dead margin.
- Add optional relationship overlays in macro: active wars, tribute routes, trade routes, newest collapses/rebirths.
- Scale down or fade decorative terrain detail farther at macro so borders/glyphs own the view cleanly.

### 4. [major] Roads still do not read as infrastructure

Evidence: `docs/art-audit/current/03-mid-day.jpg`, `05-close-settlement.jpg`, `10-town-large.jpg`, `docs/playtest/shots/zoom-02-clusters.jpg`.

Roads exist, but they are too faint compared with terrain texture, rivers, borders, and settlement walls. At mid zoom I often notice roads only after looking for them. That is a gameplay problem, because roads should explain growth and trade.

Code home: `src/render/roadLayer.ts:107-132`.

Concrete fixes:

- Increase road body alpha/width at mid zoom, especially for high-use routes.
- Add small bridge/gate accents where roads cross rivers or enter walls; this would also solve the "roads slice into town edges" feeling.
- Make trade roads visibly distinct from local paths, at least in macro.

### 5. [major] Night mood is good, but night readability is uneven

Evidence: `docs/art-audit/current/02-macro-night.jpg`, `04-mid-night.jpg`, `docs/playtest/shots/zoom-05-midnight-clusters.jpg`, `live-03-speed3-events.jpg`.

Night has a strong mood and the settlement lamps are a real improvement. The issue is information hierarchy. In some views, the world becomes a dark wash with orange town blobs and faint labels. The chronicle/feed over darkened terrain can become low-contrast. Event rings at night sometimes read as selection or disaster regardless of event type.

Code homes:

- Night grading: `src/config/balanceRender.ts:31-38`, `src/render/atmosphere.ts:91-95`.
- Settlement glows: `src/config/balanceRender.ts:113-117`.

Concrete fixes:

- Use a slightly lifted label/UI contrast at high darkness, not just world lighting.
- Clamp event ring alpha/glow at night or give event kinds more distinct silhouettes.
- Reduce settlement-wide glow further at macro and lean on per-building lamps.

### 6. [major] Seasons are attractive, but autumn and winter expose value/contrast problems

Evidence: `docs/art-audit/current/07-winter.jpg`, `11-summer.jpg`, `12-autumn.jpg`, `docs/playtest/shots/ui-seed-gallery.jpg`.

Summer/spring read best. Autumn turns forests, roads, town roofs, and earth into similar warm values. Winter is striking at first glance, but dark rocks/decor and bright snow make territory borders and town walls look pasted on. Rain/snow are atmospheric, but rain plus night strongly suppresses map readability.

Code homes:

- Season/weather grading in settlement layer: `src/render/settlementLayer.ts:20-21`.
- Weather particles: `src/render/atmosphere.ts:110-134`.

Concrete fixes:

- Add season-specific border alpha/color compensation; winter needs less saturation and more terrain integration.
- Push autumn forests either darker/cooler or more orange than the ground; right now values merge.
- In heavy weather, reduce territory fill and boost settlement labels/roads rather than dimming everything uniformly.

### 7. [minor] Settlement labels are useful but not always graceful

Evidence: `docs/art-audit/current/03-mid-day.jpg`, `05-close-settlement.jpg`, `docs/playtest/shots/zoom-03-citizen-fade.jpg`.

Labels are readable thanks to stroke, but they float over busy art and sometimes collide with walls/citizens. The typography is also more decorative than functional at dense zooms.

Code homes:

- Label style: `src/render/settlementLayer.ts:217-228`.
- Label fade: `src/render/settlementLayer.ts:313-319`.
- Label threshold: `src/config/balanceRender.ts:103`.

Concrete fixes:

- Give labels a tiny translucent backing only when over busy terrain or citizens.
- Reduce letter spacing at close zoom; decorative spacing hurts legibility on names like Briarcairn/Crowhollow.
- Hide labels for non-hovered minor settlements once citizens/icons dominate the close view.

### 8. [minor] Performance is acceptable but close to the edge for an idle game

Evidence: `node scripts/probe-cluster-perf.mjs` at year 100: mid 2.2x 52 fps, far 1.05x 47 fps, close 5x 47 fps in headless Edge.

This is playable, but idle games are often left running in background or on weaker machines. The close and far views both dipping under 60 suggests there is not much headroom for more FX/UI unless aggregation improves.

Concrete fixes:

- Profile macro border rendering and citizen/icon layers separately.
- Use icon/citizen aggregation in dense close views.
- Consider less frequent redraw or cached contours for territory once borders become smoother.

## Top 5 Impact-to-Effort Fixes

1. Add chronicle/history filters and yearly grouping (`src/ui/chroniclePanel.ts:24`, `src/ui/historyPanel.ts:30-48`). Biggest saga-legibility gain for modest UI work.
2. Soften/replace territory borders (`src/render/territoryLayer.ts:32-90`, `src/config/balanceRender.ts:103-105`). This is the largest visual quality win.
3. Add visible war stakes: war age, winner/loser, threatened towns, and siege/capture pressure. Start with civ-panel/history text before adding new sim mechanics.
4. Make wars occasionally decisive after age/pressure thresholds (`src/config/balance.ts:135-157`, `src/config/balance.ts:203-207`, `src/sim/simulation.ts:168-183`). The idle loop needs irreversible history.
5. Reduce close-zoom icon noise (`src/render/citizenLayer.ts:70-87`, `src/render/citizenLayer.ts:150-157`). Keep the life, remove the confetti.

## Bottom Line

Emberfall already looks like a world. It does not yet consistently read like history. The visual craft is strongest at settlement scale and weakest where game information is overlaid as hard geometry. The gameplay craft is strongest in the first spectacle of growth and weakest in the late macro arc, where war produces lots of motion but too little consequence. The next pass should be ruthless about two things: make the map explain why events happen, and make the simulation occasionally allow history to leave scars.
