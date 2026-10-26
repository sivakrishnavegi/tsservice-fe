import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DateKey } from '@/core/dates';
import { deleteMealPhoto } from './photos';
import { syncTiffinReminders } from './reminders';
import { createSqliteTiffinRepository, type TiffinRepository } from './repository';
import { applyMealChange, type MealChange } from './meal-log';
import type { MealLog, TiffinSettings } from './types';

export type { MealChange };

export const tiffinKeys = {
  all: ['tiffin'] as const,
  settings: ['tiffin', 'settings'] as const,
  range: (from: DateKey, to: DateKey) => ['tiffin', 'range', from, to] as const,
};

export function useTiffinRepository(): TiffinRepository {
  const db = useSQLiteContext();
  return useMemo(() => createSqliteTiffinRepository(db), [db]);
}

export function useTiffinSettings() {
  const repo = useTiffinRepository();
  return useQuery({ queryKey: tiffinKeys.settings, queryFn: () => repo.getSettings(), staleTime: Infinity });
}

export function useTiffinRange(from: DateKey, to: DateKey) {
  const repo = useTiffinRepository();
  return useQuery({ queryKey: tiffinKeys.range(from, to), queryFn: () => repo.getRange(from, to) });
}

/** Optimistic: buttons respond instantly and roll back if the write fails. */
export function useUpdateMeal() {
  const repo = useTiffinRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (changes: MealChange[]) => {
      const now = new Date();
      for (const ch of changes) {
        const existing = (await repo.getRange(ch.date, ch.date)).find((l) => l.meal === ch.meal);
        const next = applyMealChange(existing, ch, now);
        await repo.saveMeal(next);
        if (existing?.photoUri && existing.photoUri !== next.photoUri) deleteMealPhoto(existing.photoUri);
      }
    },
    onMutate: async (changes) => {
      await qc.cancelQueries({ queryKey: tiffinKeys.all });
      const snapshots = qc.getQueriesData<MealLog[]>({ queryKey: ['tiffin', 'range'] });
      const now = new Date();
      for (const [key, logs] of snapshots) {
        if (!logs) continue;
        const [, , from, to] = key as readonly [string, string, string, string];
        let next = [...logs];
        for (const ch of changes) {
          if (ch.date < from || ch.date > to) continue;
          const i = next.findIndex((l) => l.date === ch.date && l.meal === ch.meal);
          const merged = applyMealChange(i >= 0 ? next[i] : undefined, ch, now);
          next = i >= 0 ? next.map((l, j) => (j === i ? merged : l)) : [...next, merged];
        }
        qc.setQueryData(key, next);
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: tiffinKeys.all }),
  });
}

export function useSaveTiffinSettings() {
  const repo = useTiffinRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: TiffinSettings) => {
      await repo.saveSettings(settings);
      return settings;
    },
    onMutate: (settings) => qc.setQueryData(tiffinKeys.settings, settings),
    onSuccess: (settings) => {
      void qc.invalidateQueries({ queryKey: tiffinKeys.all });
      void syncTiffinReminders(settings).catch(() => undefined);
    },
  });
}
