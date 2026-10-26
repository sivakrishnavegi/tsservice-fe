import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { format } from 'date-fns';
import { formatDayLong, fromDateKey, monthRange, todayKey } from '@/core/dates';
import { space, useColors, useTint } from '@/core/theme';
import { Button } from '@/core/ui/button';
import { Card, Row, Section } from '@/core/ui/list';
import { Message, Screen, Skeleton } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useNow } from '@/hooks/use-now';
import { MealCard } from '@/modules/tiffin/components/meal-card';
import { StatusDot } from '@/modules/tiffin/components/status';
import { useTiffinRange, useTiffinSettings, useUpdateMeal } from '@/modules/tiffin/queries';
import { countRange, statusOf } from '@/modules/tiffin/stats';
import { enabledMeals } from '@/modules/tiffin/types';

export default function TiffinHome() {
  const c = useColors();
  const tint = useTint('tiffin');
  const date = todayKey(useNow(60_000));
  const month = monthRange(date);
  const logs = useTiffinRange(month.from, date);
  const settings = useTiffinSettings();
  const update = useUpdateMeal();

  const onError = (e: Error) => Alert.alert("Couldn't save", e.message);
  const meals = settings.data ? enabledMeals(settings.data) : [];
  const todayLogs = (logs.data ?? []).filter((l) => l.date === date);
  const received = meals.filter((m) => statusOf(todayLogs, date, m) === 'received').length;
  const unmarked = meals.filter((m) => statusOf(todayLogs, date, m) === 'pending').length;
  const monthCounts = settings.data && logs.data ? countRange(logs.data, settings.data, month.from, date, meals) : null;
  const serviceDay = settings.data?.serviceDays.includes(fromDateKey(date).getDay()) ?? true;

  const openMeal = (meal: string) => router.push({ pathname: '/tiffin-meal/[date]/[meal]', params: { date, meal } });

  return (
    <>
      <Stack.Screen options={{ title: 'Tiffin' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="calendar" accessibilityLabel="Tiffin history" onPress={() => router.push('/tiffin/history')} />
        <Stack.Toolbar.Button
          icon="slider.horizontal.3"
          accessibilityLabel="Tiffin settings"
          onPress={() => router.push('/tiffin-settings')}
        />
      </Stack.Toolbar>
      <Screen refresh={<RefreshControl refreshing={logs.isRefetching} onRefresh={() => void logs.refetch()} />}>
        <Text variant="subheadline" tone="secondary" style={{ marginTop: -space.lg }}>
          {formatDayLong(date)}
          {settings.data?.providerName ? ` · ${settings.data.providerName}` : ''}
        </Text>

        {logs.isError ? (
          <Message icon="exclamationmark.triangle" title="Couldn't load meals" body={logs.error.message}>
            <Button label="Try again" background={c.fill} foreground={tint.text} onPress={() => void logs.refetch()} />
          </Message>
        ) : !settings.data || !logs.data ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={64} />
            <Skeleton height={150} />
            <Skeleton height={150} />
          </View>
        ) : meals.length === 0 ? (
          <Message icon="fork.knife" title="No meals tracked" body="Turn on breakfast, lunch or dinner in Tiffin settings.">
            <Button
              label="Open Tiffin settings"
              background={tint.bg}
              foreground={tint.text}
              onPress={() => router.push('/tiffin-settings')}
            />
          </Message>
        ) : (
          <>
            <Card style={styles.glance}>
              <View style={styles.dots}>
                {meals.map((m) => (
                  <StatusDot key={m} status={statusOf(todayLogs, date, m)} size={34} />
                ))}
              </View>
              <View style={styles.flex}>
                <Text variant="headline">{`${received} of ${meals.length} received`}</Text>
                <Text variant="footnote" tone="secondary">
                  {!serviceDay ? 'No service today' : unmarked ? `${unmarked} still to mark` : 'All marked for today'}
                </Text>
              </View>
            </Card>

            <View style={{ gap: space.md }}>
              {meals.map((meal) => (
                <MealCard
                  key={meal}
                  meal={meal}
                  time={settings.data!.meals[meal].time}
                  log={todayLogs.find((l) => l.meal === meal)}
                  onPick={(status) => update.mutate([{ date, meal, status: status ?? 'pending' }], { onError })}
                  onOpen={() => openMeal(meal)}
                />
              ))}
            </View>

            <Button
              label={`Mark ${meals.length === 1 ? 'it' : `all ${meals.length}`} as leave`}
              icon="sun.max"
              background="transparent"
              foreground={tint.text}
              onPress={() =>
                update.mutate(
                  meals.map((meal) => ({ date, meal, status: 'leave' as const })),
                  { onError },
                )
              }
            />

            {monthCounts && (
              <Section>
                <Row
                  title={`${format(fromDateKey(date), 'MMMM')} so far`}
                  subtitle={`${monthCounts.received} received · ${monthCounts.not_received} missed · ${monthCounts.leave} leave`}
                  chevron
                  onPress={() => router.push('/tiffin/history')}
                />
              </Section>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  glance: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dots: { flexDirection: 'row', gap: 6 },
  flex: { flex: 1 },
});
