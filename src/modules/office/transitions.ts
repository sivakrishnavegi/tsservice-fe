import { newId } from '@/core/ids';
import { todayKey } from '@/core/dates';
import { OfficeError, type DayType, type OfficeDay } from './types';

/**
 * Pure state changes for the day's attendance. Each returns a new day or throws an
 * OfficeError with a message ready to show. The repository only stores the result.
 */

const iso = (d: Date) => d.toISOString();
const open = (day: OfficeDay) => day.breaks.find((b) => b.end === null);

function assertToday(day: OfficeDay, now: Date) {
  if (day.date !== todayKey(now)) throw new OfficeError('Use the day editor to change past days.');
}

export function checkIn(day: OfficeDay, now: Date): OfficeDay {
  assertToday(day, now);
  if (day.checkIn) throw new OfficeError("You're already checked in.");
  return { ...day, dayType: 'workday', checkIn: iso(now), checkOut: null };
}

export function checkOut(day: OfficeDay, now: Date): OfficeDay {
  assertToday(day, now);
  if (!day.checkIn) throw new OfficeError("You haven't checked in yet.");
  if (day.checkOut) throw new OfficeError("You've already checked out.");
  // Checking out ends a running break at the same moment.
  return { ...day, checkOut: iso(now), breaks: day.breaks.map((b) => (b.end === null ? { ...b, end: iso(now) } : b)) };
}

export function startBreak(day: OfficeDay, now: Date, label = 'Break'): OfficeDay {
  assertToday(day, now);
  if (!day.checkIn) throw new OfficeError('Check in before starting a break.');
  if (day.checkOut) throw new OfficeError("You've already checked out.");
  if (open(day)) throw new OfficeError('A break is already running.');
  return { ...day, breaks: [...day.breaks, { id: newId(), label, start: iso(now), end: null }] };
}

export function endBreak(day: OfficeDay, now: Date): OfficeDay {
  const running = open(day);
  if (!running) throw new OfficeError('No break is running.');
  return { ...day, breaks: day.breaks.map((b) => (b.id === running.id ? { ...b, end: iso(now) } : b)) };
}

/** Re-opens a checked-out day (e.g. you tapped Check out by mistake). */
export function undoCheckOut(day: OfficeDay, now: Date): OfficeDay {
  assertToday(day, now);
  if (!day.checkOut) throw new OfficeError("You haven't checked out.");
  return { ...day, checkOut: null };
}

export function setDayType(day: OfficeDay, dayType: DayType): OfficeDay {
  return { ...day, dayType };
}
