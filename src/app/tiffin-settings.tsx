import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { atClock, minutesToClock } from '@/core/dates';
import { space, type as typeScale, useColors, useTint } from '@/core/theme';
import { TimePicker, Toggle } from '@/core/ui/controls';
import { Row, Section } from '@/core/ui/list';
import { Screen, Skeleton } from '@/core/ui/states';
import { WeekdayPicker } from '@/core/ui/weekday-picker';
import { Text } from '@/core/ui/text';
import { ensureNotificationPermission } from '@/core/notifications';
import { useSaveTiffinSettings, useTiffinSettings } from '@/modules/tiffin/queries';
import { MEALS, MEAL_LABEL, type TiffinSettings } from '@/modules/tiffin/types';

export default function TiffinSettingsSheet() {
  const settings = useTiffinSettings();
  const save = useSaveTiffinSettings();
  const c = useColors();
  const tint = useTint('tiffin');
  const s = settings.data;

  const set = (patch: Partial<TiffinSettings>) =>
    s && save.mutate({ ...s, ...patch }, { onError: (e) => Alert.alert("Couldn't save", e.message) });

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Screen>
        {!s ? (
          <Skeleton height={300} />
        ) : (
          <>
            <Section header="Meals" footer="Turn off a meal you don't take. It won't show on the Tiffin tab or count in history.">
              {MEALS.map((meal) => {
                const cfg = s.meals[meal];
                return (
                  <Row
                    key={meal}
                    title={MEAL_LABEL[meal]}
                    subtitle={cfg.enabled ? 'Usual time' : 'Not tracked'}
                    trailing={
                      <View style={styles.inline}>
                        {cfg.enabled && (
                          <TimePicker
                            value={atClock('2000-01-01', cfg.time)}
                            minuteInterval={5}
                            tint={tint.base}
                            onChange={(d) =>
                              set({ meals: { ...s.meals, [meal]: { ...cfg, time: minutesToClock(d.getHours() * 60 + d.getMinutes()) } } })
                            }
                            accessibilityLabel={`${MEAL_LABEL[meal]} usual time`}
                          />
                        )}
                        <Toggle
                          value={cfg.enabled}
                          onValueChange={(v) => set({ meals: { ...s.meals, [meal]: { ...cfg, enabled: v } } })}
                          accessibilityLabel={`Track ${MEAL_LABEL[meal]}`}
                        />
                      </View>
                    }
                  />
                );
              })}
            </Section>

            <Section header="Reminders">
              <Row
                title="Remind me to mark meals"
                subtitle={`${s.reminderDelayMinutes} minutes after each usual time`}
                trailing={
                  <Toggle
                    value={s.reminders}
                    accessibilityLabel="Meal reminders"
                    onValueChange={async (v) => {
                      if (v && !(await ensureNotificationPermission())) {
                        return Alert.alert(
                          'Notifications are off',
                          'Allow notifications for TS Service in the Settings app to get reminders.',
                        );
                      }
                      set({ reminders: v });
                    }}
                  />
                }
              />
            </Section>

            <Section header="Service">
              <View style={styles.pad}>
                <Text variant="footnote" tone="secondary">
                  Provider name
                </Text>
                <TextInput
                  defaultValue={s.providerName}
                  onEndEditing={(e) => {
                    const v = e.nativeEvent.text.trim();
                    if (v !== s.providerName) set({ providerName: v });
                  }}
                  placeholder="Annapurna Tiffins"
                  placeholderTextColor={c.tertiary}
                  maxLength={60}
                  returnKeyType="done"
                  accessibilityLabel="Provider name"
                  style={[typeScale.body, { color: c.label, paddingVertical: 4 }]}
                />
              </View>
              <WeekdayPicker title="Service days" value={s.serviceDays} tint={tint.fill} onChange={(days) => set({ serviceDays: days })} />
            </Section>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pad: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xs },
});
