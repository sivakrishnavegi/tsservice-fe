import { useEffect, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type DimensionValue, type RefreshControlProps } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { radius, space, useColors } from '@/core/theme';
import { easing } from '@/core/theme/motion';
import { Text } from './text';

/** Scroll container that sits under the native large-title header and tab bar. */
export function Screen({ children, refresh }: { children: ReactNode; refresh?: ReactElement<RefreshControlProps> }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={refresh}
    >
      {children}
    </ScrollView>
  );
}

export function Skeleton({ width = '100%', height = 16, rounded }: { width?: DimensionValue; height?: number; rounded?: boolean }) {
  const c = useColors();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 900, easing: easing.inOut, reduceMotion: ReduceMotion.System }), -1, true));
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[{ width, height, backgroundColor: c.fill, borderRadius: rounded ? radius.pill : radius.row }, style]} />;
}

export function Message({ icon, title, body, children }: { icon: SFSymbol; title: string; body?: string; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.message} accessible accessibilityRole="summary">
      <SymbolView name={icon} tintColor={c.tertiary} size={34} />
      <Text variant="headline">{title}</Text>
      {body && (
        <Text variant="subheadline" tone="secondary" style={styles.center}>
          {body}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 120, gap: space.xxl },
  message: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  center: { textAlign: 'center' },
});
