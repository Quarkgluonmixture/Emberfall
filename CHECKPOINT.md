# Emberfall — Checkpoint

**Date:** 2026-06-11 · **State:** Phase 3 largely complete (glow fix, river bends, wildfire FX, tile equalization, civ rebirth, roads + caravans) · **All 48 tests green · stress bit-identical at 0.48ms/day**

A browser idle civilization aquarium: Vite + TypeScript + PixiJS 8 + Vitest.
`npm install && npm run dev` from a clean checkout, open `http://localhost:5173`.

## What exists right now

**Phase 1 — core simulation & game** (complete)
- 160×100 seed-deterministic world: 9 biomes, rivers, elevation/moisture/temperature; wildfire burns + spring regrowth recorded as terrain diffs so saves replay them
- 5 civilizations: population, food/wood/stone/knowledge/faith/culture/military, 2 culture traits each, territory, full relation matrix (neutral/trade/alliance/rivalry/war with border friction, incidents, war exhaustion)
- Settlements camp→village→town (gather radius widens by tier), seasonal food economy, morale; all 10 emergent events (famine, plague w/ spread+immunity, migration→new colonies, border skirmish+capture, succession, schism, wildfire, flood, golden age, collapse→**ruins on map**), civ fall
- Hybrid agents: aggregate sim authoritative; ≤600 visible citizens near camera (walk/work/fight/rest animations, civ-tinted, flee/trade/build behaviors)
- Chronicle (storybook prose, with x/y coords), History panel by year, inspector (tile/citizen/settlement/civ), civ roster, time controls (pause/1×/5×/20×), save/load + autosave (3 min, separate slot, Load picks newest)
- Determinism: single mulberry32 sim stream, state saved/restored; cosmetic systems use separate streams. Save→load→run is bit-identical (test-proven)

**Art pass** (complete — GPT-Image generated, processed by pipeline)
- Terrain: 4 season sheets × 9 biomes × 3 variants, baked at 2× per season
- Settlements (camp/village/town/ruins), banner, citizens (4 anim strips), glow, smoke, rain/snow — all with procedural fallbacks if any file is missing
- Raw exports had FAKE transparency (baked checkerboard) → pipeline chroma-keys via border flood-fill; bright assets (banner/smoke/glow/rain) were regenerated on solid black (`assets_src/raw/6/`) and extracted by dark-key / luminance-as-alpha

**Phase 2 — showcase layer** (complete)
- Attract mode (`A`, `?attract=1`): interest-scored auto-director, breaking-event interrupts, capitals/frontiers/wide-shot rotation, drift+push-in, any input exits
- Cinematic camera (eased flights, log-space zoom), cinema mode (`C`), screenshot (`P`), World Story overlay (`W`), seed gallery (`G`, 8 curated worlds, regenerate via script), event marker pulse rings, FPS cap (60/30/∞), polish (dual-layer glow, gusty weather, soft borders, fading labels)
- Stress mode (`?stress=1`): 100y × 2 runs → **bit-identical, ~0.36ms/day, year-100 world: 122 settlements / 34k pop, zero console errors**

**Music** (complete — see other-session notes in git log / ASSET_MANIFEST)
- `src/audio/music.ts`: theme-once at boot → seasonal base, night layer (hysteresis), chronicle-driven moods (war > disaster > goldenAge) with hold timers, 2.5s crossfades, 12s anti-thrash, autoplay unlock on first input, mute persisted (`M` / 🎵)
- 9 Suno tracks; mapping lives in `scripts/process-assets.mjs` MUSIC_MAP → `public/assets/music/`

## Source map

