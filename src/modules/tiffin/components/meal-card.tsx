import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { formatClock } from '@/core/dates';
import { radius, space, useColors, useTint } from '@/core/theme';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Text } from '@/core/ui/text';
import { MEAL_LABEL, STATUS_LABEL, type MarkedStatus, type Meal, type MealLog } from '../types';
import { STATUS_ICON, statusColors } from './status';

const MEAL_ICON: Record<Meal, { icon: SFSymbol; color: string }> = {
  breakfast: { icon: 'cup.and.saucer.fill', color: '#FF9500' },
  lunch: { icon: 'takeoutbag.and.cup.and.straw.fill', color: '#34C759' },
  dinner: { icon: 'moon.stars.fill', color: '#5856D6' },
};

const OPTIONS: readonly MarkedStatus[] = ['received', 'not_received', 'leave'];

export function MealCard({
  meal,
  time,
  log,
  onPick,
  onOpen,
}: {
  meal: Meal;
  time: string;
  log: MealLog | undefined;
  /** null clears the status */
  onPick: (status: MarkedStatus | null) => void;
  onOpen: () => void;
}) {
  const c = useColors();
  const tint = useTint('tiffin');
  const current = log?.status ?? 'pending';
  const m = MEAL_ICON[meal];

  return (
    <View style={[styles.card, { backgroundColor: c.cell }]} accessibilityLabel={`${MEAL_LABEL[meal]}, ${STATUS_LABEL[current]}`}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: m.color }]}>
          <SymbolView name={m.icon} size={19} tintColor="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <Text variant="headline">{MEAL_LABEL[meal]}</Text>
          <Text variant="footnote" tone="secondary">
            Usually {formatClock(time)}
          </Text>
        </View>
        <PressableScale
          onPress={onOpen}
          accessibilityLabel={log?.photoUri ? `${MEAL_LABEL[meal]} photo` : `Add a photo or remark for ${MEAL_LABEL[meal]}`}
          style={[styles.photo, { backgroundColor: c.fill }]}
        >
          {log?.photoUri ? (
            <Image source={{ uri: log.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
          ) : (
            <SymbolView name="camera" size={18} tintColor={tint.text} />
          )}
        </PressableScale>
      </View>

      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={`${MEAL_LABEL[meal]} status`}>
        {OPTIONS.map((o) => {
          const on = o === current;
          const col = statusColors(c, o);
          return (
            <PressableScale
              key={o}
              haptic="selection"
              scaleTo={0.95}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={STATUS_LABEL[o]}
              accessibilityHint={on ? 'Tap again to clear' : undefined}
              onPress={() => onPick(on ? null : o)}
              style={[styles.option, { backgroundColor: on ? col.bg : c.bg, borderColor: on ? col.ring : 'transparent' }]}
            >
              <SymbolView name={o === 'leave' ? 'sun.max' : STATUS_ICON[o]} size={14} weight="bold" tintColor={on ? col.fg : c.secondary} />
              <Text variant="subheadline" style={{ color: on ? col.fg : c.secondary, fontWeight: '600' }}>
                {STATUS_LABEL[o]}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <PressableScale
        scaleTo={0.99}
        onPress={onOpen}
        style={styles.remark}
        accessibilityLabel={log?.remark ? `Remark: ${log.remark}` : 'Add a remark'}
      >
        <SymbolView name="text.bubble" size={15} tintColor={log?.remark ? c.label : c.secondary} />
        <Text variant="subheadline" tone={log?.remark ? 'label' : 'secondary'} numberOfLines={2} style={styles.flex}>
          {log?.remark ?? 'Add a remark'}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  photo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  options: { flexDirection: 'row', gap: space.sm },
  option: {
    flex: 1,
    height: 44,
    borderRadius: radius.control,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  remark: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
});
