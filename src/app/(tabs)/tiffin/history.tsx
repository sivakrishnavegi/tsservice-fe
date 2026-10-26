import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { format } from 'date-fns';
import { SymbolView } from 'expo-symbols';
import { formatRelativeDay, fromDateKey, monthRange, todayKey, toDateKey, type DateKey } from '@/core/dates';
import { space, useColors, useTint } from '@/core/theme';
import { Card, Section } from '@/core/ui/list';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Message, Screen, Skeleton } from '@/core/ui/states';
import { StatRow } from '@/core/ui/stats';
import { Text } from '@/core/ui/text';
import { StatusDot } from '@/modules/tiffin/components/status';
import { useTiffinRange, useTiffinSettings } from '@/modules/tiffin/queries';
import { countRange, datesWithLogs, statusOf } from '@/modules/tiffin/stats';
import { MEAL_LABEL, STATUS_LABEL, enabledMeals, type Meal } from '@/modules/tiffin/types';

export default function TiffinHistory() {
  const c = useColors();
  const tint = useTint('tiffin');
  const today = todayKey();
  const [anchor, setAnchor] = useState<DateKey>(today);
  const month = monthRange(anchor);
  const to = month.to > today ? today : month.to;
  const logs = useTiffinRange(month.from, to);
  const settings = useTiffinSettings();
  const meals = settings.data ? enabledMeals(settings.data) : [];
  const counts = settings.data && logs.data ? countRange(logs.data, settings.data, month.from, to, meals) : null;
  const atLatest = month.to >= today;

  const step = (dir: 1 | -1) => {
    const d = fromDateKey(anchor);
    const next = toDateKey(new Date(d.getFullYear(), d.getMonth() + dir, 1));
    if (dir < 0 || next <= today) setAnchor(next);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'History' }} />
      <Screen refresh={<RefreshControl refreshing={logs.isRefetching} onRefresh={() => void logs.refetch()} />}>
        <View style={styles.nav}>
          <PressableScale accessibilityLabel="Previous month" onPress={() => step(-1)} style={styles.navButton}>
            <SymbolView name="chevron.left" size={18} weight="semibold" tintColor={tint.text} />
          </PressableScale>
          <Text variant="headline">{format(fromDateKey(month.from), 'MMMM yyyy')}</Text>
          <PressableScale accessibilityLabel="Next month" disabled={atLatest} onPress={() => step(1)} style={styles.navButton}>
            <SymbolView name="chevron.right" size={18} weight="semibold" tintColor={atLatest ? c.tertiary : tint.text} />
          </PressableScale>
        </View>

        {logs.isError ? (
          <Message icon="exclamationmark.triangle" title="Couldn't load history" body={logs.error.message} />
        ) : !logs.data || !counts ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={72} />
            <Skeleton height={280} />
          </View>
        ) : (
          <>
            <Card padded={false} style={styles.totals}>
              <StatRow
                align="leading"
                stats={[
                  { label: 'Received', value: String(counts.received), color: c.greenText },
                  { label: 'Missed', value: String(counts.not_received), color: c.redText },
                  { label: 'Leave', value: String(counts.leave), color: c.orangeText },
                ]}
              />
            </Card>

            {datesWithLogs(logs.data).length === 0 ? (
              <Message icon="fork.knife" title="Nothing marked this month" body="Mark meals from the Tiffin tab and they show up here." />
            ) : (
              <Section
                header="Days"
                headerRight={
                  <View style={styles.colHeads}>
                    {meals.map((m) => (
                      <Text key={m} variant="caption" tone="secondary" style={styles.colHead}>
                        {MEAL_LABEL[m][0]}
                      </Text>
                    ))}
                  </View>
                }
                footer={`${counts.pending} not marked. Tap a circle to open that meal.`}
              >
                {datesWithLogs(logs.data).map((date) => {
                  const dayLogs = logs.data.filter((l) => l.date === date);
                  const remarks = dayLogs.filter((l) => l.remark).map((l) => `${MEAL_LABEL[l.meal]}: ${l.remark}`);
                  return (
                    <View key={date} style={styles.row}>
                      <View style={styles.flex}>
                        <Text>{formatRelativeDay(date)}</Text>
                        {remarks.length > 0 && (
                          <Text variant="footnote" tone="secondary" numberOfLines={2}>
                            {remarks.join(' · ')}
                          </Text>
                        )}
                      </View>
                      {meals.map((meal: Meal) => {
                        const status = statusOf(dayLogs, date, meal);
                        return (
                          <PressableScale
                            key={meal}
                            accessibilityLabel={`${formatRelativeDay(date)}, ${MEAL_LABEL[meal]}: ${STATUS_LABEL[status]}`}
                            onPress={() => router.push({ pathname: '/tiffin-meal/[date]/[meal]', params: { date, meal } })}
                            style={styles.hit}
                          >
                            <StatusDot status={status} />
                          </PressableScale>
                        );
                      })}
                    </View>
                  );
                })}
              </Section>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -space.md },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  totals: { paddingVertical: space.md },
  colHeads: { flexDirection: 'row', marginRight: space.lg - 6 },
  colHead: { width: 44, textAlign: 'center', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: space.sm, minHeight: 56, paddingVertical: 4 },
  flex: { flex: 1, gap: 1 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