```
src/config/   balance.ts (ALL tuning incl. audio), terrainConfig, civConfig, seedGallery (GENERATED)
src/core/     types.ts (all data shapes), rng.ts (seeded PRNG + hash2)
src/world/    worldgen.ts (fBm, biomes, rivers), world.ts (tile helpers)
src/sim/      simulation.ts (day-tick orchestrator), resources/growth/diplomacy/territory/
              events/chronicle/founding/agents/weather/time/rebirth/roads — Pixi-free,
              deterministic
src/render/   renderer, camera (+flights), terrainLayer (RT bake, river pieces, variant
              equalization), roadLayer, territoryLayer, settlementLayer (zoom-damped
              glow/smoke/ruins), citizenLayer (anims), markerLayer (+wildfire FX),
              atmosphere (night/dusk/particles), textures (procedural + asset loading)
src/showcase/ interest.ts (shot scoring, tested), director.ts, stress.ts (tested)
src/audio/    music.ts
src/ui/       hud, civPanel, inspector, chroniclePanel, historyPanel, worldStory,
              seedGallery, debugOverlay
src/persist/  save.ts (manual + autosave slots; world regen from seed + diffs)
test/         10 suites / 48 tests: worldgen, resources, growth, diplomacy, events,
              save, interest, stress, rebirth, roads
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev / build / test / typecheck` | standard |
| `node scripts/process-assets.mjs` | raw art+music (`assets_src/`) → `public/assets/` (chroma-key, resize, music rename) |
| `npx vite-node scripts/longrun.ts` | 10-year headless balance probe (pop, tiers, event histogram) |
| `npx vite-node scripts/curate-seeds.ts` | re-score 120 seeds → regenerates `src/config/seedGallery.ts` |
| `node scripts/smoke.mjs` / `smoke-showcase.mjs` | headless-Edge visual verification (needs dev server running) |

`assets_src/raw/` and `assets_src/music/` are gitignored sources-of-truth kept
locally; processed outputs in `public/assets/` are committed, so a clean clone
is fully playable.

## Known limitations

- Non-caravan agents still walk straight lines (caravans follow roads; field
  walks are short enough not to matter); fights visual-only
- River bend/mouth tiles wired (2026-06-11 asset session); T-junctions and 2-tile-wide river blobs still fall back to the straight tile
- Single manual save slot
- Reborn civs survive long-term in only ~2/5 of 360-year worlds (seeds 5/48/99
  still converge to 1–2 empires; peace treaties in phase 4 would help)
- A world that burns all 16 civ slots (MAX_CIVS) stops rebirthing — "the age
  of legends ends"; acceptable for now
- Curated seed descriptions' "vitality" lines reflect current balance constants — re-run `curate-seeds.ts` after balance changes
- Browser throttles when the window is minimized (fine on a visible second monitor)
- Music mood pairing for the 4 non-season tracks was inferred from titles + loudness — swap in MUSIC_MAP if any feels wrong

## Playtest 2026-06-11 (headless screenshots, seed 48, ~15 game-years)

Drove the game with `scripts/play-session{,2,3}.mjs` (new; need dev server,
write PNGs to `scripts/out/play/`). Zero console errors across all runs.
Sim is lively: by year 6 there were 2 wars, plagues, famines, floods, village
promotions; chronicle prose + history panel + inspector (citizen/civ) +
attract mode all work as designed. **Daytime close zoom looks great** in all
seasons — crisp tiles, citizens visibly working. Medium-zoom night reads as a
pretty "city lights" map.

Found problems, in priority order:

1. **Night glow washout (P0)** — settlement glow scales with world zoom; at
   close zoom each night glow becomes a screen-filling fireball that hides the
   settlement, terrain and citizens (see `20-cycle-08.png`); at far zoom many
   glows merge into orange mush that erases territory reading
   (`08-late-game.png`). Fix: attenuate glow alpha/size as a function of zoom
   (clamp in screen-space), keep current look only near the medium zoom it was
   tuned at.
2. **Tile-variant patchwork (minor)** — at close zoom the 3 luminance-varied
   tile variants form visible rectangular patches (clearest in autumn,
   `20-cycle-02.png`). Consider normalizing variant brightness.
3. Known limitations confirmed in play: straight-line agents, one river
   orientation, no rebirth after civ falls.

## Phase 3 — "The Living World" (largely DONE, see sim session below)

1. ~~Glow fix~~ ✓ 2. ~~Roads + caravans~~ ✓ 3. ~~Ruins resettlement + civ
rebirth~~ ✓ (plus river bends + wildfire FX from the asset session, and
tile-variant equalization). Both playtest problems below are fixed.

Deferred to phase 4: minimap, peace treaties & tribute, timeline scrubber,
per-civ biographies, idle auto-attract, camera cuts, general-agent
pathfinding (only caravans use roads).

