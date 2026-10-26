import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { format } from 'date-fns';
import {
  addDaysKey,
  eachDateKey,
  formatDuration,
  formatRelativeDay,
  formatSignedDuration,
  formatTime,
  fromDateKey,
  monthRange,
  todayKey,
  weekRange,
  type DateKey,
} from '@/core/dates';
import { space, useColors, useTint } from '@/core/theme';
import { Segmented } from '@/core/ui/controls';
import { Card, Row, Section } from '@/core/ui/list';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Message, Screen, Skeleton } from '@/core/ui/states';
import { StatRow } from '@/core/ui/stats';
import { Text } from '@/core/ui/text';
import { SymbolView } from 'expo-symbols';
import { BarChart, type Bar } from '@/modules/office/components/bar-chart';
import { useOfficeRange, useOfficeSettings } from '@/modules/office/queries';
import { summarizeDay, summarizeRange, targetMinutes, type OfficeSummary } from '@/modules/office/time';
import { emptyDay } from '@/modules/office/types';

type Period = 'week' | 'month';

export default function OfficeHistory() {
  const c = useColors();
  const tint = useTint('office');
  const today = todayKey();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState<DateKey>(today);
  const range = period === 'week' ? weekRange(anchor) : monthRange(anchor);
  const days = useOfficeRange(range.from, range.to);
  const settings = useOfficeSettings();

  const data = useMemo(() => {
    if (!days.data || !settings.data) return null;
    const now = new Date();
    const byDate = new Map(days.data.map((d) => [d.date, d]));
    const all = eachDateKey(range.from, range.to)
      .filter((k) => k <= today)
      .map((k) => summarizeDay(byDate.get(k) ?? emptyDay(k), settings.data, now));
    const recorded = all.filter((s) => s.presentMs > 0 || s.status === 'leave' || s.status === 'holiday').reverse();
    return {
      all,
      recorded,
      totals: summarizeRange(all),
      target: targetMinutes(settings.data.shift, settings.data.plannedBreakMinutes) / 60,
    };
  }, [days.data, settings.data, range.from, range.to, today]);

  const step = (dir: 1 | -1) => {
    const next =
      period === 'week'
        ? addDaysKey(anchor, 7 * dir)
        : format(new Date(fromDateKey(anchor).getFullYear(), fromDateKey(anchor).getMonth() + dir, 1), 'yyyy-MM-dd');
    if (next <= today || dir < 0) setAnchor(next > today ? today : next);
  };
  const atLatest = range.to >= today;
  const title =
    period === 'week'
      ? `${format(fromDateKey(range.from), 'd MMM')} – ${format(fromDateKey(range.to), 'd MMM')}`
      : format(fromDateKey(range.from), 'MMMM yyyy');

  return (
    <>
      <Stack.Screen options={{ title: 'History' }} />
      <Screen refresh={<RefreshControl refreshing={days.isRefetching} onRefresh={() => void days.refetch()} />}>
        <Segmented
          options={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setAnchor(today);
          }}
          accessibilityLabel="Period"
        />

        <View style={styles.nav}>
          <NavButton icon="chevron.left" label="Previous" color={tint.text} onPress={() => step(-1)} />
          <Text variant="headline">{title}</Text>
          <NavButton
            icon="chevron.right"
            label="Next"
            color={atLatest ? c.tertiary : tint.text}
            disabled={atLatest}
            onPress={() => step(1)}
          />
        </View>

        {days.isError ? (
          <Message icon="exclamationmark.triangle" title="Couldn't load history" body={days.error.message} />
        ) : !data ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={72} />
            <Skeleton height={200} />
          </View>
        ) : (
          <>
            <Card padded={false} style={styles.totals}>
              <StatRow
                align="leading"
                stats={[
                  { label: 'Worked', value: formatDuration(data.totals.workedMs) },
                  {
                    label: 'Balance',
                    value: formatSignedDuration(data.totals.balanceMs),
                    color: data.totals.balanceMs < 0 ? c.redText : c.greenText,
                  },
                  { label: 'Leave', value: `${data.totals.leaveDays}d` },
                ]}
              />
            </Card>

            <Card style={{ gap: space.md }}>
              <View style={styles.chartHead}>
                <Text variant="headline">{period === 'week' ? 'Hours per day' : 'Hours per week'}</Text>
                <Text variant="footnote" tone="secondary">
                  {period === 'week' ? `Target ${formatDuration(data.target * 3_600_000)}` : `${data.totals.daysWorked} days worked`}
                </Text>
              </View>
              <BarChart
                bars={period === 'week' ? weekBars(data.all, range.from, c, tint.base) : monthBars(data.all, c, tint.base)}
                target={period === 'week' ? data.target : 0}
              />
            </Card>

            {data.recorded.length === 0 ? (
              <Message icon="calendar" title="Nothing recorded" body="Check in from the Office tab and your days show up here." />
            ) : (
              <Section header="Days">
                {data.recorded.map((s) => (
                  <DayRow key={s.date} s={s} />
                ))}
              </Section>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

function DayRow({ s }: { s: OfficeSummary }) {
  const c = useColors();
  const diff = s.workedMs - s.targetMs;
  const off = s.status === 'leave' || s.status === 'holiday';
  const open = () => router.push({ pathname: '/office-day/[date]', params: { date: s.date } });
  const subtitle = off
    ? s.status === 'leave'
      ? 'Leave'
      : 'Holiday'
    : s.missingCheckOut
      ? 'Check-out missing'
      : `${s.checkInAt ? formatTime(s.checkInAt) : '—'} – ${s.checkOutAt ? formatTime(s.checkOutAt) : 'now'} · ${formatDuration(s.breakMs)} break`;
  return (
    <Row
      title={formatRelativeDay(s.date)}
      subtitle={subtitle}
      value={off ? undefined : formatDuration(s.workedMs)}
      valueColor={c.label}
      trailing={
        !off && s.status === 'checked_out' && s.targetMs > 0 ? (
          <Text
            variant="subheadline"
            style={{ minWidth: 56, textAlign: 'right', color: diff < 0 ? c.redText : c.greenText, fontVariant: ['tabular-nums'] }}
          >
            {formatSignedDuration(diff)}
          </Text>
        ) : undefined
      }
      chevron
      onPress={open}
    />
  );
}

function NavButton({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: 'chevron.left' | 'chevron.right';
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} disabled={disabled} style={styles.navButton}>
      <SymbolView name={icon} size={18} weight="semibold" tintColor={color} />
    </PressableScale>
  );
}

const hours = (ms: number) => ms / 3_600_000;

function weekBars(all: OfficeSummary[], from: DateKey, c: ReturnType<typeof useColors>, base: string): Bar[] {
  const byDate = new Map(all.map((s) => [s.date, s]));
  return eachDateKey(from, addDaysKey(from, 6)).map((k) => {
    const s = byDate.get(k);
    const leave = s?.status === 'leave' || s?.status === 'holiday';
    const live = s?.status === 'working' || s?.status === 'on_break';
    return {
      key: k,
      label: format(fromDateKey(k), 'EEEEE'),
      value: leave ? 0.15 : s ? hours(s.workedMs) : 0,
      color: leave ? c.orange : live ? c.fillStrong : base,
      labelColor: k === todayKey() ? base : undefined,
      accessibilityLabel: `${format(fromDateKey(k), 'EEEE')}: ${leave ? 'leave' : s ? formatDuration(s.workedMs) : 'nothing recorded'}`,
    };
  });
}

function monthBars(all: OfficeSummary[], c: ReturnType<typeof useColors>, base: string): Bar[] {
  const weeks = new Map<string, number>();
  for (const s of all) {
    const w = weekRange(s.date).from;
    weeks.set(w, (weeks.get(w) ?? 0) + s.workedMs);
  }
  return [...weeks.entries()].map(([w, ms]) => ({
    key: w,
    label: format(fromDateKey(w), 'd MMM'),
    value: hours(ms),
    color: ms > 0 ? base : c.fill,
    accessibilityLabel: `Week of ${format(fromDateKey(w), 'd MMMM')}: ${formatDuration(ms)}`,
  }));
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -space.md },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  totals: { paddingVertical: space.md },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
