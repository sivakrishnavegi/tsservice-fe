import { StyleSheet, View } from 'react-native';
import { space, useColors } from '@/core/theme';
import { Text } from '@/core/ui/text';

export interface Bar {
  key: string;
  label: string;
  /** hours */
  value: number;
  color: string;
  labelColor?: string;
  accessibilityLabel: string;
}

/** Simple bars against a dashed target line. Height is fixed; bars scale to the larger of max and target. */
export function BarChart({ bars, target, height = 140 }: { bars: readonly Bar[]; target: number; height?: number }) {
  const c = useColors();
  const max = Math.max(target * 1.15, ...bars.map((b) => b.value), 1);
  const targetY = (target / max) * height;
  return (
    <View accessibilityRole="image" accessibilityLabel={bars.map((b) => b.accessibilityLabel).join('. ')}>
      <View style={[styles.plot, { height }]}>
        {target > 0 && <View style={[styles.target, { bottom: targetY, borderColor: c.tertiary }]} />}
        {bars.map((b) => (
          <View key={b.key} style={styles.col}>
            <View
              style={[
                styles.bar,
                { height: b.value > 0 ? Math.max(4, (b.value / max) * height) : 4, backgroundColor: b.value > 0 ? b.color : c.fill },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {bars.map((b) => (
          <Text key={b.key} variant="caption" style={[styles.label, { color: b.labelColor ?? c.secondary }]}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  target: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  col: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  labels: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  label: { flex: 1, textAlign: 'center' },
});
