/**
 * Variant Resolution Hook
 *
 * Smart hook to resolve variants from presets and theme context
 * Makes it easy to convert old components to use the new system
 */

import { useTheme } from '@/shared/context/ThemeContext';
import {
  PRESET_COMBOS,
  COMPOUND_VARIANTS,
  getVariantStyles,
  type CardVariant,
  type ButtonVariant,
  type PanelVariant,
  type TableVariant,
} from '@/shared/design';

interface UseVariantProps {
  component: 'card' | 'button' | 'panel' | 'table';
  variant?: CardVariant | ButtonVariant | PanelVariant | TableVariant;
  preset?: keyof typeof PRESET_COMBOS;
  compound?: keyof typeof COMPOUND_VARIANTS;
  custom?: Record<string, any>;
}

/**
 * Use this hook to get fully resolved variant styles that respect theme context
 *
 * @example
 * ```tsx
 * const cardStyles = useVariant({
 *   component: 'card',
 *   variant: 'solid',
 *   preset: 'cardPrimary',
 * });
 * ```
 */
export function useVariant({
  component,
  variant,
  preset,
  compound,
  custom = {},
}: UseVariantProps) {
  const theme = useTheme(); // Access current theme variables from ThemeContext

  let styles = getVariantStyles(component, variant);

  if (preset) {
    const presetStyles = PRESET_COMBOS[preset];
    styles = { ...styles, ...presetStyles };
  }

  if (compound) {
    const compoundStyles = COMPOUND_VARIANTS[compound];
    styles = { ...styles, ...compoundStyles };
  }

  // Merge custom overrides
  styles = { ...styles, ...custom };

  return {
    ...styles,
    themeId: theme.themeId,
    mode: theme.mode,
  };
}

/**
 * Helper to create modal backdrop
 */
export const MODAL_BACKDROP = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
};

/**
 * Helper to create form input styles
 */
export const FORM_INPUT = {
  base: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-body)',
    fontSize: '0.875rem',
    transition: 'all 150ms ease',
  },
  focus: {
    borderColor: 'var(--color-primary)',
    boxShadow: '0 0 0 3px rgba(var(--color-primary-rgb), 0.1)',
  },
  error: {
    borderColor: 'var(--color-danger)',
    background: 'var(--color-page-bg)',
  },
};

/**
 * Helper to create alert/error box
 */
export const ALERT_BOX = {
  error: {
    padding: '1rem',
    background: 'color-mix(in srgb, var(--color-danger) 10%, white)',
    border: '1px solid color-mix(in srgb, var(--color-danger) 30%, white)',
    borderRadius: '0.375rem',
    color: 'var(--color-danger)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  success: {
    padding: '1rem',
    background: 'color-mix(in srgb, var(--color-success) 10%, white)',
    border: '1px solid color-mix(in srgb, var(--color-success) 30%, white)',
    borderRadius: '0.375rem',
    color: 'var(--color-success)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  warning: {
    padding: '1rem',
    background: 'color-mix(in srgb, var(--color-warning) 10%, white)',
    border: '1px solid color-mix(in srgb, var(--color-warning) 30%, white)',
    borderRadius: '0.375rem',
    color: 'var(--color-warning)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
};

/**
 * Helper to create header/title styles
 */
export const HEADER_STYLES = {
  h1: {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: 'var(--color-text-heading)',
    marginBottom: '0.5rem',
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--color-text-heading)',
    marginBottom: '0.5rem',
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--color-text-heading)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    marginBottom: '1rem',
  },
};

/**
 * Helper to create spacing/layout
 */
export const LAYOUT = {
  section: {
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  flex: (gap = '1rem') => ({
    display: 'flex' as const,
    gap,
  }),
  flexColumn: (gap = '1rem') => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap,
  }),
  grid: (cols = 2, gap = '1rem') => ({
    display: 'grid' as const,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap,
  }),
};

export default {
  useVariant,
  MODAL_BACKDROP,
  FORM_INPUT,
  ALERT_BOX,
  HEADER_STYLES,
  LAYOUT,
};

