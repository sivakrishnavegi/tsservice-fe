/**
 * iOS system colours (Human Interface Guidelines), with text-on-tint variants darkened
 * in light mode so they pass 4.5:1. Components use these names, never raw hex.
 */
export interface Palette {
  bg: string;
  cell: string;
  cellRaised: string;
  fill: string;
  fillStrong: string;
  label: string;
  secondary: string;
  tertiary: string;
  separator: string;
  scrim: string;
  ring: string;
  shadow: string;

  green: string;
  greenText: string;
  greenBg: string;
  red: string;
  redText: string;
  redBg: string;
  orange: string;
  orangeText: string;
  orangeBg: string;
  indigo: string;
  indigoText: string;
  indigoBg: string;
  indigoFill: string;
  gray: string;
}

export const light: Palette = {
  bg: '#F2F2F7',
  cell: '#FFFFFF',
  cellRaised: '#FFFFFF',
  fill: 'rgba(118,118,128,0.12)',
  fillStrong: 'rgba(118,118,128,0.2)',
  label: '#000000',
  secondary: 'rgba(60,60,67,0.72)',
  tertiary: 'rgba(60,60,67,0.3)',
  separator: 'rgba(60,60,67,0.18)',
  scrim: 'rgba(0,0,0,0.25)',
  ring: 'rgba(118,118,128,0.16)',
  shadow: '#000000',

  green: '#34C759',
  greenText: '#1E7A34',
  greenBg: 'rgba(52,199,89,0.16)',
  red: '#FF3B30',
  redText: '#C4150B',
  redBg: 'rgba(255,59,48,0.12)',
  orange: '#FF9500',
  orangeText: '#A35200',
  orangeBg: 'rgba(255,149,0,0.16)',
  indigo: '#5856D6',
  indigoText: '#3634A3',
  indigoBg: 'rgba(88,86,214,0.13)',
  indigoFill: '#4B49C8',
  gray: '#8E8E93',
};

export const dark: Palette = {
  bg: '#000000',
  cell: '#1C1C1E',
  cellRaised: '#2C2C2E',
  fill: 'rgba(118,118,128,0.24)',
  fillStrong: 'rgba(118,118,128,0.36)',
  label: '#FFFFFF',
  secondary: 'rgba(235,235,245,0.62)',
  tertiary: 'rgba(235,235,245,0.3)',
  separator: 'rgba(84,84,88,0.6)',
  scrim: 'rgba(0,0,0,0.6)',
  ring: 'rgba(118,118,128,0.3)',
  shadow: '#000000',

  green: '#30D158',
  greenText: '#30D158',
  greenBg: 'rgba(48,209,88,0.2)',
  red: '#FF453A',
  redText: '#FF6961',
  redBg: 'rgba(255,69,58,0.2)',
  orange: '#FF9F0A',
  orangeText: '#FFB340',
  orangeBg: 'rgba(255,159,10,0.2)',
  indigo: '#5E5CE6',
  indigoText: '#9D9BFF',
  indigoBg: 'rgba(94,92,230,0.24)',
  indigoFill: '#5E5CE6',
  gray: '#8E8E93',
};

/** Each module has its own tint, so you always know where you are. */
export interface Tint {
  base: string;
  text: string;
  fill: string;
  bg: string;
}

export const tints = {
  office: {
    light: { base: '#007AFF', text: '#0066D6', fill: '#0066D6', bg: 'rgba(0,122,255,0.12)' },
    dark: { base: '#0A84FF', text: '#409CFF', fill: '#0A6FE0', bg: 'rgba(10,132,255,0.2)' },
  },
  tiffin: {
    light: { base: '#FF9500', text: '#A35200', fill: '#B35200', bg: 'rgba(255,149,0,0.14)' },
    dark: { base: '#FF9F0A', text: '#FFB340', fill: '#C75F00', bg: 'rgba(255,159,10,0.2)' },
  },
  app: {
    light: { base: '#8E8E93', text: '#1C1C1E', fill: '#1C1C1E', bg: 'rgba(118,118,128,0.12)' },
    dark: { base: '#8E8E93', text: '#FFFFFF', fill: '#FFFFFF', bg: 'rgba(118,118,128,0.24)' },
  },
} satisfies Record<string, { light: Tint; dark: Tint }>;

export type TintName = keyof typeof tints;
