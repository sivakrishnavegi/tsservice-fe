import { z } from 'zod';
import type { DateKey } from '@/core/dates';

export const DAY_TYPES = ['workday', 'leave', 'holiday'] as const;
export type DayType = (typeof DAY_TYPES)[number];

export interface OfficeBreak {
  id: string;
  label: string;
  /** ISO instant */
  start: string;
  /** ISO instant; null while the break is running */
  end: string | null;
}

/** One calendar day of attendance: a single check-in/out pair and the breaks inside it. */
export interface OfficeDay {
  date: DateKey;
  dayType: DayType;
  checkIn: string | null;
  checkOut: string | null;
  note?: string;
  breaks: OfficeBreak[];
}

export const emptyDay = (date: DateKey): OfficeDay => ({ date, dayType: 'workday', checkIn: null, checkOut: null, breaks: [] });

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const officeSettingsSchema = z.object({
  shift: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('window'), startTime: clock, endTime: clock }),
    z.object({ mode: z.literal('duration'), targetMinutes: z.number().int().min(15).max(1440) }),
  ]),
  /** 0 = Sunday … 6 = Saturday */
  workDays: z.array(z.number().int().min(0).max(6)),
  plannedBreakMinutes: z.number().int().min(0).max(240),
  /** Add the planned break to leave-at until you log real breaks that cover it. */
  includePlannedBreak: z.boolean(),
  reminders: z.object({
    leaveAt: z.boolean(),
    forgotCheckOut: z.boolean(),
    longBreak: z.boolean(),
  }),
  forgotCheckOutTime: clock,
  longBreakMinutes: z.number().int().min(10).max(240),
});

export type OfficeSettings = z.infer<typeof officeSettingsSchema>;
export type ShiftConfig = OfficeSettings['shift'];

export const DEFAULT_OFFICE_SETTINGS: OfficeSettings = {
  shift: { mode: 'duration', targetMinutes: 8 * 60 + 30 },
  workDays: [1, 2, 3, 4, 5, 6],
  plannedBreakMinutes: 45,
  includePlannedBreak: true,
  reminders: { leaveAt: true, forgotCheckOut: true, longBreak: false },
  forgotCheckOutTime: '21:00',
  longBreakMinutes: 60,
};

/** User-facing rule violation; the message is shown as-is. */
export class OfficeError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}
