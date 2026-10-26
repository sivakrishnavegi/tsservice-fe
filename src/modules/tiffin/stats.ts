import { eachDateKey, fromDateKey, type DateKey } from '@/core/dates';
import type { Meal, MealLog, MealStatus, TiffinSettings } from './types';

export type MealCounts = Record<MealStatus, number>;

export const statusOf = (logs: readonly MealLog[], date: DateKey, meal: Meal): MealStatus =>
  logs.find((l) => l.date === date && l.meal === meal)?.status ?? 'pending';

/**
 * Counts for tracked meals on service days in [from, to]. Days or meals with no record
 * count as `pending` (not marked), so the numbers always add up.
 */
export function countRange(
  logs: readonly MealLog[],
  settings: TiffinSettings,
  from: DateKey,
  to: DateKey,
  meals: readonly Meal[],
): MealCounts {
  const counts: MealCounts = { received: 0, not_received: 0, leave: 0, pending: 0 };
  for (const date of eachDateKey(from, to)) {
    if (!settings.serviceDays.includes(fromDateKey(date).getDay())) continue;
    for (const meal of meals) counts[statusOf(logs, date, meal)] += 1;
  }
  return counts;
}

/** Dates in the range that have any record, newest first. */
export function datesWithLogs(logs: readonly MealLog[]): DateKey[] {
  return [...new Set(logs.map((l) => l.date))].sort().reverse();
}
