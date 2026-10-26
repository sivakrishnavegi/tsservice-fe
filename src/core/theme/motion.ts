import { Easing, Keyframe, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * Motion rules (docs/DESIGN.md): short, ease-out, springs for anything touch-driven,
 * never animate from scale 0, and always honour Reduce Motion.
 */
export const duration = { fast: 160, base: 220, slow: 300 } as const;

export const easing = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
} as const;

export const timing = {
  base: { duration: duration.base, easing: easing.out, reduceMotion: ReduceMotion.System },
  ring: { duration: 600, easing: easing.out, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithTimingConfig>;

export const spring = {
  snappy: { damping: 26, stiffness: 420, mass: 0.8, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithSpringConfig>;

export const PRESS_SCALE = 0.97;

/** Enter from close to the final state, lightly staggered on first appearance only. */
export function enter(index = 0) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 8 }, { scale: 0.98 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: easing.out },
  })
    .duration(duration.base)
    .delay(Math.min(index, 6) * 40)
    .reduceMotion(ReduceMotion.System);
}
