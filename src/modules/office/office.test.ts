import { describe, expect, it } from 'vitest';
import { atClock, formatDuration, formatTime } from '@/core/dates';
import { summarizeDay, summarizeRange, targetMinutes, windowMinutes } from './time';
import { checkIn, checkOut, endBreak, startBreak } from './transitions';
import { DEFAULT_OFFICE_SETTINGS, OfficeError, emptyDay, type OfficeDay, type OfficeSettings } from './types';
import { breakField, validateDraft } from './validation';

const DATE = '2026-09-26'; // a Saturday, a workday in the defaults
const at = (clock: string, date = DATE) => atClock(date, clock);
const iso = (clock: string, date = DATE) => at(clock, date).toISOString();
const S: OfficeSettings = { ...DEFAULT_OFFICE_SETTINGS, includePlannedBreak: false };

function day(partial: Partial<OfficeDay>): OfficeDay {
  return { ...emptyDay(DATE), ...partial };
}

describe('targets', () => {
  it('uses the duration as work time', () => {
    expect(targetMinutes({ mode: 'duration', targetMinutes: 510 }, 45)).toBe(510);
  });
  it('subtracts the planned break from a fixed window', () => {
    expect(targetMinutes({ mode: 'window', startTime: '09:30', endTime: '18:30' }, 30)).toBe(510);
  });
  it('handles windows past midnight', () => {
    expect(windowMinutes('22:00', '06:00')).toBe(480);
  });
});

describe('summarizeDay', () => {
  it('subtracts breaks from time at the office', () => {
    const s = summarizeDay(
      day({ checkIn: iso('09:02'), breaks: [{ id: 'a', label: 'Lunch', start: iso('13:05'), end: iso('13:52') }] }),
      S,
      at('15:01'),
    );
    expect(s.status).toBe('working');
    expect(formatDuration(s.workedMs)).toBe('5h 12m');
    expect(formatDuration(s.breakMs)).toBe('47m');
    expect(formatDuration(s.remainingMs)).toBe('3h 18m');
    expect(formatTime(s.leaveAt!)).toBe('6:19 PM');
  });

  it('pauses work during a running break and pushes leave-at later', () => {
    const s = summarizeDay(
      day({
        checkIn: iso('09:02'),
        breaks: [
          { id: 'a', label: 'Lunch', start: iso('13:05'), end: iso('13:52') },
          { id: 'b', label: 'Break', start: iso('15:01'), end: null },
        ],
      }),
      S,
      at('15:13'),
    );
    expect(s.status).toBe('on_break');
    expect(formatDuration(s.workedMs)).toBe('5h 12m');
    expect(formatDuration(s.openBreakMs)).toBe('12m');
    expect(formatTime(s.leaveAt!)).toBe('6:31 PM');
  });

  it('adds the rest of the planned break to leave-at when enabled', () => {
    const s = summarizeDay(day({ checkIn: iso('09:00') }), { ...S, includePlannedBreak: true, plannedBreakMinutes: 45 }, at('10:00'));
    // 7h 30m of work left + 45m planned break
    expect(formatTime(s.leaveAt!)).toBe('6:15 PM');
  });

  it('reports overtime after checking out', () => {
    const s = summarizeDay(day({ checkIn: iso('09:00'), checkOut: iso('19:00') }), S, at('20:00'));
    expect(s.status).toBe('checked_out');
    expect(formatDuration(s.overtimeMs)).toBe('1h 30m');
  });

  it('does not invent hours for a past day missing its check-out', () => {
    const s = summarizeDay({ ...emptyDay('2026-09-25'), checkIn: iso('09:00', '2026-09-25') }, S, at('10:00'));
    expect(s.missingCheckOut).toBe(true);
    expect(s.workedMs).toBe(0);
  });

  it('has no target on leave or a day off', () => {
    expect(summarizeDay(day({ dayType: 'leave' }), S, at('12:00')).targetMs).toBe(0);
    // 2026-09-27 is a Sunday, not in the default work days
    const sunday = summarizeDay(emptyDay('2026-09-27'), S, at('12:00', '2026-09-27'));
    expect(sunday.status).toBe('day_off');
    expect(sunday.targetMs).toBe(0);
  });

  it('flags late arrival in fixed-hours mode', () => {
    const fixed: OfficeSettings = { ...S, shift: { mode: 'window', startTime: '09:30', endTime: '18:30' }, plannedBreakMinutes: 30 };
    const s = summarizeDay(day({ checkIn: iso('09:42') }), fixed, at('10:00'));
    expect(s.lateMinutes).toBe(12);
    expect(formatTime(s.scheduledEnd!)).toBe('6:30 PM');
  });
});

