import { describe, expect, it } from 'vitest';
import { countRange, datesWithLogs, statusOf } from './stats';
import { applyMealChange } from './meal-log';
import { DEFAULT_TIFFIN_SETTINGS, enabledMeals, type MealLog } from './types';

const log = (date: string, meal: MealLog['meal'], status: MealLog['status']): MealLog => ({
  date,
  meal,
  status,
  updatedAt: '2026-09-26T00:00:00Z',
});

describe('tiffin stats', () => {
  const logs = [
    log('2026-09-25', 'breakfast', 'received'),
    log('2026-09-25', 'lunch', 'received'),
    log('2026-09-25', 'dinner', 'not_received'),
    log('2026-09-26', 'breakfast', 'leave'),
  ];

  it('counts every tracked meal in the range, unmarked as pending', () => {
    const c = countRange(logs, DEFAULT_TIFFIN_SETTINGS, '2026-09-25', '2026-09-26', enabledMeals(DEFAULT_TIFFIN_SETTINGS));
    expect(c).toEqual({ received: 2, not_received: 1, leave: 1, pending: 2 });
  });

  it('skips meals you turned off and non-service days', () => {
    const s = {
      ...DEFAULT_TIFFIN_SETTINGS,
      meals: { ...DEFAULT_TIFFIN_SETTINGS.meals, dinner: { enabled: false, time: '20:30' } },
      serviceDays: [5],
    };
    // 2026-09-25 is a Friday (5); 26th is Saturday, excluded
    expect(countRange(logs, s, '2026-09-25', '2026-09-26', enabledMeals(s))).toEqual({
      received: 2,
      not_received: 0,
      leave: 0,
      pending: 0,
    });
  });

  it('looks up status and dates', () => {
    expect(statusOf(logs, '2026-09-26', 'lunch')).toBe('pending');
    expect(datesWithLogs(logs)).toEqual(['2026-09-26', '2026-09-25']);
  });
});

describe('applyMealChange', () => {
  const now = new Date('2026-09-26T10:00:00Z');
  it('creates, updates and clears fields', () => {
    const a = applyMealChange(undefined, { date: '2026-09-26', meal: 'lunch', status: 'received' }, now);
    expect(a).toMatchObject({ status: 'received' });
    const b = applyMealChange(a, { date: '2026-09-26', meal: 'lunch', remark: '  late ', photoUri: 'file:///p.jpg' }, now);
    expect(b).toMatchObject({ status: 'received', remark: 'late', photoUri: 'file:///p.jpg' });
    const c = applyMealChange(b, { date: '2026-09-26', meal: 'lunch', remark: '', photoUri: null }, now);
    expect(c.remark).toBeUndefined();
    expect(c.photoUri).toBeUndefined();
    expect(c.status).toBe('received');
  });
});
