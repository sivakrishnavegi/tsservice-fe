import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PRESS_SCALE, spring } from '@/core/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type Haptic = 'selection' | 'light' | 'medium' | 'success' | false;

export function playHaptic(h: Haptic) {
  if (h === 'selection') void Haptics.selectionAsync();
  else if (h === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (h === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else if (h === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Larger surfaces should move less. */
  scaleTo?: number;
  haptic?: Haptic;
}

/** Immediate, spring-driven press feedback for every tappable surface. */
export function PressableScale({
  style,
  scaleTo = PRESS_SCALE,
  haptic = false,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, spring.snappy));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, spring.snappy));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        playHaptic(haptic);
        onPress?.(e);
      }}
      style={[animated, style, disabled ? { opacity: 0.45 } : null]}
    />
  );
}
