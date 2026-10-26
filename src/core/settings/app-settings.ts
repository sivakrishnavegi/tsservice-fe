import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { readSetting, writeSetting } from '@/core/db/settings-store';

/** App-wide only: which modules are on, lock, appearance. Module settings live in their modules. */
export const appSettingsSchema = z.object({
  modules: z.object({ office: z.boolean(), tiffin: z.boolean() }),
  faceIdLock: z.boolean(),
  appearance: z.enum(['system', 'light', 'dark']),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  modules: { office: true, tiffin: true },
  faceIdLock: false,
  appearance: 'system',
};

const KEY = 'app.settings';
const queryKey = ['app', 'settings'] as const;

export function useAppSettings() {
  const db = useSQLiteContext();
  return useQuery({ queryKey, queryFn: () => readSetting(db, KEY, appSettingsSchema, DEFAULT_APP_SETTINGS), staleTime: Infinity });
}

export function useSaveAppSettings() {
  const db = useSQLiteContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: AppSettings) => {
      // At least one module must stay on.
      if (!next.modules.office && !next.modules.tiffin) throw new Error('Keep at least one module on.');
      await writeSetting(db, KEY, next);
      return next;
    },
    onMutate: (next) => {
      const prev = qc.getQueryData<AppSettings>(queryKey);
      qc.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(queryKey, ctx.prev),
  });
}

/** Applies the Appearance choice to the whole app (native views included). */
export function useApplyAppearance(appearance: AppSettings['appearance'] | undefined) {
  useEffect(() => {
    if (!appearance) return;
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);
}
