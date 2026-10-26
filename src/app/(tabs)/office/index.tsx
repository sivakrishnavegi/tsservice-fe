import { useMemo } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { formatDayLong, formatDuration, formatSignedDuration, todayKey, weekRange } from '@/core/dates';
import { space, useColors, useTint } from '@/core/theme';
import { Button } from '@/core/ui/button';
import { Row, Section } from '@/core/ui/list';
import { Message, Screen, Skeleton } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useNow } from '@/hooks/use-now';
import { ShiftCard, type ShiftAction } from '@/modules/office/components/shift-card';
import { Timeline } from '@/modules/office/components/timeline';
import { useOfficeAction, useOfficeDay, useOfficeRange, useOfficeSettings, useSetDayType } from '@/modules/office/queries';
import { summarizeDay, summarizeRange } from '@/modules/office/time';
import { emptyDay } from '@/modules/office/types';

export default function OfficeHome() {
  const c = useColors();
  const tint = useTint('office');
  const date = todayKey(useNow(60_000));
  const day = useOfficeDay(date);
  const settings = useOfficeSettings();
  const week = weekRange(date);
  const weekDays = useOfficeRange(week.from, week.to);
  const action = useOfficeAction();
  const setDayType = useSetDayType();

  const live = day.data?.checkIn && !day.data.checkOut;
  const now = useNow(1000, !!live);

  const summary = useMemo(
    () => (day.data && settings.data ? summarizeDay(day.data, settings.data, now) : null),
    [day.data, settings.data, now],
  );
  const weekTotals = useMemo(() => {
    if (!weekDays.data || !settings.data) return null;
    return summarizeRange(weekDays.data.map((d) => summarizeDay(d, settings.data, now)));
  }, [weekDays.data, settings.data, now]);

  const onError = (e: Error) => Alert.alert("Couldn't do that", e.message);
  const onAction = (a: ShiftAction) => {
    if (a === 'editDay') return router.push({ pathname: '/office-day/[date]', params: { date } });
    if (a === 'backToWorkday') return setDayType.mutate({ date, dayType: 'workday' }, { onError });
    if (a === 'checkOut') {
      return Alert.alert(
        'Check out now?',
        summary && summary.remainingMs > 0 ? `${formatDuration(summary.remainingMs)} of your target is left.` : undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Check out', style: 'destructive', onPress: () => action.mutate('checkOut', { onError }) },
        ],
      );
    }
    action.mutate(a, { onError });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Office' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="calendar" accessibilityLabel="Office history" onPress={() => router.push('/office/history')} />
        <Stack.Toolbar.Button
          icon="slider.horizontal.3"
          accessibilityLabel="Office settings"
          onPress={() => router.push('/office-settings')}
        />
      </Stack.Toolbar>
      <Screen
        refresh={<RefreshControl refreshing={day.isRefetching} onRefresh={() => void Promise.all([day.refetch(), weekDays.refetch()])} />}
      >
        <Text variant="subheadline" tone="secondary" style={{ marginTop: -space.lg }}>
          {formatDayLong(date)}
        </Text>

        {day.isError ? (
          <Message icon="exclamationmark.triangle" title="Couldn't load today" body={day.error.message}>
            <Button label="Try again" background={c.fill} foreground={tint.text} onPress={() => void day.refetch()} />
          </Message>
        ) : !summary ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={430} />
            <Skeleton height={160} />
          </View>
        ) : (
          <>
            <ShiftCard summary={summary} busy={action.isPending} onAction={onAction} />
            <Timeline day={day.data ?? emptyDay(date)} summary={summary} now={now} onEdit={() => onAction('editDay')} />
            <Section>
              <Row
                title="This week"
                subtitle={weekTotals ? `${formatDuration(weekTotals.workedMs)} worked · ${weekTotals.leaveDays} leave` : undefined}
                value={weekTotals ? formatSignedDuration(weekTotals.balanceMs) : undefined}
                valueColor={weekTotals && weekTotals.balanceMs < 0 ? c.redText : c.greenText}
                chevron
                onPress={() => router.push('/office/history')}
              />
            </Section>
            {(summary.status === 'not_started' || summary.status === 'day_off') && (
              <Button
                label="Mark today as leave"
                icon="sun.max"
                background="transparent"
                foreground={c.orangeText}
                onPress={() => setDayType.mutate({ date, dayType: 'leave' }, { onError })}
              />
            )}
          </>
        )}
      </Screen>
    </>
  );
}
