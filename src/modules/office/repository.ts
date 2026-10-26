import type { SQLiteDatabase } from 'expo-sqlite';
import { readSetting, writeSetting } from '@/core/db/settings-store';
import type { DateKey } from '@/core/dates';
import { DEFAULT_OFFICE_SETTINGS, emptyDay, officeSettingsSchema, type DayType, type OfficeDay, type OfficeSettings } from './types';

/**
 * Storage boundary for the Office module. The app talks only to this interface,
 * so a remote backend can replace the on-device implementation later.
 */
export interface OfficeRepository {
  getDay(date: DateKey): Promise<OfficeDay>;
  /** Only days that have something recorded. */
  getDays(from: DateKey, to: DateKey): Promise<OfficeDay[]>;
  saveDay(day: OfficeDay): Promise<void>;
  getSettings(): Promise<OfficeSettings>;
  saveSettings(settings: OfficeSettings): Promise<void>;
}

const SETTINGS_KEY = 'office.settings';

interface DayRow {
  date: string;
  day_type: DayType;
  check_in: string | null;
  check_out: string | null;
  note: string | null;
}
interface BreakRow {
  id: string;
  date: string;
  start: string;
  end: string | null;
  label: string;
}

function toDay(row: DayRow, breaks: BreakRow[]): OfficeDay {
  return {
    date: row.date,
    dayType: row.day_type,
    checkIn: row.check_in,
    checkOut: row.check_out,
    ...(row.note ? { note: row.note } : {}),
    breaks: breaks.map((b) => ({ id: b.id, label: b.label, start: b.start, end: b.end })),
  };
}

const isEmpty = (d: OfficeDay) => d.dayType === 'workday' && !d.checkIn && !d.checkOut && d.breaks.length === 0 && !d.note;

export function createSqliteOfficeRepository(db: SQLiteDatabase): OfficeRepository {
  return {
    async getDay(date) {
      const row = await db.getFirstAsync<DayRow>('SELECT * FROM office_days WHERE date = ?', date);
      if (!row) return emptyDay(date);
      const breaks = await db.getAllAsync<BreakRow>('SELECT * FROM office_breaks WHERE date = ? ORDER BY start', date);
      return toDay(row, breaks);
    },

    async getDays(from, to) {
      const [rows, breaks] = await Promise.all([
        db.getAllAsync<DayRow>('SELECT * FROM office_days WHERE date BETWEEN ? AND ? ORDER BY date DESC', from, to),
        db.getAllAsync<BreakRow>('SELECT * FROM office_breaks WHERE date BETWEEN ? AND ? ORDER BY start', from, to),
      ]);
      const byDate = Map.groupBy(breaks, (b) => b.date);
      return rows.map((r) => toDay(r, byDate.get(r.date) ?? []));
    },

    async saveDay(day) {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync('DELETE FROM office_breaks WHERE date = ?', day.date);
        if (isEmpty(day)) {
          await txn.runAsync('DELETE FROM office_days WHERE date = ?', day.date);
          return;
        }
        await txn.runAsync(
          `INSERT INTO office_days (date, day_type, check_in, check_out, note) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET day_type = excluded.day_type, check_in = excluded.check_in,
             check_out = excluded.check_out, note = excluded.note`,
          day.date,
          day.dayType,
          day.checkIn,
          day.checkOut,
          day.note ?? null,
        );
        for (const b of day.breaks) {
          await txn.runAsync(
            'INSERT INTO office_breaks (id, date, start, end, label) VALUES (?, ?, ?, ?, ?)',
            b.id,
            day.date,
            b.start,
            b.end,
            b.label,
          );
        }
      });
    },

    getSettings: () => readSetting(db, SETTINGS_KEY, officeSettingsSchema, DEFAULT_OFFICE_SETTINGS),
    saveSettings: (s) => writeSetting(db, SETTINGS_KEY, officeSettingsSchema.parse(s)),
  };
}
