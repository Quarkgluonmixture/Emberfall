# Emberfall — project conventions

Browser idle civilization aquarium: Vite + TypeScript + PixiJS 8 + Vitest,
pinned for **Node 18**. Read `CHECKPOINT.md` first every session — it owns the
live state. Per-session work logs go to `docs/sessions/`, NOT into CHECKPOINT
(keep it under ~150 lines). Multiple Claude sessions may work in parallel:
check `git status` for hot files before editing.

## Commands

| | |
| --- | --- |
| `npm run dev` | dev server; ports drift 5173-5175 — **read the Vite banner**, pass `BASE=http://localhost:<port>` to scripts |
| `npm run typecheck` / `test` / `build` / `lint` | the static gate |
| `npm run art:shots` | 12-shot deterministic battery + QA assertions (needs dev server) |
| `npm run art:audit` / `art:review` | Gemini art critique / before-after verdict |
| `node scripts/process-assets.mjs` | raw art+music (`assets_src/`) → `public/assets/` |
| `npx vite-node scripts/curate-seeds.ts` | regenerate seed gallery — **required after balance changes** |

Full script table in CHECKPOINT.md. Verify loop for any change: typecheck +
vitest + (render changes) `art:shots` battery + (sim changes) `?stress=1`
bit-identical check.

## Sacred invariants — break these and saves/replays corrupt

- **Determinism**: the simulation uses ONE mulberry32 RNG stream
  (`Simulation.rng`), saved/restored. NO `Date.now`, `Math.random`, or extra
  `rng` draws in `src/sim/`. Cosmetic systems (render, agents visuals, decor,
  clusters) use `hash2(...)` or separate seeded streams — never the sim stream.
  `?stress=1` must stay bit-identical over 100 years.
- **Chronicle i18n**: a new chronicle kind needs an English template in
  `sim/chronicle.ts` AND a zh mirror in `ui/i18n.ts` with the **same variant
  count** (the sim stores the picked variant index; mismatch silently falls
  back to English). New kinds also need an icon entry in `ui/icons.ts`.
- **Balance protocol**: sim tuning lives in `src/config/balance.ts`; cosmetic
  tuning in `src/config/balanceRender.ts` (still accessed as `BALANCE.render`).
  Sim-side changes ⇒ re-run `curate-seeds.ts` and sanity-check `longrun.ts`;
  balanceRender is free to change.
- **Saves**: new `SimState`/`Civilization`/`Relation` fields must be optional
  or defaulted so old saves load (see `persist/save.ts`, `SAVE_VERSION`).
- **UI strings** go through `t(key)` (en/zh) — never literals. CSS `url()`
  for icons must be root-absolute (`/assets/icons/...`).

## Rendering conventions

- Every asset has a procedural fallback (`render/textures.ts`); code must work
  with any subset of art missing. Settlement clusters degrade via substitution
  chains in `render/settlementCluster.ts`.
- Zoom bands: macro glyphs < ~1.0× < clusters < citizens fade 1.6–3.0× <
  action icons 3.2×+. Knobs in `balance.render` (`macroZoom*`, `citizenFade*`,
  `actionIconZoom*`).
- Terrain is baked to per-season RenderTextures (4×, LRU of 2); rebakes are
  triggered by `terrainVersion`. Layout/cluster rebuilds key on
  tier + pop bucket — keep per-frame work out of rebuild paths.

## Asset pipeline (`scripts/process-assets.mjs`)

- Raw art is gitignored (`assets_src/raw/<n>/`, see folder table at the top of
  the script); processed `public/assets/` is committed — clean clones are
  playable. Prompt specs for generating new art live in `ASSET_PROMPTS.md`.
- GPT-Image "transparency" is a baked checkerboard — the pipeline chroma-keys
  from the borders. Bright/white art (glow, smoke, flames, banner) must be
  generated on **solid black** and goes through dark-key / luma-alpha modes.
- Multi-object sheets are sliced by connected components (`slicePieces`) —
  objects must not touch each other or the image edges.
- Icons are CC BY from game-icons.net — update `icons/ATTRIBUTION.md` when
  adding any.

## Headless probes

- `?probe=1` exposes `window.__emberfall` (advanceDays, centerOn, setAmbient,
  stepAgents, layers, weatherAt) — use it instead of wall-clock timing; shared
  Playwright boilerplate lives in `scripts/lib/browser.mjs`.
- Settlement `tier` is numeric `0|1|2` — `s.tier === 'town'` matches nothing.
- Playwright MCP can wedge after HMR reloads; one-shot probe scripts are the
  reliable fallback.

## Git

- Never commit `image.png` (owner's scratch screenshot, gitignored) or
  anything under `scripts/out/` / `assets_src/raw|music/`.
- Commit per milestone with the verify loop green; push to `origin main`.
