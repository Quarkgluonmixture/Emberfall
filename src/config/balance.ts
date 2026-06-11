/**
 * Every balance constant in the game lives here (or in terrainConfig/civConfig).
 * Simulation code must not embed magic numbers for tunable behavior.
 */

export const BALANCE = {
  time: {
    /** Sim days per real second at 1x speed. */
    daysPerSecondAt1x: 2,
    /** Available speed multipliers; index 0 is pause. */
    speeds: [0, 1, 5, 20] as const,
    daysPerSeason: 30,
    seasonsPerYear: 4,
    /** Real seconds for one ambient (visual) day/night cycle at 1x. */
    ambientDaySeconds: 45,
    /** Real seconds between autosaves (separate slot from manual saves). */
    autosaveSeconds: 180,
  },

  map: {
    width: 160,
    height: 100,
    tileSize: 8,
    /** Elevation below this is ocean. */
    seaLevel: 0.34,
    mountainLevel: 0.72,
    riverCountMin: 6,
    riverCountMax: 10,
  },

  civ: {
    count: 5,
    startPopulation: 12,
    startFood: 70,
    startWood: 30,
    minSpawnDistance: 26,
    traitCount: 2,
  },

  resources: {
    /** Food consumed per population per day. */
    foodPerPopPerDay: 0.1,
    /** Tile radius a settlement gathers from. */
    gatherRadius: 3,
    /** Larger settlements work a wider hinterland (per tier). */
    gatherRadiusByTier: [3, 4, 5],
    /** Fraction of population in each job. */
    farmerShare: 0.62,
    lumberShare: 0.23,
    minerShare: 0.15,
    /** Output per worker per day. */
    farmerRate: 0.22,
    lumberRate: 0.18,
    minerRate: 0.15,
    /** Land throughput cap multipliers (× summed tile yield). */
    landFoodCap: 0.35,
    landWoodCap: 0.5,
    landStoneCap: 0.5,
    /** Food production multiplier per season [spring, summer, autumn, winter]. */
    seasonFoodMult: [1.1, 1.25, 1.0, 0.45],
    /** Farm infrastructure multiplier per settlement tier. */
    tierFoodMult: [1.0, 1.25, 1.55],
    /** Storage caps per tier. */
    foodStorage: [400, 1200, 3000],
    woodStorage: [300, 800, 2000],
    stoneStorage: [200, 600, 1500],
    /** Civ-wide accrual per population per day. */
    knowledgePerPop: 0.0025,
    faithPerPop: 0.002,
    culturePerPop: 0.0015,
    /** Production bonus when the civ has at least one trade partner. */
    tradeProductionBonus: 1.06,
    goldenAgeProductionBonus: 1.25,
    crisisProductionPenalty: 0.85,
  },

  growth: {
    /** Daily growth rate when fed and below cap. */
    growthRate: 0.012,
    /** Daily decline rate while starving. */
    starveRate: 0.025,
    /** Daily plague death rate. */
    plagueDeathRate: 0.008,
    /** Population caps per tier. */
    tierPopCap: [34, 110, 320],
    /** Upgrade requirements. */
    villagePop: 25,
    villageWoodCost: 60,
    townPop: 80,
    townStoneCost: 80,
    townWoodCost: 120,
    /** Morale dynamics. */
    moraleRecovery: 0.15,
    moraleRecoveryCap: 85,
    starveMoraleLoss: 0.4,
    /** Settlement is abandoned below this morale or population. */
    collapseMorale: 2,
    collapsePop: 2,
  },

  diplomacy: {
    /** Score thresholds (inclusive lower bounds). */
    allianceScore: 60,
    tradeScore: 25,
    neutralScore: -25,
    rivalryScore: -60,
    /** Daily mean reversion toward 0. */
    driftToZero: 0.02,
    /** Daily friction for civs sharing a border. */
    borderFriction: 0.1,
    /** Trait-driven daily drift. */
    warlikePenalty: 0.04,
    sharedDevoutBonus: 0.03,
    sharedScholarlyBonus: 0.02,
    sharedProudPenalty: 0.02,
    goldenAgeCharm: 0.01,
    /** Daily random wobble amplitude. */
    noise: 0.05,
    /** After this many war days, exhaustion pushes toward peace. */
    warExhaustionDays: 150,
    warExhaustionRelief: 0.25,
    /** Snap distance into a new band on transition, to reduce flapping. */
    transitionMomentum: 3,
    /** Random diplomatic incident chance per pair per day. */
    incidentChance: 0.004,
    incidentMagnitudeMin: 2,
    incidentMagnitudeMax: 8,
    /** Initial relation score range. */
    initialScoreSpread: 20,
    /** Daily military attrition fraction while at war. */
    warAttrition: 0.002,
    warMoraleLoss: 0.05,
    /** ── Treaties & tribute ─────────────────────────────
     * A war must be at least this old before anyone sues for peace. */
    treatyMinWarDays: 60,
    /** The losing side sues when its military falls below this fraction of the winner's. */
    treatySurrenderRatio: 0.5,
    /** Daily chance to sue once the surrender condition holds. */
    treatySurrenderChance: 0.03,
    /** Cornered civs (≤2 settlements) sue at this multiple, regardless of ratio. */
    treatyLastStandMult: 3,
    /** Relation score the treaty settles at (wary neutrality). */
    treatyScore: -12,
    /** Truce length in days (2 years); no new war between the pair while it runs. */
    treatyTruceDays: 240,
    /** Tribute duration in days (1.5 years; always shorter than the truce). */
    treatyTributeDays: 180,
    /** Daily food/wood the tribute caravans carry, paid from the seat's surplus. */
    tributeFoodPerDay: 1.2,
    tributeWoodPerDay: 0.6,
    /** The payer's seat never drops below these reserves. */
    tributeFoodReserve: 25,
    tributeWoodReserve: 15,
    /** Morale lift in both peoples when the fighting stops. */
    treatyMoraleRelief: 8,
  },

  territory: {
    recalcDays: 10,
    /** Claim radius per settlement tier. */
    radiusByTier: [4, 7, 10],
    /** Extra radius per 40 population (capped). */
    popRadiusBonusCap: 4,
  },

  military: {
    /** Military strength per population. */
    perPop: 0.12,
    warlikeMult: 1.5,
    crisisMult: 0.6,
  },

  events: {
    /** Famine triggers after this many consecutive starving days. */
    famineHungerDays: 7,
    famineDuration: 30,
    famineMoraleLoss: 0.3,
    /** Plague chance per settlement per day, scaled by population. */
    plagueChancePerPop: 0.00001,
    plagueDurationMin: 50,
    plagueDurationMax: 110,
    plagueSpreadChance: 0.003,
    plagueSpreadRange: 15,
    /** A settlement that survived plague cannot catch it again for this long. */
    plagueImmunityDays: 240,
    /** Migration. */
    migrationChance: 0.004,
    migrationCrowding: 0.8,
    migrationFoodCost: 30,
    migrationWoodCost: 20,
    migrationMinPop: 16,
    migrationPopFraction: 0.35,
    migrationMinRing: 8,
    migrationMaxRing: 18,
    migrationMinSeparation: 6,
    /** Border conflict (war skirmish) chance per warring pair per day. */
    borderConflictChance: 0.02,
    skirmishMilitaryLoss: 0.06,
    skirmishPopLoss: 0.03,
    skirmishMoraleLoss: 4,
    skirmishRelationHit: 3,
    /** Capture: attacker must exceed defender military by this ratio. */
    captureRatio: 2.2,
    captureChance: 0.25,
    capturePopLoss: 0.08,
    /** Succession crisis chance per civ per day. */
    successionChance: 0.0008,
    successionDuration: 80,
    successionMoraleLoss: 10,
    /** Religious schism. */
    schismChance: 0.0006,
    schismMinFaith: 50,
    schismFaithKeep: 0.55,
    schismMoraleLoss: 8,
    schismRelationHit: 15,
    /** Wildfire (summer only). */
    wildfireChance: 0.01,
    wildfireMinTiles: 12,
    wildfireMaxTiles: 32,
    wildfireNearSettlement: 6,
    wildfireWoodLossFraction: 0.2,
    wildfireMoraleLoss: 5,
    /** Forest regrowth: grassland tiles converted on the first day of spring. */
    regrowthTiles: 40,
    /** Flood (spring, river-adjacent settlements). */
    floodChance: 0.004,
    floodFoodKeep: 0.7,
    floodWoodKeep: 0.85,
    floodMoraleLoss: 4,
    floodRiverRange: 2,
    /** Golden age. */
    goldenAgeChance: 0.0006,
    goldenAgeDuration: 150,
    goldenAgeCooldown: 600,
  },

  agents: {
    /** Hard cap on visible citizen agents. */
    maxAgents: 600,
    perSettlementCap: 36,
    /** Fraction of settlement population represented as visible agents. */
    populationFraction: 0.45,
    /** World pixels per second. */
    walkSpeed: 14,
    workDurationMin: 3,
    workDurationMax: 7,
    /** Camera zoom below which agents are not materialized. */
    minZoom: 1.4,
    /** Margin in tiles around the view for agent spawning. */
    viewMargin: 6,
    /** Agent dt multiplier is capped so high sim speeds don't teleport agents. */
    maxSpeedFactor: 2.5,
    tradeRange: 50,
    fightRange: 25,
    fleeDistance: 4,
    raidFearDays: 20,
    buildPulseDays: 60,
  },

  audio: {
    /** Master music volume (0..1). */
    musicVolume: 0.5,
    /** Seconds to crossfade between tracks. */
    musicFadeSeconds: 2.5,
    /** Real seconds an event mood holds the music after its latest trigger. */
    moodHoldSeconds: { war: 75, disaster: 60, goldenAge: 90 },
    /** Darkness thresholds for the night track (hysteresis pair). */
    nightEnter: 0.72,
    nightExit: 0.38,
    /** Minimum real seconds between base-track (season/night) switches. */
    minTrackHoldSeconds: 12,
  },
  roads: {
    /** Sim-days between road network recomputes. */
    recalcDays: 45,
    /** Longest in-civ road edge, in tiles. */
    maxCivEdge: 50,
    /** Longest inter-civ trade road, in tiles. */
    maxTradeEdge: 70,
    /** A* search box margin around the endpoints, in tiles. */
    searchMargin: 8,
  },
  rebirth: {
    /** Days since the last rebirth (or world start) before a new people can rise. */
    cooldownDays: 540,
    /** Ruins must lie quiet this long before sheltering a new people. */
    ruinMinAgeDays: 360,
    /** Daily chance once every other condition holds. */
    chance: 0.004,
    /** Chance the new culture inherits one trait from the most recent fallen civ. */
    inheritTraitChance: 0.6,
    /** Site score a ruin must beat to host a rebirth (founding-quality land). */
    minSiteScore: 9,
    /** Settlement morale cannot fall below this during the grace years. */
    graceMoraleFloor: 35,
    /** Any civ holding ≤2 settlements keeps this morale floor — a cornered
        people does not abandon its last hearths. */
    lastStandMoraleFloor: 25,
    /** Reborn civs start larger than the original founders — they must survive
        beside established neighbors. */
    startPopulation: 80,
    /** No war against (and no plague within) a reborn civ this many days. */
    graceDays: 1080,
    /** With this few civs left, rebirth may rise inside claimed land —
        empires cannot hold every quiet corner. */
    frontierAliveMax: 2,
    /** Migration site score bonus for settling on or beside old ruins. */
    migrationRuinBonus: 3,
    /** Only ruins at least this old grant the bonus (and the resettle entry). */
    ruinBonusMinAgeDays: 360,
  },
  render: {
    /** Terrain bake resolution multiplier (1 = 8px/tile). Real tile art uses 2. */
    terrainBakeScale: 2,
    /** Target on-map width (world px) of settlement sprites per tier.
        Spread widened (camp shrunk, town grown past 3 tiles) so growth from
        camp to town reads as real scale, not an icon swap. */
    settlementWidths: [11, 17, 26],
    ruinsWidth: 16,
    bannerHeight: 7,
    /** Target on-map height (world px) of citizen sprites — kept well under
        settlement scale so people don't dwarf the buildings. */
    citizenHeight: 4.5,
    smokeAlpha: 0.35,
    /** Frame-rate cap options cycled by the HUD button; 0 = uncapped. */
    fpsCapOptions: [60, 30, 0],
    defaultZoom: 2.2,
    minZoom: 0.6,
    maxZoom: 8,
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
    glowFarAlphaFloor: 0.28,
    glowFarSizeFloor: 0.42,
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
    settlementNightLiftAlpha: 0.55,
    /** Per-building window glows in settlement clusters (above the night
        pass): pool size in world px and peak alpha at deep night. */
    lampGlowSize: 7,
    lampGlowAlpha: 0.4,
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
    /** Real seconds between territory overlay redraws (throttle). */
    territoryRedrawInterval: 0.5,
    uiRefreshInterval: 0.25,
    agentSyncInterval: 0.4,
  },
} as const;
