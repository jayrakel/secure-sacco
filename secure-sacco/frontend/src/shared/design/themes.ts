import { PRIMITIVE_TOKENS } from './tokens';

type ThemeValues = {
  readonly [key: string]: string;
};

export const LIGHT_THEME: ThemeValues = {
  '--surface-primary': PRIMITIVE_TOKENS.neutral[0],
  '--text-primary': PRIMITIVE_TOKENS.neutral[900],
  '--brand-primary': PRIMITIVE_TOKENS.emerald[600],
  '--sidebar-bg': PRIMITIVE_TOKENS.neutral[900],
  '--sidebar-text': PRIMITIVE_TOKENS.neutral[400],
  '--sidebar-text-active': PRIMITIVE_TOKENS.neutral[0],
  '--sidebar-active': PRIMITIVE_TOKENS.neutral[800],
  '--page-bg': PRIMITIVE_TOKENS.neutral[50],
  '--border-default': PRIMITIVE_TOKENS.neutral[200],
  '--border-light': PRIMITIVE_TOKENS.neutral[100],
  '--brand-success': PRIMITIVE_TOKENS.emerald[600],
  '--brand-warning': PRIMITIVE_TOKENS.amber[600],
  '--brand-error': PRIMITIVE_TOKENS.red[600],
  '--text-secondary': PRIMITIVE_TOKENS.neutral[600],
  '--text-inverse': PRIMITIVE_TOKENS.neutral[0],
  '--surface-secondary': PRIMITIVE_TOKENS.neutral[50],
};

export const DARK_THEME: ThemeValues = {
  '--surface-primary': PRIMITIVE_TOKENS.neutral[900],
  '--text-primary': PRIMITIVE_TOKENS.neutral[50],
  '--brand-primary': PRIMITIVE_TOKENS.emerald[400],
  '--sidebar-bg': PRIMITIVE_TOKENS.neutral[950],
  '--sidebar-text': PRIMITIVE_TOKENS.neutral[500],
  '--sidebar-text-active': PRIMITIVE_TOKENS.neutral[50],
  '--sidebar-active': PRIMITIVE_TOKENS.neutral[800],
  '--page-bg': PRIMITIVE_TOKENS.neutral[900],
  '--border-default': PRIMITIVE_TOKENS.neutral[700],
  '--border-light': PRIMITIVE_TOKENS.neutral[800],
  '--brand-success': PRIMITIVE_TOKENS.emerald[400],
  '--brand-warning': PRIMITIVE_TOKENS.amber[400],
  '--brand-error': PRIMITIVE_TOKENS.red[400],
  '--text-secondary': PRIMITIVE_TOKENS.neutral[400],
  '--text-inverse': PRIMITIVE_TOKENS.neutral[900],
  '--surface-secondary': PRIMITIVE_TOKENS.neutral[850],
};

export type ThemeName = 'light' | 'dark';
export type ThemeObject = ThemeValues;
export const THEMES: Record<ThemeName, ThemeObject> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};

export const DEFAULT_THEME: ThemeName = 'light';

export function getTheme(name: ThemeName): ThemeObject {
  return THEMES[name];
}