describe('summarizeRange', () => {
  it('nets finished days and ignores the running one for balance', () => {
    const finished = summarizeDay(day({ checkIn: iso('09:00'), checkOut: iso('18:00') }), S, at('20:00')); // 9h vs 8h30
    const running = summarizeDay({ ...emptyDay('2026-09-28'), checkIn: iso('09:00', '2026-09-28') }, S, at('10:00', '2026-09-28'));
    const t = summarizeRange([finished, running]);
    expect(formatDuration(t.balanceMs)).toBe('30m');
    expect(formatDuration(t.workedMs)).toBe('10h');
  });
});

describe('transitions', () => {
  it('runs a full day', () => {
    let d = checkIn(emptyDay(DATE), at('09:00'));
    d = startBreak(d, at('13:00'), 'Lunch');
    expect(() => startBreak(d, at('13:10'))).toThrow(OfficeError);
    d = endBreak(d, at('13:45'));
    d = checkOut(d, at('18:15'));
    const s = summarizeDay(d, S, at('19:00'));
    expect(formatDuration(s.workedMs)).toBe('8h 30m');
  });

  it('closes a running break on check-out', () => {
    let d = checkIn(emptyDay(DATE), at('09:00'));
    d = startBreak(d, at('17:00'));
    d = checkOut(d, at('17:30'));
    expect(d.breaks[0]!.end).toBe(iso('17:30'));
  });

  it('refuses to check in twice', () => {
    const d = checkIn(emptyDay(DATE), at('09:00'));
    expect(() => checkIn(d, at('09:05'))).toThrow("You're already checked in.");
  });
});

describe('validateDraft', () => {
  const now = at('16:00');
  it('accepts a normal manual entry', () => {
    expect(
      validateDraft(
        {
          dayType: 'workday',
          checkIn: at('09:00'),
          checkOut: null,
          breaks: [{ id: 'a', label: 'Lunch', start: at('13:00'), end: at('13:30') }],
        },
        DATE,
        now,
      ),
    ).toEqual({});
  });
  it('rejects a break before check-in and a future check-in', () => {
    const e = validateDraft({ dayType: 'workday', checkIn: at('17:00'), checkOut: null, breaks: [] }, DATE, now);
    expect(e.checkIn).toMatch(/future/);
    const e2 = validateDraft(
      { dayType: 'workday', checkIn: at('10:00'), checkOut: null, breaks: [{ id: 'a', label: 'x', start: at('09:00'), end: at('09:30') }] },
      DATE,
      now,
    );
    expect(e2[breakField('a', 'start')]).toMatch(/after check-in/);
  });
  it('rejects overlapping breaks and check-out before check-in', () => {
    const e = validateDraft(
      {
        dayType: 'workday',
        checkIn: at('09:00'),
        checkOut: at('08:00'),
        breaks: [
          { id: 'a', label: 'x', start: at('12:00'), end: at('13:00') },
          { id: 'b', label: 'y', start: at('12:30'), end: at('12:45') },
        ],
      },
      DATE,
      now,
    );
    expect(e.checkOut).toMatch(/after check-in/);
    expect(e[breakField('b', 'start')]).toMatch(/overlap/);
  });
  it('requires an end for breaks on past days', () => {
    const e = validateDraft(
      {
        dayType: 'workday',
        checkIn: at('09:00', '2026-09-25'),
        checkOut: at('18:00', '2026-09-25'),
        breaks: [{ id: 'a', label: 'x', start: at('13:00', '2026-09-25'), end: null }],
      },
      '2026-09-25',
      now,
    );
    expect(e[breakField('a', 'end')]).toBeTruthy();
  });
});