## Asset session 2026-06-11 (parallel with the playtest above)

- **River bends + mouths**: `assets_src/raw/8/` → `terrain_river_<season>.png`
  (3 variants × bend/mouth rows); `terrainLayer.riverPiece()` picks
  straight/bend/mouth + rotation from orthogonal neighbors at bake time.
- **Wildfire flame FX**: `assets_src/raw/7/` → `fx_wildfire.png` (4-frame
  luma-alpha strip); `MarkerLayer` spawns a deterministic flame cluster on
  wildfire/wildfireWild chronicle events (~6 s, cosmetic only).
- **27 UI/event icons** fetched from game-icons.net (CC BY 3.0) into
  `public/assets/icons/` (`event_<kind>.svg` matches sim event kinds 1:1,
  season_*, ui_*); white-on-transparent SVG, attribution in
  `icons/ATTRIBUTION.md`. Wired into HUD/chronicle/history via `src/ui/icons.ts`
  (visible in the sim session's verification screenshots).
- Probes: `scripts/probe-river.ts` / `probe-fire.ts` print bend/mouth/wildfire
  coordinates for a seed; `scripts/probe-visuals.mjs` screenshots them
  (boot camera centers on the first capital at zoom 2.2).
- Typecheck + 40/40 tests green; probe run had zero console errors.

## Sim session 2026-06-11 (parallel with the asset session)

All verified: typecheck ✓, 48/48 tests ✓, stress `?stress=1` **bit-identical**
at 0.477ms/day (122 settlements / 32k pop at year 100), zero console errors.

- **Night glow fix (P0 from playtest)** — three damps in `settlementLayer`:
  zoom damp past `glowRefZoom` (close-ups show lamps, not fireballs), far
  floors below `glowFarZoom` (distinct dots instead of orange wash), and a
  1/√density damp by settlement count so dense late-game maps stay readable.
  Population size contribution clamped. All knobs in `balance.render`.
- **Tile-variant equalization** — `terrainLayer.variantGains()` measures each
  art variant's mean luminance via `extract.pixels` at first bake and tints
  variants toward their biome mean (clamped 0.85–1.2); kills the patchwork.
- **Civ rebirth + ruins resettlement** (`src/sim/rebirth.ts`, tested) — when
  civs < 5, after a cooldown, a new culture rises from a quiet unclaimed ruin
  (with ≤2 civs alive, also from claimed ruins far from settlements). Reborn
  civs: 80 pop, may inherit a fallen civ's trait, open trade with the nearest
  neighbor, and get grace years (no war via diplomacy clamp, plague immunity,
  morale floor). Any civ down to ≤2 settlements keeps a last-stand morale
  floor — this alone cut civ falls on some seeds from 13 to 2. Migration
  prefers mossy (1y+) ruins; `resettleRuin` chronicle kind. New SimState
  fields `lastRebirthDay`, `Civilization.foundedDay` (old saves default 0).
  Probes: `scripts/rebirth-probe.ts`, `rebirth-autopsy.ts`.
- **Roads + caravans** (`src/sim/roads.ts` + `render/roadLayer.ts`, tested) —
  derived (never saved) road network rebuilt every `roads.recalcDays`:
  per-civ spanning tree + trade-pair links, A* with terrain costs (fords
  cost 6, passes 30) and a 0.5× discount on existing road tiles so routes
  merge into trunks. Rendered as jittered dirt strokes (width/alpha by usage
  level) between terrain and territory; re-baked only on `roadsVersion`
  change. Trading agents follow `state.roadPaths` waypoints — visible
  caravans on roads. `scripts/verify-roads.mjs` screenshots the network.
- Seed gallery regenerated (all 8 picks now keep 5 civs alive).

Note: `.mcp.json` now registers a Playwright MCP server (msedge, headless) so
future sessions can drive the game interactively instead of via one-shot
scripts; dev server may land on 5174/5175 if older instances hold 5173.
The MCP browser can be flaky after HMR reloads — kill stale
`ms-playwright-mcp` Edge processes if it reports "browser already in use";
the `scripts/*.mjs` probes are the reliable fallback.
