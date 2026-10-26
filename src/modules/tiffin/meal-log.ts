import type { DateKey } from '@/core/dates';
import type { Meal, MealLog, MealStatus } from './types';

export interface MealChange {
  date: DateKey;
  meal: Meal;
  status?: MealStatus;
  /** '' clears the remark */
  remark?: string;
  /** null removes the photo */
  photoUri?: string | null;
}

/** Merge a change into the existing log (or a blank one). Pure. */
export function applyMealChange(existing: MealLog | undefined, ch: MealChange, now: Date): MealLog {
  const status = ch.status ?? existing?.status ?? 'pending';
  const remark = (ch.remark !== undefined ? ch.remark : existing?.remark)?.trim();
  const photoUri = ch.photoUri === null ? undefined : (ch.photoUri ?? existing?.photoUri);
  return {
    date: ch.date,
    meal: ch.meal,
    status,
    ...(remark ? { remark } : {}),
    ...(photoUri ? { photoUri } : {}),
    updatedAt: now.toISOString(),
  };
}
