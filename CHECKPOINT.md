# Emberfall — Checkpoint

**Date:** 2026-06-12 · **State:** Phases 1-3 complete + treaties & tribute,
zh localization, Gemini art-audit workflow, **settlement-scale rework**
(procedural building clusters, zoom bands, action icons, activity overlays,
terrain decor/grading/4× bake, walls with dedicated vertical art, repo
hygiene: CLAUDE.md + lint + CI + cluster tests) · **64/64 tests · lint clean ·
stress bit-identical ~0.4-0.6ms/day · 164 settlements @ ~150fps** · pushed
(see git log) · per-session details in `docs/sessions/`

A browser idle civilization aquarium: Vite + TypeScript + PixiJS 8 + Vitest.
`npm install && npm run dev` from a clean checkout. Conventions and sacred
invariants live in `CLAUDE.md` — read it before changing sim or pipeline code.

## What exists right now

- **Simulation** (Pixi-free, deterministic, save/load bit-identical):
  160×100 seeded world, 9 biomes, rivers; 5-16 civs with full diplomacy
  (trade/alliance/rivalry/war, treaties + tribute, truces), settlements
  camp→village→town, 10+ emergent events (famine, plague, migration,
  skirmish/capture, schism, wildfire, flood, golden age, collapse→ruins),
  civ rebirth from ruins, derived road network with caravans, chronicle
  (en/zh re-renderable templates), biographies, history panel, inspector.
- **Rendering**: settlements are procedural building clusters from 26 piece
  sprites (tents→walled towns with hall/market/lamps; ruins as broken
  pieces; substitution chains while art is missing; season/weather tinting);
  zoom bands (macro glyph layer with war fronts + trade flows ↔ clusters ↔
  citizens with per-state action icons); terrain baked at 4× per season
  (LRU 2) with biome grading + edge fog; decor scatter incl. landmark
  formations; two-pass night with per-building window lamps; activity
  overlays (scaffolds, caravan trails, crisis glyphs).
- **Showcase**: attract mode, cinematic camera, cinema mode, world story,
  seed gallery (8 curated), stress mode (`?stress=1`).
- **Music**: 9 Suno tracks, seasonal/night/mood logic; boot theme disabled
  by default (`audio.playBootTheme`).
- **UI**: bilingual en/zh everywhere, Esc settings menu (styled, hotkey
  grid), icon set (game-icons.net CC BY, see `icons/ATTRIBUTION.md`).
- **Probe API** (`?probe=1`): `window.__emberfall` — advanceDays, centerOn,
  setAmbient, stepAgents, layers(), weatherAt — all headless scripts use it.

## Source map

```
src/config/   balance.ts (ALL tuning incl. audio+render), terrainConfig, civConfig, seedGallery (GENERATED)
src/core/     types.ts, rng.ts (seeded PRNG + hash2)
src/sim/      simulation.ts + resources/growth/diplomacy/treaties/territory/events/
              chronicle/founding/agents/weather/time/rebirth/roads — Pixi-free
src/render/   renderer, camera, terrainLayer (4× RT bake), settlementLayer +
              settlementCluster (layout engine), macroLayer (strategic band),
              decorLayer, citizenLayer (+action icons), roadLayer, territoryLayer,
              markerLayer, atmosphere, textures (fallbacks + piece/decor loading)
src/showcase/ interest, director, stress
src/audio/    music.ts
src/ui/       hud, menu, civPanel, inspector, chroniclePanel, historyPanel,
              biographyPanel, worldStory, seedGallery, debugOverlay, icons, i18n
src/persist/  save.ts
test/         12 suites / 64 tests (sim + cluster layout engine)
scripts/      lib/browser.mjs (shared probe boilerplate), gemini-cli.mjs
docs/         art-audit/ (battery + Gemini reports), sessions/ (work logs)
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev / build / test / typecheck / lint / format` | standard gate |
| `npm run art:shots` | 12-shot deterministic battery + QA layer assertions (needs dev server; `BASE`/`SEED`/`OUT` env) |
| `npm run art:audit` / `art:review` | Gemini critique → `docs/art-audit/GEMINI_*.md` / before-after verdict |
| `node scripts/process-assets.mjs` | raw art+music → `public/assets/` (folder map in script header; prompts in `ASSET_PROMPTS.md`) |
| `npx vite-node scripts/longrun.ts` | 10-year headless balance probe |
| `npx vite-node scripts/curate-seeds.ts` | re-score seeds → regenerates seed gallery (run after balance changes) |
| `node scripts/verify-{roads,stress,i18n,biography}.mjs` | feature probes (need dev server; pass `BASE`) |
| `node scripts/probe-cluster-perf.mjs` | late-game fps probe (year 100) |
| `npx vite-node scripts/{rebirth,treaty}-probe.ts` | century-scale sim probes |

## Known limitations

- Non-caravan agents walk straight lines; fights visual-only; citizens can
  walk over cluster rooftops (no building collision)
- River T-junctions / 2-wide river blobs fall back to the straight tile
- Single manual save slot
- Terrain tiling repetition only mitigated (landmark decor) — real fix is
  more tile variants per biome (next art round, spec TBD in ASSET_PROMPTS)
- Road rendering is still thin dirt strokes; clips under wall pieces
- Macro-night glow could clamp harder on dense late-game maps
- Harshest seeds (48/99) can end at ~2 strong civs over 150y (acceptable);
  a world that burns all 16 civ slots stops rebirthing
- Browser throttles when the window is minimized

## Session logs

Per-session details (what shipped, verification, gotchas) live in
`docs/sessions/<date>.md`. Add a section there each session; keep this file
to live state only.

Note: `.mcp.json` registers a Playwright MCP server (msedge, headless); it
can wedge after HMR reloads — the `scripts/*.mjs` probes are the reliable
fallback. MCP output goes to gitignored `.playwright-mcp/`.
