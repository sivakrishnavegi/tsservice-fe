import { Alert, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { space } from '@/core/theme';
import { Segmented, Toggle } from '@/core/ui/controls';
import { IconSquare, Row, Section } from '@/core/ui/list';
import { Screen, Skeleton } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useAppSettings, useSaveAppSettings, type AppSettings } from '@/core/settings/app-settings';

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function AppSettingsScreen() {
  const settings = useAppSettings();
  const save = useSaveAppSettings();
  const s = settings.data;

  const set = (next: AppSettings) => save.mutate(next, { onError: (e) => Alert.alert("Couldn't change that", e.message) });

  const toggleModule = (key: keyof AppSettings['modules'], on: boolean) => {
    if (!s) return;
    const modules = { ...s.modules, [key]: on };
    if (!modules.office && !modules.tiffin) return Alert.alert('Keep one module on', 'Turn on the other module first.');
    set({ ...s, modules });
  };

  const toggleLock = async (on: boolean) => {
    if (!s) return;
    if (on) {
      const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hardware || !enrolled) return Alert.alert('Face ID unavailable', 'Set up Face ID or a passcode in the Settings app first.');
      const ok = await LocalAuthentication.authenticateAsync({ promptMessage: 'Turn on Face ID lock' });
      if (!ok.success) return;
    }
    set({ ...s, faceIdLock: on });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Screen>
        {!s ? (
          <Skeleton height={300} />
        ) : (
          <>
            <Section
              header="Modules"
              inset={60}
              footer="Each module keeps its own records and settings. Turning one off hides its tab; nothing is deleted."
            >
              <Row
                title="Office"
                subtitle="Check-in, breaks, shift hours"
                leading={<IconSquare name="briefcase.fill" color="#007AFF" />}
                trailing={
                  <Toggle value={s.modules.office} onValueChange={(v) => toggleModule('office', v)} accessibilityLabel="Office module" />
                }
              />
              <Row
                title="Tiffin"
                subtitle="Breakfast, lunch, dinner"
                leading={<IconSquare name="fork.knife" color="#FF9500" />}
                trailing={
                  <Toggle value={s.modules.tiffin} onValueChange={(v) => toggleModule('tiffin', v)} accessibilityLabel="Tiffin module" />
                }
              />
            </Section>

            <Section header="App" inset={60}>
              <Row
                title="Face ID lock"
                subtitle="Ask when the app opens"
                leading={<IconSquare name="faceid" color="#34C759" />}
                trailing={<Toggle value={s.faceIdLock} onValueChange={(v) => void toggleLock(v)} accessibilityLabel="Face ID lock" />}
              />
              <View style={styles.pad}>
                <View style={styles.inline}>
                  <IconSquare name="circle.lefthalf.filled" color="#8E8E93" />
                  <Text>Appearance</Text>
                </View>
                <Segmented
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  value={s.appearance}
                  onChange={(appearance) => set({ ...s, appearance })}
                  accessibilityLabel="Appearance"
                />
              </View>
              <Row
                title="Timezone"
                value={timezone.split('/').pop()?.replace('_', ' ')}
                leading={<IconSquare name="globe" color="#8E8E93" />}
              />
            </Section>

            <Text variant="footnote" tone="secondary" style={styles.version}>
              {`TS Service ${Constants.expoConfig?.version ?? ''} · Data stays on this iPhone`}
            </Text>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  version: { textAlign: 'center' },
});
