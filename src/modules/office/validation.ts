import { todayKey } from '@/core/dates';
import type { DayType, OfficeDay } from './types';

/** What the day editor holds while you type. */
export interface DayDraft {
  dayType: DayType;
  checkIn: Date | null;
  checkOut: Date | null;
  breaks: { id: string; label: string; start: Date; end: Date | null }[];
}

export type DraftErrors = Partial<Record<string, string>>;

export const breakField = (id: string, part: 'start' | 'end') => `break.${id}.${part}`;

/** Field-keyed errors, shown next to each control. Empty object = valid. */
export function validateDraft(draft: DayDraft, date: string, now: Date): DraftErrors {
  const errors: DraftErrors = {};
  const isToday = date === todayKey(now);
  const nowMs = now.getTime();
  const inMs = draft.checkIn?.getTime() ?? null;
  const outMs = draft.checkOut?.getTime() ?? null;

  if (inMs === null) {
    if (outMs !== null) errors.checkIn = 'Set a check-in time first.';
    if (draft.breaks.length) errors.checkIn = 'Set a check-in time before adding breaks.';
  } else if (inMs > nowMs) {
    errors.checkIn = "Check-in can't be in the future.";
  }

  if (outMs !== null) {
    if (inMs !== null && outMs <= inMs) errors.checkOut = 'Check-out must be after check-in.';
    else if (outMs > nowMs) errors.checkOut = "Check-out can't be in the future.";
  }

  const shiftEnd = outMs ?? (isToday ? nowMs : null);
  const sorted = [...draft.breaks].sort((a, b) => a.start.getTime() - b.start.getTime());
  let prevEnd = -Infinity;
  sorted.forEach((b, i) => {
    const s = b.start.getTime();
    const e = b.end?.getTime() ?? null;
    if (e === null) {
      const isLast = i === sorted.length - 1;
      if (!isToday || outMs !== null || !isLast) errors[breakField(b.id, 'end')] = 'Set when this break ended.';
    } else if (e <= s) {
      errors[breakField(b.id, 'end')] = 'A break must end after it starts.';
    }
    if (inMs !== null && s < inMs) errors[breakField(b.id, 'start')] = 'Breaks start after check-in.';
    else if (s > nowMs) errors[breakField(b.id, 'start')] = "A break can't start in the future.";
    else if (shiftEnd !== null && (e ?? s) > shiftEnd) errors[breakField(b.id, 'end')] = 'Breaks end before check-out.';
    if (s < prevEnd) errors[breakField(b.id, 'start')] = "Breaks can't overlap.";
    prevEnd = e ?? Infinity;
  });

  return errors;
}

export function draftFromDay(day: OfficeDay): DayDraft {
  return {
    dayType: day.dayType,
    checkIn: day.checkIn ? new Date(day.checkIn) : null,
    checkOut: day.checkOut ? new Date(day.checkOut) : null,
    breaks: day.breaks.map((b) => ({ id: b.id, label: b.label, start: new Date(b.start), end: b.end ? new Date(b.end) : null })),
  };
}

export function dayFromDraft(date: string, draft: DayDraft, note?: string): OfficeDay {
  return {
    date,
    dayType: draft.dayType,
    checkIn: draft.checkIn?.toISOString() ?? null,
    checkOut: draft.checkOut?.toISOString() ?? null,
    ...(note ? { note } : {}),
    breaks: [...draft.breaks]
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((b) => ({ id: b.id, label: b.label, start: b.start.toISOString(), end: b.end?.toISOString() ?? null })),
  };
}
