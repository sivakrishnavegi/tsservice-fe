import { z } from 'zod';
import type { DateKey } from '@/core/dates';

export const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
export type Meal = (typeof MEALS)[number];

/** `pending` = a remark or photo exists but no status picked yet. A missing row also means not marked. */
export const MEAL_STATUSES = ['received', 'not_received', 'leave', 'pending'] as const;
export type MealStatus = (typeof MEAL_STATUSES)[number];
export type MarkedStatus = Exclude<MealStatus, 'pending'>;

export interface MealLog {
  date: DateKey;
  meal: Meal;
  status: MealStatus;
  remark?: string;
  /** file:// URI inside the app's documents folder */
  photoUri?: string;
  updatedAt: string;
}

export const MEAL_LABEL: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
export const STATUS_LABEL: Record<MealStatus, string> = {
  received: 'Received',
  not_received: 'Missed',
  leave: 'Leave',
  pending: 'Not marked',
};

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const mealConfig = z.object({ enabled: z.boolean(), time: clock });

export const tiffinSettingsSchema = z.object({
  meals: z.object({ breakfast: mealConfig, lunch: mealConfig, dinner: mealConfig }),
  reminders: z.boolean(),
  /** Minutes after the usual time to remind. */
  reminderDelayMinutes: z.number().int().min(0).max(180),
  providerName: z.string().max(60),
  /** 0 = Sunday … 6 = Saturday */
  serviceDays: z.array(z.number().int().min(0).max(6)),
});

export type TiffinSettings = z.infer<typeof tiffinSettingsSchema>;

export const DEFAULT_TIFFIN_SETTINGS: TiffinSettings = {
  meals: {
    breakfast: { enabled: true, time: '08:30' },
    lunch: { enabled: true, time: '13:00' },
    dinner: { enabled: true, time: '20:30' },
  },
  reminders: false,
  reminderDelayMinutes: 30,
  providerName: '',
  serviceDays: [0, 1, 2, 3, 4, 5, 6],
};

export const enabledMeals = (s: TiffinSettings): Meal[] => MEALS.filter((m) => s.meals[m].enabled);
