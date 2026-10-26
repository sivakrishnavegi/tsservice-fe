import { StyleSheet, View } from 'react-native';
import { formatWeekdays, WEEKDAYS } from '@/core/dates';
import { space, useColors } from '@/core/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

const ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Seven round toggles, Monday first. Values are JS weekdays (0 = Sunday). */
export function WeekdayPicker({
  title,
  value,
  onChange,
  tint,
}: {
  title: string;
  value: readonly number[];
  onChange: (days: number[]) => void;
  tint: string;
}) {
  const c = useColors();
  return (
    <View style={styles.wrap}>
      <Text>{title}</Text>
      <Text variant="footnote" tone="secondary">
        {formatWeekdays(value)}
      </Text>
      <View style={styles.days}>
        {ORDER.map((d) => {
          const on = value.includes(d);
          return (
            <PressableScale
              key={d}
              haptic="selection"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={WEEKDAYS[d]}
              onPress={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
              style={[styles.day, { backgroundColor: on ? tint : c.fill }]}
            >
              <Text variant="footnote" style={{ color: on ? '#FFFFFF' : c.label, fontWeight: '600' }}>
                {WEEKDAYS[d].slice(0, 1)}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xs },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
