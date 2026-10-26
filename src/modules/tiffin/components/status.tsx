import { StyleSheet, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useColors, type Palette } from '@/core/theme';
import type { MealStatus } from '../types';

export const STATUS_ICON: Record<MealStatus, SFSymbol> = {
  received: 'checkmark',
  not_received: 'xmark',
  leave: 'l.square',
  pending: 'minus',
};

export function statusColors(c: Palette, status: MealStatus): { bg: string; fg: string; ring: string } {
  switch (status) {
    case 'received':
      return { bg: c.greenBg, fg: c.greenText, ring: c.green };
    case 'not_received':
      return { bg: c.redBg, fg: c.redText, ring: c.red };
    case 'leave':
      return { bg: c.orangeBg, fg: c.orangeText, ring: c.orange };
    case 'pending':
      return { bg: 'transparent', fg: c.tertiary, ring: c.tertiary };
  }
}

/** Round status marker. Not-marked is a dashed outline so it never reads as a colour alone. */
export function StatusDot({ status, size = 32 }: { status: MealStatus; size?: number }) {
  const c = useColors();
  const col = statusColors(c, status);
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: col.bg },
        status === 'pending' && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.tertiary },
      ]}
    >
      <SymbolView name={status === 'leave' ? 'l.circle' : STATUS_ICON[status]} size={size * 0.45} weight="bold" tintColor={col.fg} />
    </View>
  );
}

const styles = StyleSheet.create({ dot: { alignItems: 'center', justifyContent: 'center' } });
