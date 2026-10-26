import { StyleSheet, View } from 'react-native';
import { space, useColors } from '@/core/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export interface Stat {
  label: string;
  value: string;
  color?: string;
  onPress?: () => void;
  accessibilityHint?: string;
}

/** Equal columns of label-over-number, separated by hairlines. */
export function StatRow({ stats, align = 'center' }: { stats: readonly Stat[]; align?: 'center' | 'leading' }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      {stats.map((s, i) => {
        const body = (
          <View style={[styles.cell, align === 'center' ? styles.centered : styles.leading]}>
            <Text variant="footnote" tone="secondary">
              {s.label}
            </Text>
            <Text variant="number" style={s.color ? { color: s.color } : undefined}>
              {s.value}
            </Text>
          </View>
        );
        return (
          <View key={s.label} style={[styles.col, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.separator }]}>
            {s.onPress ? (
              <PressableScale
                scaleTo={0.96}
                onPress={s.onPress}
                accessibilityLabel={`${s.label}, ${s.value}`}
                accessibilityHint={s.accessibilityHint}
              >
                {body}
              </PressableScale>
            ) : (
              <View accessible accessibilityLabel={`${s.label}, ${s.value}`}>
                {body}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  col: { flex: 1 },
  cell: { gap: 2, paddingHorizontal: space.sm },
  centered: { alignItems: 'center' },
  leading: { alignItems: 'flex-start', paddingHorizontal: space.lg },
});
