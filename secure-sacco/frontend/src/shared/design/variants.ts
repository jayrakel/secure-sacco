/**
 * Phase 3: Component Variants System
 *
 * This system extends Phase 2 UI Primitives with variant combinations,
 * maintaining compatibility with the existing ThemeContext presets.
 */

import { PRIMITIVE_TOKENS } from './tokens';

// ───────────────────────────────────────────────────────────────────────────
// VARIANT DEFINITIONS
// ───────────────────────────────────────────────────────────────────────────

export type CardVariant = 'solid' | 'outline' | 'glass' | 'gradient' | 'elevated';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'gradient';
export type PanelVariant = 'solid' | 'outline' | 'glass' | 'minimal';
export type TableVariant = 'minimal' | 'striped' | 'bordered' | 'hover';

// ───────────────────────────────────────────────────────────────────────────
// CARD VARIANTS
// ───────────────────────────────────────────────────────────────────────────

export const CARD_VARIANTS = {
  solid: {
    background: 'var(--color-surface)',
    border: `1px solid var(--color-border)`,
    shadow: PRIMITIVE_TOKENS.shadow.md,
  },
  outline: {
    background: 'transparent',
    border: `2px solid var(--color-border)`,
    shadow: 'none',
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: PRIMITIVE_TOKENS.blur.md,
    border: `1px solid rgba(255, 255, 255, 0.2)`,
    shadow: PRIMITIVE_TOKENS.shadow.sm,
  },
  gradient: {
    background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%)',
    border: `1px solid var(--color-primary)`,
    shadow: PRIMITIVE_TOKENS.shadow.md,
  },
  elevated: {
    background: 'var(--color-surface)',
    border: 'none',
    shadow: PRIMITIVE_TOKENS.shadow.lg,
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// BUTTON VARIANTS
// ───────────────────────────────────────────────────────────────────────────

export const BUTTON_VARIANTS = {
  primary: {
    background: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    hover: 'var(--color-primary-hover)',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-body)',
    border: `1px solid var(--color-border)`,
    hover: 'var(--color-page-bg)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-primary)',
    border: `1px solid var(--color-primary)`,
    hover: 'var(--color-primary-light)',
  },
  danger: {
    background: 'var(--color-danger)',
    color: '#ffffff',
    border: 'none',
    hover: 'var(--color-danger)',
  },
  success: {
    background: 'var(--color-success)',
    color: '#ffffff',
    border: 'none',
    hover: 'var(--color-success)',
  },
  warning: {
    background: 'var(--color-warning)',
    color: '#ffffff',
    border: 'none',
    hover: 'var(--color-warning)',
  },
  gradient: {
    background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
    color: '#ffffff',
    border: 'none',
    hover: 'linear-gradient(90deg, var(--color-primary-hover) 0%, var(--color-primary) 100%)',
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// PANEL VARIANTS
// ───────────────────────────────────────────────────────────────────────────

export const PANEL_VARIANTS = {
  solid: {
    background: 'var(--color-surface)',
    border: `1px solid var(--color-border)`,
    shadow: PRIMITIVE_TOKENS.shadow.md,
    headerBackground: 'var(--color-page-bg)',
  },
  outline: {
    background: 'transparent',
    border: `2px solid var(--color-border)`,
    shadow: 'none',
    headerBackground: 'transparent',
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: PRIMITIVE_TOKENS.blur.md,
    border: `1px solid rgba(255, 255, 255, 0.2)`,
    shadow: PRIMITIVE_TOKENS.shadow.sm,
    headerBackground: 'rgba(255, 255, 255, 0.3)',
  },
  minimal: {
    background: 'transparent',
    border: 'none',
    shadow: 'none',
    headerBackground: 'transparent',
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// TABLE VARIANTS
// ───────────────────────────────────────────────────────────────────────────

export const TABLE_VARIANTS = {
  minimal: {
    headerBackground: 'transparent',
    headerBorder: `1px solid var(--color-border)`,
    rowHover: 'transparent',
    cellPadding: PRIMITIVE_TOKENS.spacing[2],
  },
  striped: {
    headerBackground: 'var(--color-page-bg)',
    headerBorder: `1px solid var(--color-border)`,
    rowHover: 'var(--color-primary-light)',
    cellPadding: PRIMITIVE_TOKENS.spacing[3],
    stripedRow: 'var(--color-page-bg)',
  },
  bordered: {
    headerBackground: 'var(--color-primary)',
    headerBorder: `2px solid var(--color-primary)`,
    headerColor: '#ffffff',
    rowHover: 'var(--color-primary-light)',
    cellPadding: PRIMITIVE_TOKENS.spacing[3],
    cellBorder: `1px solid var(--color-border)`,
  },
  hover: {
    headerBackground: 'var(--color-page-bg)',
    headerBorder: `1px solid var(--color-border)`,
    rowHover: 'var(--color-primary-light)',
    cellPadding: PRIMITIVE_TOKENS.spacing[3],
    transition: PRIMITIVE_TOKENS.transition.base,
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// PRESET COMBINATIONS (Ready-to-use component sets)
// ───────────────────────────────────────────────────────────────────────────

export const PRESET_COMBOS = {
  // Card presets
  cardPrimary: {
    variant: 'gradient' as const,
    padding: 'lg' as const,
    shadow: 'md' as const,
  },
  cardSecondary: {
    variant: 'solid' as const,
    padding: 'md' as const,
    shadow: 'sm' as const,
  },
  cardMuted: {
    variant: 'outline' as const,
    padding: 'md' as const,
    shadow: 'none' as const,
  },

  // Button presets
  buttonPrimary: {
    variant: 'gradient' as const,
    size: 'md' as const,
  },
  buttonSecondary: {
    variant: 'secondary' as const,
    size: 'md' as const,
  },
  buttonDanger: {
    variant: 'danger' as const,
    size: 'md' as const,
  },

  // Panel presets
  panelDefault: {
    variant: 'solid' as const,
  },
  panelMinimal: {
    variant: 'minimal' as const,
  },

  // Table presets
  tableDefault: {
    variant: 'hover' as const,
  },
  tableStriped: {
    variant: 'striped' as const,
  },
  tableBordered: {
    variant: 'bordered' as const,
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// COMPOUND VARIANTS (Super advanced!)
// ───────────────────────────────────────────────────────────────────────────

export const COMPOUND_VARIANTS = {
  // Pro card: elevated + gradient background + large padding
  proCard: {
    base: CARD_VARIANTS.elevated,
    ...PRESET_COMBOS.cardPrimary,
  },

  // Featured card: glass effect + extra shadow + interactive
  featuredCard: {
    base: CARD_VARIANTS.glass,
    interactive: true,
    padding: 'xl' as const,
    shadow: 'lg' as const,
  },

  // Call-to-action button: big gradient with hover effect
  ctaButton: {
    base: BUTTON_VARIANTS.gradient,
    size: 'lg' as const,
    fullWidth: true,
  },

  // Urgent action button: danger with emphasis
  urgentButton: {
    base: BUTTON_VARIANTS.danger,
    size: 'lg' as const,
    emphasis: true,
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// VARIANT UTILITIES
// ───────────────────────────────────────────────────────────────────────────

/**
 * Get variant styles for a component
 *
 * Usage:
 *   const styles = getVariantStyles('card', 'gradient');
 *   const styles = getVariantStyles('button', 'primary');
 */
export function getVariantStyles(
  component: 'card' | 'button' | 'panel' | 'table',
  variant: string | undefined
) {
  switch (component) {
    case 'card':
      return CARD_VARIANTS[variant as CardVariant] || CARD_VARIANTS.solid;
    case 'button':
      return BUTTON_VARIANTS[variant as ButtonVariant] || BUTTON_VARIANTS.primary;
    case 'panel':
      return PANEL_VARIANTS[variant as PanelVariant] || PANEL_VARIANTS.solid;
    case 'table':
      return TABLE_VARIANTS[variant as TableVariant] || TABLE_VARIANTS.hover;
    default:
      return {};
  }
}

/**
 * Merge multiple variant styles
 *
 * Usage:
 *   const merged = mergeVariants(
 *     getVariantStyles('card', 'solid'),
 *     { padding: PRIMITIVE_TOKENS.spacing[6] }
 *   );
 */
export function mergeVariants(...variants: Record<string, any>[]): Record<string, any> {
  return variants.reduce((acc, variant) => ({ ...acc, ...variant }), {});
}

/**
 * Apply variant preset
 *
 * Usage:
 *   const cardProps = applyPreset('cardPrimary');
 */
export function applyPreset(presetName: keyof typeof PRESET_COMBOS) {
  return PRESET_COMBOS[presetName];
}

