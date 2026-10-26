import { useColorScheme, type TextStyle } from 'react-native';
import { dark, light, tints, type Palette, type Tint, type TintName } from './colors';

export type { Palette, Tint, TintName };

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useTint(name: TintName): Tint {
  return tints[name][useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** 4pt grid. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { control: 12, row: 12, card: 16, hero: 22, pill: 999 } as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** Apple text styles (SF Pro via the system font). Numeric styles use tabular figures. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.26, fontVariant: tabular },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.45, fontVariant: tabular },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.43 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.31 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.23 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  sectionHeader: { fontSize: 13, lineHeight: 18, fontWeight: '400', textTransform: 'uppercase', letterSpacing: 0.2 },
  hero: { fontSize: 44, lineHeight: 50, fontWeight: '700', letterSpacing: -0.8, fontVariant: tabular },
  number: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.45, fontVariant: tabular },
  badge: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
