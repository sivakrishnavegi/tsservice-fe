import type { SQLiteDatabase } from 'expo-sqlite';
import { readSetting, writeSetting } from '@/core/db/settings-store';
import type { DateKey } from '@/core/dates';
import { DEFAULT_TIFFIN_SETTINGS, tiffinSettingsSchema, type Meal, type MealLog, type MealStatus, type TiffinSettings } from './types';

/** Storage boundary for the Tiffin module — independent of Office. */
export interface TiffinRepository {
  getRange(from: DateKey, to: DateKey): Promise<MealLog[]>;
  /** Writes the log; a log with no status, remark or photo is removed. */
  saveMeal(log: MealLog): Promise<void>;
  getSettings(): Promise<TiffinSettings>;
  saveSettings(settings: TiffinSettings): Promise<void>;
}

const SETTINGS_KEY = 'tiffin.settings';

interface MealRow {
  date: string;
  meal: Meal;
  status: MealStatus;
  remark: string | null;
  photo_uri: string | null;
  updated_at: string;
}

const toLog = (r: MealRow): MealLog => ({
  date: r.date,
  meal: r.meal,
  status: r.status,
  ...(r.remark ? { remark: r.remark } : {}),
  ...(r.photo_uri ? { photoUri: r.photo_uri } : {}),
  updatedAt: r.updated_at,
});

export function createSqliteTiffinRepository(db: SQLiteDatabase): TiffinRepository {
  return {
    async getRange(from, to) {
      const rows = await db.getAllAsync<MealRow>('SELECT * FROM tiffin_meals WHERE date BETWEEN ? AND ? ORDER BY date DESC', from, to);
      return rows.map(toLog);
    },

    async saveMeal(log) {
      if (log.status === 'pending' && !log.remark && !log.photoUri) {
        await db.runAsync('DELETE FROM tiffin_meals WHERE date = ? AND meal = ?', log.date, log.meal);
        return;
      }
      await db.runAsync(
        `INSERT INTO tiffin_meals (date, meal, status, remark, photo_uri, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(date, meal) DO UPDATE SET status = excluded.status, remark = excluded.remark,
           photo_uri = excluded.photo_uri, updated_at = excluded.updated_at`,
        log.date,
        log.meal,
        log.status,
        log.remark ?? null,
        log.photoUri ?? null,
        log.updatedAt,
      );
    },

    getSettings: () => readSetting(db, SETTINGS_KEY, tiffinSettingsSchema, DEFAULT_TIFFIN_SETTINGS),
    saveSettings: (s) => writeSetting(db, SETTINGS_KEY, tiffinSettingsSchema.parse(s)),
  };
}
