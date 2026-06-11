/**
 * Daily weather. Pure function of (seed, day) so it is deterministic without
 * consuming the simulation RNG — weather is ambience, not simulation input.
 */
import { hash2 } from '../core/rng';
import type { Season } from '../core/types';

export type WeatherKind = 'clear' | 'rain' | 'snow';

export interface Weather {
  kind: WeatherKind;
  /** 0..1 */
  intensity: number;
  /** -1..1, horizontal particle drift */
  wind: number;
}

const RAIN_CHANCE: Record<Season, number> = { 0: 0.35, 1: 0.15, 2: 0.3, 3: 0 };
const SNOW_CHANCE: Record<Season, number> = { 0: 0, 1: 0, 2: 0.05, 3: 0.5 };

export function weatherForDay(seed: number, day: number, season: Season): Weather {
  const roll = hash2(seed ^ 0x77ea, day, 0);
  const intensity = 0.3 + 0.7 * hash2(seed ^ 0x77eb, day, 1);
  const wind = (hash2(seed ^ 0x77ec, day, 2) - 0.5) * 2;
  if (roll < SNOW_CHANCE[season]) return { kind: 'snow', intensity, wind };
  if (roll < SNOW_CHANCE[season] + RAIN_CHANCE[season]) return { kind: 'rain', intensity, wind };
  return { kind: 'clear', intensity: 0, wind };
}
