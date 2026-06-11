# Emberfall

An idle civilization ecosystem simulation — a living world in a bottle. Tiny
civilizations rise from first campfires, grow into glowing towns, trade,
quarrel, fall to plague and war, and rebuild — while you watch, like an
aquarium of history on a second monitor.

Cozy but slightly dark fantasy: soft seasons, drifting weather, small lights
against the night.

## Setup

Requires Node 18+.

```bash
npm install
npm run dev      # start the dev server, open the printed URL
npm run build    # typecheck + production build into dist/
npm test         # run the Vitest suite
npm run typecheck
```

Optional: open a specific world with `?seed=12345` in the URL.

## Controls

| Input | Action |
| --- | --- |
| Drag (left mouse) | Pan the camera |
| Mouse wheel | Zoom toward the cursor |
| Click | Inspect tile / settlement / citizen (citizens win ties) |
| `Space` | Pause / resume |
| `1` / `2` / `3` | 1× / 5× / 20× speed |
| `H` | Toggle the History panel |
| `F3` | Toggle the debug overlay |
| `Esc` | Close panels |
| Top bar | Save / Load (localStorage), New World, panel toggles |

Zoom in past ~1.4× to see individual citizens going about their day. At night
they head home; villages glow.

## Architecture

Simulation and rendering are strictly separated: `src/sim` is plain data +
pure-ish systems with **no Pixi imports**, ticked in whole-day steps from a
single seeded RNG stream (`core/rng.ts`). Rendering reads state and never
writes it.

```
src/
├── config/        ALL balance constants (balance.ts), terrain defs, civ flavor
├── core/          types.ts (every shared data shape), rng.ts (seeded PRNG + hash)
├── world/         worldgen.ts (fBm noise, biomes, rivers), world.ts (tile helpers)
├── sim/
│   ├── simulation.ts   orchestrator: fixed day-tick order, system timings
│   ├── time.ts         days → seasons → years calendar
│   ├── resources.ts    settlement production/consumption, civ accrual
│   ├── growth.ts       population dynamics, camp→village→town upgrades
│   ├── diplomacy.ts    relation scores → neutral/trade/alliance/rivalry/war
│   ├── territory.ts    tile ownership + border detection
│   ├── events.ts       famine, plague, migration, war, schism, wildfire, flood…
│   ├── chronicle.ts    storybook text composition + the event log
│   ├── founding.ts     civ/settlement creation, site scoring
│   ├── agents.ts       hybrid LOD: visible citizen agents near the camera
│   └── weather.ts      cosmetic daily weather (pure hash of seed+day)
├── render/        Pixi: camera, terrain bake, territory, settlements,
│                  citizens, atmosphere (night/dusk/particles), textures
├── ui/            DOM panels: HUD, civ roster, inspector, chronicle,
│                  history, debug overlay
└── persist/       save.ts — serialize to localStorage; world regenerates
                   from seed, terrain diffs replayed
```

### Key design decisions

- **Determinism.** One RNG stream drives the simulation; its 32-bit state is
  saved and restored, so a save → load → run produces bit-identical history.
  Cosmetic systems (agents, weather, render jitter) use separate streams or
  stateless hashing and can never perturb the simulation.
- **Hybrid simulation.** Aggregate settlement simulation is authoritative
  everywhere. Settlements near the camera materialize individual citizen
  agents (capped, budgeted) that gather, build, farm, trade, flee, rest and
  fight — pure detail expansion, no write-back.
- **Cheap rendering.** The whole terrain is baked into one RenderTexture per
  season (rebuilt only when terrain actually changes, e.g. wildfire). The
  night overlay, glows and weather are a handful of screen-space layers.
- **Data-oriented.** State is plain serializable data (`SimState`); systems
  are functions over it. No inheritance hierarchies.

## Extension guide

- **Tune the world**: everything lives in `src/config/balance.ts` — growth
  rates, event chances, diplomacy thresholds, agent counts. Terrain colors
  and yields are in `src/config/terrainConfig.ts`.
- **Add an event**: write a `maybeX(state, rng)` function in `sim/events.ts`,
  call it from `generateDailyEvents`, add text templates in
  `sim/chronicle.ts`, and constants in `balance.ts`. Done — it is now
  deterministic, chronicled, and visible in the History panel.
- **Add a culture trait**: extend `CULTURE_TRAITS` + `TRAIT_EFFECTS` in
  `config/civConfig.ts`, then consume the effect in the relevant system.
- **Add a settlement tier**: extend the tier arrays in `balance.ts`, add a
  texture in `render/textures.ts`, extend `growth.ts` upgrade rules.
- **Real art**: see `ASSET_MANIFEST.md` for the full asset list and
  `GPT_IMAGE_PROMPTS.md` for generation prompts; swap textures in
  `render/textures.ts` for `Assets.load(...)` calls.
- **New agent behaviors**: add a state in `sim/agents.ts#chooseTask` and a
  matching animation rule in `render/citizenLayer.ts`.

## Testing

`npm test` covers terrain generation determinism and biome coverage, resource
production/consumption, settlement growth and tier upgrades, diplomacy
threshold transitions (war declaration, war exhaustion → peace), event
triggers (famine/plague/collapse), full-state save/load round-trips, and
post-load determinism.

Two extra dev tools live in `scripts/`:

- `npx vite-node scripts/longrun.ts` — simulate 10 in-game years headless and
  print population, settlement tiers and a histogram of chronicle events
  (useful when tuning `balance.ts`).
- `node scripts/smoke.mjs` — drive the running dev server with a headless
  Chromium/Edge, screenshot the game and dump console errors (requires a
  local Edge/Chrome; adjust the executable path at the top).
