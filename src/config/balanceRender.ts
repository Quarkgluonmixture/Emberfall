/**
 * Render/cosmetic tuning, split out of balance.ts: changes here never affect
 * the simulation, so they need no curate-seeds re-run and no longrun check.
 * Accessed as BALANCE.render — call sites are unchanged by the split.
 */

export const RENDER_BALANCE = {
  /** Terrain bake resolution multiplier (1 = 8px/tile). Real tile art bakes
      at 4 (32px/tile, still within the ~45px/tile the sheets provide) so
      terrain holds up next to the high-res building pieces at close zoom.
      GPU cost: ~65MB per cached season — the layer keeps an LRU of 2. */
  terrainBakeScale: 4,
  /** Target on-map width (world px) of settlement sprites per tier.
      Spread widened (camp shrunk, town grown past 3 tiles) so growth from
      camp to town reads as real scale, not an icon swap. */
  settlementWidths: [11, 17, 26],
  ruinsWidth: 16,
  bannerHeight: 7,
  /** Target on-map height (world px) of citizen sprites — kept well under
      settlement scale so people don't dwarf the buildings, but big enough
      to read against the detailed cluster rooftops. */
  citizenHeight: 5.8,
  smokeAlpha: 0.35,
  /** Frame-rate cap options cycled by the HUD button; 0 = uncapped. */
  fpsCapOptions: [60, 30, 0],
  defaultZoom: 2.2,
  minZoom: 0.6,
  /** Raised for the cluster art era — close-ups of streets and citizens. */
  maxZoom: 13,
  zoomStep: 1.1,
  /** Night grading: a multiply pass deepens shadows, an additive pass adds
      cool moonlight so the scene never goes flat-dead. Art-audit pass: the
      floor is slate blue, never near-black — terrain, roads and borders must
      stay readable at deepest midnight. */
  nightMulColor: 0x2b3a5c,
  nightMulAlpha: 0.86,
  nightAddColor: 0x0c1b2e,
  nightAddAlpha: 0.32,
  /** Dusk: vertical purple→orange multiply gradient instead of a flat wash. */
  duskTopColor: 0x4a2c41,
  duskBottomColor: 0xd46a32,
  duskAlpha: 0.5,
  /** Screen-space vignette strength at the corners (0 disables). */
  vignetteAlpha: 0.36,
  /** Seconds for the terrain bake crossfade on season change — kept short:
      long alpha blends of misaligned pixel art read as a double exposure. */
  seasonFadeSeconds: 0.5,
  /** Bake-time neutral overlay that softens terrain contrast so actors pop.
      Spring instead gets a fresh green correction (its art runs olive). */
  terrainSoftenColor: 0x8a8578,
  terrainSoftenAlpha: 0.1,
  springTintColor: 0x8efaa4,
  springTintAlpha: 0.05,
  /** Bake-time multiply over deep water: enforces the hue while letting the
      brighter wave pixels punch through (normal-blend looked like a decal). */
  waterFlattenColor: 0x598ab5,
  waterFlattenAlpha: 0.65,
  /** ── Shoreline (bake-time, procedural) ──────────────────────────
   * Where land meets ocean: a sand ramp fades inland from the waterline,
   * and a shallow-water band + foam seam brighten the ocean side (drawn
   * after the water flatten so they stay luminous). All per-tile-edge,
   * alpha-jittered by hash2 so the band doesn't read as a grid outline. */
  shoreSandColor: 0xd9bc82,
  shoreSandAlpha: 0.32,
  /** Sand ramp depth as a fraction of one tile. */
  shoreSandDepth: 0.45,
  shoreShallowColor: 0x7fd2c3,
  shoreShallowAlpha: 0.34,
  /** Shallow-water band depth as a fraction of one tile. Deliberately past
      1.0: the ramp spills into the second ocean ring, which stretches the
      gradient and visually softens the tile-step zigzag of the coastline. */
  shoreShallowDepth: 1.15,
  shoreFoamColor: 0xf2ecd9,
  shoreFoamAlpha: 0.36,
  /** Foam seam thickness as a fraction of one tile. */
  shoreFoamWidth: 0.09,
  /** ±fraction of alpha jitter applied per edge run (0 = uniform band). */
  shoreJitter: 0.2,
  /** Two-stage settlement lamps: warm core + wide orange spill. */
  glowTint: 0xffe2a8,
  glowSpillTint: 0xd96b14,
  glowMaxAlpha: 0.36,
  /** Zoom the glow look is tuned at; past it the on-screen footprint is damped. */
  glowRefZoom: 1.8,
  /** How hard glow size shrinks beyond the reference zoom (1 = constant screen size). */
  glowZoomSizeExp: 0.95,
  /** How hard glow alpha dims beyond the reference zoom. */
  glowZoomAlphaExp: 0.35,
  /** Below this zoom, glows ease toward the far floors so dense late-game
      maps read as distinct lights instead of merged orange wash. */
  glowFarZoom: 1.3,
  glowFarAlphaFloor: 0.19,
  glowFarSizeFloor: 0.27,
  /** Overall glow footprint multiplier (1 = the oversized phase-2 look).
      Art-audit pass: lights mark settlements; the lamp-lift below does the
      "illuminated buildings" work the old giant blobs faked. */
  glowSizeScale: 0.36,
  /** Settlement count where density damping kicks in; beyond it glows
      shrink ~1/sqrt so dense late-game maps keep distinct lights. */
  glowDensityRef: 28,
  weatherParticleBudget: 260,
  labelMinZoom: 1.6,
  territoryFillAlpha: 0.1,
  territoryBorderAlpha: 0.55,
  /** Daylight lift on settlement sprites (additive warm overlay), fading
      out at night — the raw art reads as charcoal silhouettes in sunlight. */
  settlementDayLiftColor: 0xffebc2,
  settlementDayLiftAlpha: 0.18,
  /** Night lamp-lift on the same overlay: buildings read as lamp-lit
      structures after dark instead of vanishing under the glow blob. */
  settlementNightLiftAlpha: 0.4,
  /** Per-building window glows in settlement clusters (above the night
      pass): pool size in world px and peak alpha at deep night. Kept small —
      stacked additive lamps turn towns back into orange blobs fast. */
  lampGlowSize: 5,
  lampGlowAlpha: 0.22,
  /** Soft earth-toned base patch under each settlement, grounding it in the
      terrain instead of floating like a sticker. */
  settlementBaseColor: 0x6b5639,
  settlementBaseAlpha: 0.38,
  /** Citizens fade in across this zoom range: hidden at macro, calm at the
      default zoom, full contrast only in close-ups. */
  citizenFadeZoomStart: 1.6,
  citizenFadeZoomFull: 3.0,
  /** Macro zoom band: below macroZoomStart the strategic layer (tier
      glyphs, war fronts, trade flows) is fully in charge and building
      clusters are gone; above macroZoomEnd the clusters rule. */
  macroZoomStart: 0.95,
  macroZoomEnd: 1.3,
  /** Overhead citizen action icons fade in across this zoom band. */
  actionIconZoomStart: 3.2,
  actionIconZoomFull: 4.2,
  /** Icon width in world px (≈20 screen px at full close-up zoom). */
  actionIconSize: 3.2,
  /** Real seconds between territory overlay redraws (throttle). */
  territoryRedrawInterval: 0.5,
  uiRefreshInterval: 0.25,
  agentSyncInterval: 0.4,
} as const;
