/** Game calendar: days → seasons → years. */
import { BALANCE } from '../config/balance';
import type { Season } from '../core/types';

export const DAYS_PER_SEASON = BALANCE.time.daysPerSeason;
export const SEASONS_PER_YEAR = BALANCE.time.seasonsPerYear;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR;

export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

export function yearOf(day: number): number {
  return Math.floor(day / DAYS_PER_YEAR) + 1;
}

export function seasonOf(day: number): Season {
  return Math.floor((day % DAYS_PER_YEAR) / DAYS_PER_SEASON) as Season;
}

export function dayOfSeason(day: number): number {
  return (day % DAYS_PER_SEASON) + 1;
}

export function dateString(day: number): string {
  return `Year ${yearOf(day)} · ${SEASON_NAMES[seasonOf(day)]} · Day ${dayOfSeason(day)}`;
}

/** True on the first day of spring (used for annual events like regrowth). */
export function isFirstDayOfSpring(day: number): boolean {
  return day % DAYS_PER_YEAR === 0;
}
