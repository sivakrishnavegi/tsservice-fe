import { atClock, clockToMinutes, fromDateKey, MINUTE, todayKey, type DateKey } from '@/core/dates';
import type { DayType, OfficeBreak, OfficeDay, OfficeSettings, ShiftConfig } from './types';

/** Window length in minutes; an end before the start runs past midnight. */
export function windowMinutes(startTime: string, endTime: string): number {
  const diff = clockToMinutes(endTime) - clockToMinutes(startTime);
  return diff > 0 ? diff : diff + 1440;
}

/** Minutes of actual work expected on a workday (breaks are not work). */
export function targetMinutes(shift: ShiftConfig, plannedBreakMinutes: number): number {
  if (shift.mode === 'duration') return shift.targetMinutes;
  return Math.max(0, windowMinutes(shift.startTime, shift.endTime) - plannedBreakMinutes);
}

export function isWorkDay(date: DateKey, settings: Pick<OfficeSettings, 'workDays'>): boolean {
  return settings.workDays.includes(fromDateKey(date).getDay());
}

export type OfficeStatus = 'not_started' | 'working' | 'on_break' | 'checked_out' | 'leave' | 'holiday' | 'day_off';

export interface OfficeSummary {
  date: DateKey;
  status: OfficeStatus;
  dayType: DayType;
  targetMs: number;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  /** Time between check-in and check-out (or now). */
  presentMs: number;
  breakMs: number;
  /** presentMs − breakMs */
  workedMs: number;
  remainingMs: number;
  overtimeMs: number;
  /** 0..1 */
  progress: number;
  openBreak: OfficeBreak | null;
  /** ms the running break has lasted */
  openBreakMs: number;
  /** When you can leave if you keep working (and take the rest of your planned break). */
  leaveAt: Date | null;
  /** Fixed-hours mode only. */
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  /** Minutes after the scheduled start, fixed-hours mode only. */
  lateMinutes: number;
  /** A past day that was checked in but never checked out. */
  missingCheckOut: boolean;
}

function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

export function summarizeDay(day: OfficeDay, settings: OfficeSettings, now: Date): OfficeSummary {
  const isToday = day.date === todayKey(now);
  const isPast = day.date < todayKey(now);
  const scheduledDay = isWorkDay(day.date, settings);
  const target = day.dayType === 'workday' && scheduledDay ? targetMinutes(settings.shift, settings.plannedBreakMinutes) * MINUTE : 0;

  const checkIn = day.checkIn ? Date.parse(day.checkIn) : null;
  const checkOut = day.checkOut ? Date.parse(day.checkOut) : null;
  const missingCheckOut = checkIn !== null && checkOut === null && isPast;
  // A forgotten check-out on a past day counts nothing rather than inventing hours.
  const end = checkOut ?? (isToday ? now.getTime() : (checkIn ?? 0));

  const presentMs = checkIn !== null ? Math.max(0, end - checkIn) : 0;
  const breakMs =
    checkIn === null
      ? 0
      : day.breaks.reduce((sum, b) => sum + overlapMs(Date.parse(b.start), b.end ? Date.parse(b.end) : end, checkIn, end), 0);
  const workedMs = Math.max(0, presentMs - breakMs);
  const remainingMs = Math.max(0, target - workedMs);
  const overtimeMs = Math.max(0, workedMs - target);

  const openBreak = checkOut === null && isToday ? (day.breaks.find((b) => b.end === null) ?? null) : null;
  const openBreakMs = openBreak ? Math.max(0, now.getTime() - Date.parse(openBreak.start)) : 0;

  let status: OfficeStatus;
  if (day.dayType === 'leave') status = 'leave';
  else if (day.dayType === 'holiday') status = 'holiday';
  else if (checkIn === null) status = scheduledDay ? 'not_started' : 'day_off';
  else if (checkOut !== null || missingCheckOut) status = 'checked_out';
  else if (openBreak) status = 'on_break';
  else status = 'working';

  let leaveAt: Date | null = null;
  if (status === 'working' || status === 'on_break') {
    const plannedLeft = settings.includePlannedBreak ? Math.max(0, settings.plannedBreakMinutes * MINUTE - breakMs) : 0;
    leaveAt = new Date(now.getTime() + remainingMs + (remainingMs > 0 ? plannedLeft : 0));
  } else if (status === 'checked_out' && checkOut !== null) {
    leaveAt = new Date(checkOut);
  }

  let scheduledStart: Date | null = null;
  let scheduledEnd: Date | null = null;
  let lateMinutes = 0;
  if (settings.shift.mode === 'window' && target > 0) {
    scheduledStart = atClock(day.date, settings.shift.startTime);
    scheduledEnd = new Date(scheduledStart.getTime() + windowMinutes(settings.shift.startTime, settings.shift.endTime) * MINUTE);
    if (checkIn !== null) lateMinutes = Math.max(0, Math.floor((checkIn - scheduledStart.getTime()) / MINUTE));
  }

  return {
    date: day.date,
    status,
    dayType: day.dayType,
    checkInAt: checkIn !== null ? new Date(checkIn) : null,
    checkOutAt: checkOut !== null ? new Date(checkOut) : null,
    targetMs: target,
    presentMs,
    breakMs,
    workedMs,
    remainingMs,
    overtimeMs,
    progress: target === 0 ? (workedMs > 0 ? 1 : 0) : Math.min(1, workedMs / target),
    openBreak,
    openBreakMs,
    leaveAt,
    scheduledStart,
    scheduledEnd,
    lateMinutes,
    missingCheckOut,
  };
}

export interface RangeTotals {
  workedMs: number;
  /** Ahead (+) or behind (−) target, over finished days only. */
  balanceMs: number;
  daysWorked: number;
  leaveDays: number;
  holidays: number;
  lateDays: number;
}

/** Totals for a set of days. Today's running shift counts toward worked time but not the balance. */
export function summarizeRange(summaries: readonly OfficeSummary[]): RangeTotals {
  return summaries.reduce<RangeTotals>(
    (t, s) => {
      const finished = s.status === 'checked_out';
      return {
        workedMs: t.workedMs + s.workedMs,
        balanceMs: t.balanceMs + (finished ? s.workedMs - s.targetMs : 0),
        daysWorked: t.daysWorked + (s.workedMs > 0 ? 1 : 0),
        leaveDays: t.leaveDays + (s.status === 'leave' ? 1 : 0),
        holidays: t.holidays + (s.status === 'holiday' ? 1 : 0),
        lateDays: t.lateDays + (s.lateMinutes > 0 ? 1 : 0),
      };
    },
    { workedMs: 0, balanceMs: 0, daysWorked: 0, leaveDays: 0, holidays: 0, lateDays: 0 },
  );
}

/** Sum of a break's length, clipped to now for a running break. */
export function breakLengthMs(b: Pick<OfficeBreak, 'start' | 'end'>, now: Date): number {
  return Math.max(0, (b.end ? Date.parse(b.end) : now.getTime()) - Date.parse(b.start));
}
