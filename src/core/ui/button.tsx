import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { radius, space, type as typeScale } from '@/core/theme';
import { PressableScale, type PressableScaleProps } from './pressable-scale';
import { Text } from './text';

export interface ButtonProps extends Omit<PressableScaleProps, 'children'> {
  label: string;
  /** Background; `transparent` for a plain text button. */
  background: string;
  foreground: string;
  icon?: SFSymbol;
  loading?: boolean;
  size?: 'lg' | 'md' | 'sm';
}

export function Button({ label, background, foreground, icon, loading, size = 'md', disabled, style, ...rest }: ButtonProps) {
  return (
    <PressableScale
      accessibilityLabel={label}
      {...rest}
      disabled={disabled || loading}
      accessibilityState={{ busy: !!loading }}
      style={[styles.base, styles[size], { backgroundColor: background }, style]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : (
          icon && <SymbolView name={icon} tintColor={foreground} size={size === 'lg' ? 18 : 16} weight="semibold" />
        )}
        <Text style={[size === 'sm' ? typeScale.subheadline : typeScale.headline, { color: foreground, fontWeight: '600' }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', paddingHorizontal: space.lg },
  lg: { minHeight: 52, borderRadius: 14 },
  md: { minHeight: 44, borderRadius: radius.control },
  sm: { minHeight: 36, borderRadius: 10, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
