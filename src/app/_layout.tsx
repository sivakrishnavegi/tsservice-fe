import { Suspense, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { migrate } from '@/core/db/migrations';
import { useAppSettings, useApplyAppearance } from '@/core/settings/app-settings';
import { useColors } from '@/core/theme';
import { LockGate } from '@/core/ui/lock-screen';

void SplashScreen.preventAutoHideAsync();

// Show reminders as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// React Native has no window focus; refetch when the app comes back.
AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: 0 } } }),
  );
  return (
    <Suspense fallback={null}>
      <SQLiteProvider databaseName="tsservice.db" onInit={migrate} useSuspense>
        <QueryClientProvider client={queryClient}>
          <AppShell />
        </QueryClientProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

function AppShell() {
  const c = useColors();
  const settings = useAppSettings();
  useApplyAppearance(settings.data?.appearance);

  useEffect(() => {
    if (settings.isSuccess || settings.isError) void SplashScreen.hideAsync();
  }, [settings.isSuccess, settings.isError]);

  if (!settings.data) return null;

  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    headerShown: true,
    contentStyle: { backgroundColor: c.bg },
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="office-day/[date]" options={{ ...sheet, sheetAllowedDetents: [0.92], title: 'Day' }} />
        <Stack.Screen name="office-settings" options={{ ...sheet, sheetAllowedDetents: [0.92], title: 'Office settings' }} />
        <Stack.Screen name="tiffin-meal/[date]/[meal]" options={{ ...sheet, sheetAllowedDetents: [0.75, 0.95], title: 'Meal' }} />
        <Stack.Screen name="tiffin-settings" options={{ ...sheet, sheetAllowedDetents: [0.92], title: 'Tiffin settings' }} />
      </Stack>
      <LockGate enabled={settings.data.faceIdLock} />
    </View>
  );
}
