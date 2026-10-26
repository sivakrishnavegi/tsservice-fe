import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type as typeScale, useColors, type Palette, type TypeVariant } from '@/core/theme';

type Tone = 'label' | 'secondary' | 'tertiary' | 'greenText' | 'redText' | 'orangeText' | 'indigoText';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
  /** Overrides `tone` — use for module tints. */
  color?: string;
}

export function Text({ variant = 'body', tone = 'label', color, style, ...rest }: TextProps) {
  const c: Palette = useColors();
  return <RNText {...rest} style={[typeScale[variant], { color: color ?? c[tone] }, style]} />;
}
