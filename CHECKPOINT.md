# Emberfall — Checkpoint

**Date:** 2026-06-11 · **State:** Phase 2 complete (core sim + full art pass + showcase layer + music) · **All 40 tests green · build passing**

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
              events/chronicle/founding/agents/weather/time — Pixi-free, deterministic
src/render/   renderer, camera (+flights), terrainLayer (RT bake), territoryLayer,
              settlementLayer (glow/smoke/ruins), citizenLayer (anims), markerLayer,
              atmosphere (night/dusk/particles), textures (procedural + asset loading)
src/showcase/ interest.ts (shot scoring, tested), director.ts, stress.ts (tested)
src/audio/    music.ts
src/ui/       hud, civPanel, inspector, chroniclePanel, historyPanel, worldStory,
              seedGallery, debugOverlay
src/persist/  save.ts (manual + autosave slots; world regen from seed + diffs)
test/         8 suites / 40 tests: worldgen, resources, growth, diplomacy, events,
              save, interest, stress
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

- Agents walk straight lines (no pathfinding; they ford rivers); fights visual-only
- River tile art has one orientation (no bends/mouths); wildfire has no flame FX (asset exists raw, unkeyable batch)
- No civ rebirth after a fall (rebuild happens via surviving civs' migration); single manual save slot
- Curated seed descriptions' "vitality" lines reflect current balance constants — re-run `curate-seeds.ts` after balance changes
- Browser throttles when the window is minimized (fine on a visible second monitor)
- Music mood pairing for the 4 non-season tracks was inferred from titles + loudness — swap in MUSIC_MAP if any feels wrong

## Phase 3 candidates

Roads forming along trade routes · A* pathfinding with fords/bridges · ruins
resettlement + civ rebirth · minimap · peace treaties & tribute · territorial
history timeline scrubber · per-civ biography pages compiled from the
chronicle · idle auto-attract after N minutes · camera cut transitions ·
wildfire flame FX · river bend tiles.
