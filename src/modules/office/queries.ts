import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todayKey, type DateKey } from '@/core/dates';
import { syncOfficeReminders } from './reminders';
import { createSqliteOfficeRepository, type OfficeRepository } from './repository';
import * as T from './transitions';
import type { DayType, OfficeDay, OfficeSettings } from './types';

export const officeKeys = {
  all: ['office'] as const,
  settings: ['office', 'settings'] as const,
  day: (date: DateKey) => ['office', 'day', date] as const,
  range: (from: DateKey, to: DateKey) => ['office', 'range', from, to] as const,
};

export function useOfficeRepository(): OfficeRepository {
  const db = useSQLiteContext();
  return useMemo(() => createSqliteOfficeRepository(db), [db]);
}

export function useOfficeSettings() {
  const repo = useOfficeRepository();
  return useQuery({ queryKey: officeKeys.settings, queryFn: () => repo.getSettings(), staleTime: Infinity });
}

export function useOfficeDay(date: DateKey) {
  const repo = useOfficeRepository();
  return useQuery({ queryKey: officeKeys.day(date), queryFn: () => repo.getDay(date) });
}

export function useOfficeRange(from: DateKey, to: DateKey) {
  const repo = useOfficeRepository();
  return useQuery({ queryKey: officeKeys.range(from, to), queryFn: () => repo.getDays(from, to) });
}

/** Saves a day, refreshes every office view and re-plans today's reminders. */
function useSaveDay() {
  const repo = useOfficeRepository();
  const qc = useQueryClient();
  return async (day: OfficeDay) => {
    await repo.saveDay(day);
    qc.setQueryData(officeKeys.day(day.date), day);
    await qc.invalidateQueries({ queryKey: officeKeys.all, refetchType: 'active' });
    if (day.date === todayKey()) {
      const settings = await repo.getSettings();
      void syncOfficeReminders(day, settings).catch(() => undefined);
    }
  };
}

type Action = 'checkIn' | 'checkOut' | 'startBreak' | 'endBreak' | 'undoCheckOut';

/** Today's one-tap actions. Times come from the moment you tap. */
export function useOfficeAction() {
  const repo = useOfficeRepository();
  const save = useSaveDay();
  return useMutation({
    mutationFn: async (action: Action) => {
      const now = new Date();
      const day = await repo.getDay(todayKey(now));
      const next =
        action === 'checkIn'
          ? T.checkIn(day, now)
          : action === 'checkOut'
            ? T.checkOut(day, now)
            : action === 'startBreak'
              ? T.startBreak(day, now)
              : action === 'endBreak'
                ? T.endBreak(day, now)
                : T.undoCheckOut(day, now);
      await save(next);
      return next;
    },
  });
}

export function useSaveOfficeDay() {
  const save = useSaveDay();
  return useMutation({ mutationFn: save });
}

export function useSetDayType() {
  const repo = useOfficeRepository();
  const save = useSaveDay();
  return useMutation({
    mutationFn: async ({ date, dayType }: { date: DateKey; dayType: DayType }) => save(T.setDayType(await repo.getDay(date), dayType)),
  });
}

export function useSaveOfficeSettings() {
  const repo = useOfficeRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: OfficeSettings) => {
      await repo.saveSettings(settings);
      return settings;
    },
    onMutate: (settings) => qc.setQueryData(officeKeys.settings, settings),
    onSuccess: async (settings) => {
      await qc.invalidateQueries({ queryKey: officeKeys.all });
      void syncOfficeReminders(await repo.getDay(todayKey()), settings).catch(() => undefined);
    },
  });
}
