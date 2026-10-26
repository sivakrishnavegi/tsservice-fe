import type { SQLiteDatabase } from 'expo-sqlite';
import type { ZodType } from 'zod';

/**
 * Key/value JSON settings. Each module reads and writes only its own key,
 * validated by its own schema, falling back to defaults on missing or corrupt data.
 */
export async function readSetting<T>(db: SQLiteDatabase, key: string, schema: ZodType<T>, fallback: T): Promise<T> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  if (!row) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export async function writeSetting<T>(db: SQLiteDatabase, key: string, value: T): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}
