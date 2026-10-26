import { Stack } from 'expo-router';
import { useColors } from '@/core/theme';

export default function SettingsLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: 'systemChromeMaterial',
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    />
  );
}
