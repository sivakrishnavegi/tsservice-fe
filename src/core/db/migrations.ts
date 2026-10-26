import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Ordered, append-only. Each module owns its own tables; nothing joins across modules.
 * Never edit a shipped migration — add a new one.
 */
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

  CREATE TABLE office_days (
    date TEXT PRIMARY KEY NOT NULL,
    day_type TEXT NOT NULL DEFAULT 'workday',
    check_in TEXT,
    check_out TEXT,
    note TEXT
  );
  CREATE TABLE office_breaks (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT,
    label TEXT NOT NULL DEFAULT 'Break'
  );
  CREATE INDEX office_breaks_date ON office_breaks (date);

  CREATE TABLE tiffin_meals (
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    status TEXT NOT NULL,
    remark TEXT,
    photo_uri TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (date, meal)
  );
  CREATE INDEX tiffin_meals_date ON tiffin_meals (date);
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[v]!);
      await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
