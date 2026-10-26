import { Alert, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { atClock, formatClock, formatDuration, minutesToClock } from '@/core/dates';
import { space, useTint } from '@/core/theme';
import { DurationPicker, Segmented, TimePicker, Toggle } from '@/core/ui/controls';
import { Row, Section } from '@/core/ui/list';
import { Screen, Skeleton } from '@/core/ui/states';
import { WeekdayPicker } from '@/core/ui/weekday-picker';
import { Text } from '@/core/ui/text';
import { useOfficeSettings, useSaveOfficeSettings } from '@/modules/office/queries';
import { ensureNotificationPermission } from '@/core/notifications';
import { targetMinutes } from '@/modules/office/time';
import type { OfficeSettings } from '@/modules/office/types';

const BREAKS = [0, 30, 45, 60] as const;
const clockOf = (d: Date) => minutesToClock(d.getHours() * 60 + d.getMinutes());

export default function OfficeSettingsSheet() {
  const settings = useOfficeSettings();
  const save = useSaveOfficeSettings();
  const tint = useTint('office');
  const s = settings.data;

  const set = (patch: Partial<OfficeSettings>) => {
    if (!s) return;
    save.mutate({ ...s, ...patch }, { onError: (e) => Alert.alert("Couldn't save", e.message) });
  };

  const setReminder = async (key: keyof OfficeSettings['reminders'], value: boolean) => {
    if (!s) return;
    if (value && !(await ensureNotificationPermission())) {
      return Alert.alert('Notifications are off', 'Allow notifications for TS Service in the Settings app to get reminders.');
    }
    set({ reminders: { ...s.reminders, [key]: value } });
  };

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
            <Section
              header="Shift"
              footer={
                s.shift.mode === 'window'
                  ? `Daily target ${formatDuration(targetMinutes(s.shift, s.plannedBreakMinutes) * 60_000)}: the window minus your planned break. Arriving after the start counts as late.`
                  : 'Target is work time only. Breaks are added on top when working out your leave-at time.'
              }
            >
              <View style={styles.pad}>
                <Segmented
                  options={[
                    { value: 'window', label: 'Fixed hours' },
                    { value: 'duration', label: 'Hours per day' },
                  ]}
                  value={s.shift.mode}
                  onChange={(mode) =>
                    set({
                      shift:
                        mode === 'window'
                          ? {
                              mode,
                              startTime: '09:30',
                              endTime: minutesToClock(9 * 60 + 30 + targetMinutes(s.shift, s.plannedBreakMinutes) + s.plannedBreakMinutes),
                            }
                          : { mode, targetMinutes: targetMinutes(s.shift, s.plannedBreakMinutes) },
                    })
                  }
                  accessibilityLabel="Shift type"
                />
              </View>
              {s.shift.mode === 'window' ? (
                <>
                  <Row
                    title="Starts"
                    trailing={
                      <TimePicker
                        value={atClock('2000-01-01', s.shift.startTime)}
                        minuteInterval={5}
                        tint={tint.base}
                        onChange={(d) => s.shift.mode === 'window' && set({ shift: { ...s.shift, startTime: clockOf(d) } })}
                        accessibilityLabel="Shift start"
                      />
                    }
                  />
                  <Row
                    title="Ends"
                    subtitle={s.shift.endTime <= s.shift.startTime ? 'Next day' : undefined}
                    trailing={
                      <TimePicker
                        value={atClock('2000-01-01', s.shift.endTime)}
                        minuteInterval={5}
                        tint={tint.base}
                        onChange={(d) => s.shift.mode === 'window' && set({ shift: { ...s.shift, endTime: clockOf(d) } })}
                        accessibilityLabel="Shift end"
                      />
                    }
                  />
                </>
              ) : (
                <View style={styles.pad}>
                  <Text>Work per day</Text>
                  <DurationPicker
                    minutes={s.shift.targetMinutes}
                    onChange={(m) => s.shift.mode === 'duration' && set({ shift: { mode: 'duration', targetMinutes: m } })}
                    accessibilityLabel="Work per day"
                  />
                </View>
              )}
              <WeekdayPicker title="Work days" value={s.workDays} tint={tint.fill} onChange={(days) => set({ workDays: days })} />
            </Section>

            <Section
              header="Breaks"
              footer={`Until you log real breaks, leave-at includes the rest of a ${s.plannedBreakMinutes}-minute break.`}
            >
              <View style={styles.pad}>
                <Text>Planned lunch break</Text>
                <Segmented
                  options={BREAKS.map((b) => ({ value: String(b), label: b === 0 ? 'None' : `${b} min` }))}
                  value={String(s.plannedBreakMinutes)}
                  onChange={(v) => set({ plannedBreakMinutes: Number(v) })}
                  accessibilityLabel="Planned lunch break"
                />
              </View>
              <Row
                title="Include in leave-at"
                trailing={
                  <Toggle
                    value={s.includePlannedBreak}
                    onValueChange={(v) => set({ includePlannedBreak: v })}
                    accessibilityLabel="Include planned break in leave-at"
                  />
                }
              />
            </Section>

            <Section header="Reminders">
              <Row
                title="Leave-at time"
                subtitle="15 minutes before"
                trailing={
                  <Toggle
                    value={s.reminders.leaveAt}
                    onValueChange={(v) => void setReminder('leaveAt', v)}
                    accessibilityLabel="Leave-at reminder"
                  />
                }
              />
              <Row
                title="Forgot to check out"
                subtitle={`At ${formatClock(s.forgotCheckOutTime)} if still checked in`}
                trailing={
                  <Toggle
                    value={s.reminders.forgotCheckOut}
                    onValueChange={(v) => void setReminder('forgotCheckOut', v)}
                    accessibilityLabel="Forgot to check out reminder"
                  />
                }
              />
              <Row
                title="Long break"
                subtitle={`When a break passes ${s.longBreakMinutes} minutes`}
                trailing={
                  <Toggle
                    value={s.reminders.longBreak}
                    onValueChange={(v) => void setReminder('longBreak', v)}
                    accessibilityLabel="Long break reminder"
                  />
                }
              />
            </Section>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
});
