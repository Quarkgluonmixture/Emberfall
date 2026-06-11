/** Civilization flavor: names, colors, culture traits and their effects. */

export const CIV_NAMES = [
  'Ashvale',
  'Drumlin',
  'Korreth',
  'Velmora',
  'Thornwick',
  'Eldermoor',
  'Brackenfeld',
  'Skarnholt',
];

export const CIV_COLORS = [0xe2a14e, 0x7fb069, 0x6a8ec7, 0xc76a6a, 0x9b6ac7, 0x5fb3a1];

export const SETTLEMENT_PREFIXES = [
  'Ember',
  'Hollow',
  'Thorn',
  'Ash',
  'Mist',
  'Raven',
  'Stone',
  'Fern',
  'Grey',
  'Briar',
  'Elder',
  'Moor',
  'Wolf',
  'Alder',
  'Crow',
  'Tarn',
];

export const SETTLEMENT_SUFFIXES = [
  'mere',
  'wick',
  'hollow',
  'stead',
  'ford',
  'fell',
  'haven',
  'gate',
  'barrow',
  'reach',
  'den',
  'march',
  'cairn',
  'wend',
];

/** Culture traits. Effects are looked up by simulation systems. */
export const CULTURE_TRAITS = [
  'industrious',
  'devout',
  'scholarly',
  'warlike',
  'seafaring',
  'nomadic',
  'proud',
  'hardy',
] as const;

export type CultureTrait = (typeof CULTURE_TRAITS)[number];

export const TRAIT_EFFECTS = {
  /** Production multiplier. */
  industriousProduction: 1.15,
  /** Faith accrual multiplier. */
  devoutFaith: 1.8,
  /** Knowledge accrual multiplier. */
  scholarlyKnowledge: 1.6,
  /** Migration chance multiplier. */
  nomadicMigration: 2.0,
  /** Coast/ocean food multiplier. */
  seafaringCoastFood: 1.4,
  /** Starvation rate multiplier (hardy civs endure). */
  hardyStarvation: 0.6,
  /** Culture accrual multiplier. */
  proudCulture: 1.4,
} as const;

export const GOLDEN_AGE_FLAVORS = [
  'stonecraft and song',
  'star-charts and silver',
  'harvest and festival',
  'letters and law',
  'weaving and wonder',
];
