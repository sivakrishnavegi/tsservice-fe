import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { atClock, formatDayShort, formatDuration, formatTime, MINUTE, todayKey, withTimeOf } from '@/core/dates';
import { newId } from '@/core/ids';
import { space, useColors, useTint } from '@/core/theme';
import { Button } from '@/core/ui/button';
import { Segmented, TimePicker } from '@/core/ui/controls';
import { Card, Row, Section } from '@/core/ui/list';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Message, Screen, Skeleton } from '@/core/ui/states';
import { StatRow } from '@/core/ui/stats';
import { Text } from '@/core/ui/text';
import { useOfficeDay, useOfficeSettings, useSaveOfficeDay } from '@/modules/office/queries';
import { summarizeDay } from '@/modules/office/time';
import type { DayType, OfficeDay, OfficeSettings } from '@/modules/office/types';
import { breakField, dayFromDraft, draftFromDay, validateDraft, type DayDraft, type DraftErrors } from '@/modules/office/validation';

const DAY_TYPES: readonly { value: DayType; label: string }[] = [
  { value: 'workday', label: 'Workday' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
];

export default function OfficeDayEditor() {
  const { date = todayKey() } = useLocalSearchParams<{ date: string }>();
  const day = useOfficeDay(date);
  const settings = useOfficeSettings();
  if (day.isError) {
    return (
      <Screen>
        <Message icon="exclamationmark.triangle" title="Couldn't load this day" body={day.error.message} />
      </Screen>
    );
  }
  if (!day.data || !settings.data) {
    return (
      <Screen>
        <Skeleton height={320} />
      </Screen>
    );
  }
  return <DayForm date={date} day={day.data} settings={settings.data} />;
}

function DayForm({ date, day, settings }: { date: string; day: OfficeDay; settings: OfficeSettings }) {
  const save = useSaveOfficeDay();
  const c = useColors();
  const tint = useTint('office');
  const [initial] = useState(() => draftFromDay(day));
  const [draft, setDraft] = useState<DayDraft>(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const initialJson = useMemo(() => JSON.stringify(dayFromDraft(date, initial)), [date, initial]);

  const now = new Date();
  const isToday = date === todayKey(now);
  const dirty = JSON.stringify(dayFromDraft(date, draft)) !== initialJson;

  const preview = useMemo(() => summarizeDay(dayFromDraft(date, draft), settings, new Date()), [draft, settings, date]);

  const update = (patch: Partial<DayDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };

  const onSave = () => {
    const found = validateDraft(draft, date, new Date());
    if (Object.keys(found).length) return setErrors(found);
    save.mutate(dayFromDraft(date, draft, day.note), {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert("Couldn't save", e.message),
    });
  };

  const onCancel = () => {
    if (!dirty) return router.back();
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const defaultTime = (clock: string) => {
    const t = atClock(date, clock);
    return isToday && t > now ? now : t;
  };

  const addBreak = () => {
    const last = draft.breaks.at(-1);
    let start = last?.end ? new Date(last.end.getTime() + 60 * MINUTE) : defaultTime('13:00');
    if (draft.checkIn && start < draft.checkIn) start = new Date(draft.checkIn.getTime() + 60 * MINUTE);
    if (isToday && start > now) start = new Date(now.getTime() - 30 * MINUTE);
    let end = new Date(start.getTime() + 30 * MINUTE);
    if (isToday && end > now) end = now;
    update({ breaks: [...draft.breaks, { id: newId(), label: draft.breaks.length === 0 ? 'Lunch' : 'Break', start, end }] });
  };

  const err = (key: string, inRow = false) =>
    errors[key] ? (
      <Text variant="footnote" tone="redText" style={inRow ? styles.rowError : styles.error} accessibilityLiveRegion="polite">
        {errors[key]}
      </Text>
    ) : null;

  return (
    <>
      <Stack.Screen options={{ title: isToday ? 'Today' : formatDayShort(date) }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onCancel}>Cancel</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" disabled={save.isPending} onPress={onSave}>
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <Screen>
        <Segmented options={DAY_TYPES} value={draft.dayType} onChange={(dayType) => update({ dayType })} accessibilityLabel="Day type" />

        {draft.dayType === 'workday' ? (
          <>
            <Section
              header="Check in"
              footer={isToday ? 'Use this when you forgot to tap Check in. Times can’t be in the future.' : undefined}
            >
              <Row
                title="Arrived at"
                trailing={
                  draft.checkIn ? (
                    <View style={styles.inline}>
                      <TimePicker
                        value={draft.checkIn}
                        tint={tint.base}
                        maximumDate={isToday ? now : undefined}
                        onChange={(t) => update({ checkIn: withTimeOf(date, t) })}
                        accessibilityLabel="Check-in time"
                      />
                      <ClearButton label="Clear check-in" onPress={() => update({ checkIn: null, checkOut: null, breaks: [] })} />
                    </View>
                  ) : (
                    <Button
                      size="sm"
                      label="Set time"
                      background={tint.bg}
                      foreground={tint.text}
                      onPress={() => update({ checkIn: defaultTime('09:30') })}
                    />
                  )
                }
              />
            </Section>
            {err('checkIn')}

            <Section
              header="Breaks"
              headerRight={
                preview ? <Text variant="footnote" tone="secondary">{`${formatDuration(preview.breakMs)} total`}</Text> : undefined
              }
              inset={56}
              footer="Breaks are taken off your worked time and push your leave-at time later."
            >
              {draft.breaks.map((b) => (
                <View key={b.id}>
                  <View style={styles.breakRow}>
                    <ClearButton
                      label={`Remove ${b.label}`}
                      destructive
                      onPress={() => update({ breaks: draft.breaks.filter((x) => x.id !== b.id) })}
                    />
                    <Text style={styles.flex}>{b.label}</Text>
                    <TimePicker
                      value={b.start}
                      tint={tint.base}
                      onChange={(t) =>
                        update({ breaks: draft.breaks.map((x) => (x.id === b.id ? { ...x, start: withTimeOf(date, t) } : x)) })
                      }
                      accessibilityLabel={`${b.label} start`}
                    />
                    <Text tone="secondary">–</Text>
                    {b.end ? (
                      <TimePicker
                        value={b.end}
                        tint={tint.base}
                        onChange={(t) =>
                          update({ breaks: draft.breaks.map((x) => (x.id === b.id ? { ...x, end: withTimeOf(date, t) } : x)) })
                        }
                        accessibilityLabel={`${b.label} end`}
                      />
                    ) : (
                      <Button
                        size="sm"
                        label="End now"
                        background={c.indigoBg}
                        foreground={c.indigoText}
                        onPress={() => update({ breaks: draft.breaks.map((x) => (x.id === b.id ? { ...x, end: new Date() } : x)) })}
                      />
                    )}
                  </View>
                  {err(breakField(b.id, 'start'), true)}
                  {err(breakField(b.id, 'end'), true)}
                </View>
              ))}
              <Row
                title="Add break"
                titleColor={tint.text}
                leading={<SymbolView name="plus.circle.fill" size={22} tintColor={tint.text} />}
                onPress={addBreak}
              />
            </Section>

            <Section header="Check out">
              <Row
                title="Left at"
                trailing={
                  draft.checkOut ? (
                    <View style={styles.inline}>
                      <TimePicker
                        value={draft.checkOut}
                        tint={tint.base}
                        maximumDate={isToday ? now : undefined}
                        onChange={(t) => update({ checkOut: withTimeOf(date, t) })}
                        accessibilityLabel="Check-out time"
                      />
                      <ClearButton label="Clear check-out" onPress={() => update({ checkOut: null })} />
                    </View>
                  ) : (
                    <Button
                      size="sm"
                      label={isToday ? 'Still here · Set' : 'Set time'}
                      background={c.fill}
                      foreground={tint.text}
                      disabled={!draft.checkIn}
                      onPress={() => update({ checkOut: isToday ? now : defaultTime('18:30') })}
                    />
                  )
                }
              />
            </Section>
            {err('checkOut')}

            {
              <Card padded={false} style={styles.result}>
                <StatRow
                  stats={[
                    { label: 'Worked', value: formatDuration(preview.workedMs) },
                    {
                      label: preview.remainingMs > 0 ? 'Left' : 'Overtime',
                      value: formatDuration(preview.remainingMs > 0 ? preview.remainingMs : preview.overtimeMs),
                    },
                    {
                      label: draft.checkOut ? 'Left at' : 'Leave at',
                      value: preview.leaveAt ? formatTime(preview.leaveAt) : '—',
                      color: tint.text,
                    },
                  ]}
                />
              </Card>
            }
          </>
        ) : (
          <Message
            icon="sun.max"
            title={draft.dayType === 'leave' ? 'Marked as leave' : 'Marked as a holiday'}
            body="No target for this day. Switch back to Workday to log hours."
          />
        )}
      </Screen>
    </>
  );
}

function ClearButton({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  const c = useColors();
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} hitSlop={10} style={styles.clear}>
      <SymbolView name={destructive ? 'minus.circle.fill' : 'xmark.circle.fill'} size={22} tintColor={destructive ? c.red : c.tertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52, paddingHorizontal: space.lg },
  flex: { flex: 1 },
  clear: { padding: 2 },
  error: { paddingHorizontal: space.lg, marginTop: -space.lg },
  rowError: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  result: { paddingVertical: space.md },
});
