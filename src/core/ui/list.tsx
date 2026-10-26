import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { radius, space, useColors } from '@/core/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

/** Inset-grouped section: header above, rounded group, footnote below — the iOS Settings pattern. */
export function Section({
  header,
  headerRight,
  footer,
  children,
  inset = 16,
  style,
}: {
  header?: string;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Leading inset of the separators (60 when rows have icons). */
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {(header || headerRight) && (
        <View style={styles.header}>
          {header && (
            <Text variant="sectionHeader" tone="secondary" accessibilityRole="header" style={styles.flex}>
              {header}
            </Text>
          )}
          {headerRight}
        </View>
      )}
      <View style={[styles.group, { backgroundColor: c.cell }]}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 && <View style={[styles.sep, { marginLeft: inset, backgroundColor: c.separator }]} />}
            {row}
          </Fragment>
        ))}
      </View>
      {typeof footer === 'string' ? (
        <Text variant="footnote" tone="secondary" style={styles.footer}>
          {footer}
        </Text>
      ) : (
        footer
      )}
    </View>
  );
}

/** Rounded coloured square holding a white SF Symbol, as in iOS Settings. */
export function IconSquare({ name, color, size = 30 }: { name: SFSymbol; color: string; size?: number }) {
  return (
    <View style={[styles.square, { width: size, height: size, borderRadius: size * 0.23, backgroundColor: color }]}>
      <SymbolView name={name} tintColor="#FFFFFF" size={size * 0.6} weight="medium" />
    </View>
  );
}

export interface RowProps {
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  titleColor?: string;
  onPress?: () => void;
  accessibilityHint?: string;
  centered?: boolean;
}

export function Row({
  title,
  subtitle,
  value,
  valueColor,
  leading,
  trailing,
  chevron,
  destructive,
  titleColor,
  onPress,
  accessibilityHint,
  centered,
}: RowProps) {
  const c = useColors();
  const content = (
    <View style={[styles.row, centered && styles.centered]}>
      {leading}
      <View style={[styles.text, centered && styles.textCentered]}>
        <Text style={{ color: destructive ? c.redText : (titleColor ?? c.label) }}>{title}</Text>
        {subtitle && (
          <Text variant="footnote" tone="secondary">
            {subtitle}
          </Text>
        )}
      </View>
      {value !== undefined && (
        <Text style={{ color: valueColor ?? c.secondary, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
          {value}
        </Text>
      )}
      {trailing}
      {chevron && <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={c.tertiary} />}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={onPress}
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </PressableScale>
  );
}

/** A full-width card that isn't a list (hero, summaries). */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const c = useColors();
  return <View style={[styles.card, padded && styles.cardPad, { backgroundColor: c.cell }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.sm },
  flex: { flex: 1 },
  group: { borderRadius: radius.row, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth },
  footer: { paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.lg, paddingVertical: 6 },
  centered: { justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  textCentered: { flex: 0, alignItems: 'center' },
  square: { alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.card },
  cardPad: { padding: space.lg },
});
