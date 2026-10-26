import { addDays, format, parseISO, startOfWeek } from 'date-fns';

/**
 * Calendar days are "YYYY-MM-DD" strings in the device's timezone.
 * Instants are ISO strings (UTC). Keep the two apart.
 */
export type DateKey = string;

export const toDateKey = (d: Date): DateKey => format(d, 'yyyy-MM-dd');
export const todayKey = (now = new Date()): DateKey => toDateKey(now);
export const fromDateKey = (key: DateKey): Date => parseISO(key);
export const addDaysKey = (key: DateKey, days: number): DateKey => toDateKey(addDays(fromDateKey(key), days));

/** Inclusive list from `from` to `to`. */
export function eachDateKey(from: DateKey, to: DateKey): DateKey[] {
  const keys: DateKey[] = [];
  for (let k = from; k <= to; k = addDaysKey(k, 1)) keys.push(k);
  return keys;
}

/** Monday-based week containing `key`. */
export function weekRange(key: DateKey): { from: DateKey; to: DateKey } {
  const start = startOfWeek(fromDateKey(key), { weekStartsOn: 1 });
  return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
}

export function monthRange(key: DateKey): { from: DateKey; to: DateKey } {
  const d = fromDateKey(key);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: toDateKey(first), to: toDateKey(last) };
}

/** Wall-clock "HH:mm" → minutes after midnight. */
export function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function minutesToClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** The instant a wall-clock time happens on a calendar day (device timezone). */
export function atClock(key: DateKey, clock: string): Date {
  const d = fromDateKey(key);
  const min = clockToMinutes(clock);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}

/** Same calendar day as `key`, with the hours and minutes of `time`. */
export function withTimeOf(key: DateKey, time: Date): Date {
  const d = fromDateKey(key);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

export const MINUTE = 60_000;

/** "8h 30m", "45m", "0m" — rounds down to the minute. */
export function formatDuration(ms: number): string {
  const total = Math.floor(Math.abs(ms) / MINUTE);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "+25m" / "−40m" */
export function formatSignedDuration(ms: number): string {
  if (Math.floor(Math.abs(ms) / MINUTE) === 0) return '0m';
  return `${ms >= 0 ? '+' : '−'}${formatDuration(ms)}`;
}

/** "05:12:09" for live timers. */
export function formatTimer(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** "12:04" for short timers (minutes:seconds), hours shown only when needed. */
export function formatShortTimer(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const formatTime = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, 'h:mm a');
export const formatClock = (clock: string) => format(atClock('2000-01-01', clock), 'h:mm a');
export const formatDayShort = (key: DateKey) => format(fromDateKey(key), 'EEE, d MMM');
export const formatDayLong = (key: DateKey) => format(fromDateKey(key), 'EEEE, d MMMM');
export const formatMonth = (key: DateKey) => format(fromDateKey(key), 'MMMM yyyy');

/** "Today", "Yesterday", or "Fri, 25 Sep". */
export function formatRelativeDay(key: DateKey, now = new Date()): string {
  const today = todayKey(now);
  if (key === today) return 'Today';
  if (key === addDaysKey(today, -1)) return 'Yesterday';
  return formatDayShort(key);
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** "Mon – Sat", "Every day", "Mon, Wed, Fri" */
export function formatWeekdays(days: readonly number[]): string {
  const set = [...new Set(days)].sort((a, b) => a - b);
  if (set.length === 7) return 'Every day';
  if (set.length === 0) return 'None';
  // Contiguous run starting Monday, e.g. Mon–Fri or Mon–Sat.
  const mondayFirst = set.map((d) => (d + 6) % 7).sort((a, b) => a - b);
  const contiguous = mondayFirst.every((d, i) => i === 0 || d === mondayFirst[i - 1]! + 1);
  if (contiguous && set.length > 2) {
    const name = (i: number) => WEEKDAYS[(i + 1) % 7]!;
    return `${name(mondayFirst[0]!)} – ${name(mondayFirst[mondayFirst.length - 1]!)}`;
  }
  return mondayFirst.map((i) => WEEKDAYS[(i + 1) % 7]).join(', ');
}
