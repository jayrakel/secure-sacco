/**
 * ════════════════════════════════════════════════════════════════════════════════
 * PHASE 1: TOKENIZATION
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Design tokens are the single source of truth for all visual properties.
 * Built with a layered approach:
 *
 * Layer 1: Primitive Tokens (raw colors, sizes)
 * Layer 2: Semantic Tokens (purpose-driven: primary, success, etc.)
 * Layer 3: Component Tokens (ready-to-use for components)
 *
 * These will be emitted as CSS variables for runtime theme switching and
 * as TypeScript objects for compile-time type safety.
 */

// ════════════════════════════════════════════════════════════════════════════════
// LAYER 1: PRIMITIVE TOKENS (Raw Design Values)
// ════════════════════════════════════════════════════════════════════════════════

export const PRIMITIVE_TOKENS = {
  // ── Colors: Neutrals ──────────────────────────────────────────────────────
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    150: '#ececf1',
    200: '#e5e7eb',
    250: '#d9dcdf',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    750: '#26292f',
    800: '#1f2937',
    850: '#18202b',
    900: '#111827',
    950: '#0a0e1f',
  },

  // ── Colors: Semantic Palettes ─────────────────────────────────────────────
  emerald: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
  },

  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  violet: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a78bfa',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // ── Spacing Scale ─────────────────────────────────────────────────────
  spacing: {
    0: '0',
    0.5: '0.125rem',   // 2px
    1: '0.25rem',      // 4px
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px
    2.5: '0.625rem',   // 10px
    3: '0.75rem',      // 12px
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    7: '1.75rem',      // 28px
    8: '2rem',         // 32px
    10: '2.5rem',      // 40px
    12: '3rem',        // 48px
    13: '3.25rem',     // 52px
    14: '3.5rem',      // 56px
    16: '4rem',        // 64px
    17: '4.25rem',     // 68px
    20: '5rem',        // 80px
    24: '6rem',        // 96px
    60: '15rem',       // 240px
  } as const,

  // ── Border Radius ─────────────────────────────────────────────────────────
  radius: {
    none: '0',
    xs: '0.25rem',    // 4px - Minimal rounding
    sm: '0.375rem',   // 6px - Subtle rounding
    md: '0.5rem',     // 8px - Standard rounding
    lg: '0.75rem',    // 12px - Rounded
    xl: '1rem',       // 16px - Very rounded
    '2xl': '1.5rem',  // 24px - Extra rounded
    '3xl': '2rem',    // 32px - Very extra rounded
    full: '9999px',   // Pill-shaped
  },

  // ── Typography: Font Sizes ───────────────────────────────────────────────
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],           // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],       // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],          // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],       // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],        // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],         // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],    // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],      // 36px
    '5xl': ['3rem', { lineHeight: '1' }],              // 48px
  },

  // ── Typography: Font Weights ─────────────────────────────────────────────
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadow: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  },

  // ── Backdrop / Blur ───────────────────────────────────────────────────────
  blur: {
    none: 'none',
    xs: 'blur(4px)',
    sm: 'blur(8px)',
    md: 'blur(12px)',
    lg: 'blur(16px)',
    xl: 'blur(24px)',
    '2xl': 'blur(40px)',
  },

  // ── Transitions ───────────────────────────────────────────────────────────
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ════════════════════════════════════════════════════════════════════════════════
// LAYER 2: SEMANTIC TOKENS (Purpose-Driven Tokens)
// ════════════════════════════════════════════════════════════════════════════════

export const SEMANTIC_TOKENS = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  surface: {
    primary: PRIMITIVE_TOKENS.neutral[0],      // White (light) / Darkest (dark)
    secondary: PRIMITIVE_TOKENS.neutral[50],   // Very light gray (light) / Dark gray (dark)
    tertiary: PRIMITIVE_TOKENS.neutral[100],   // Light gray (light) / Very dark gray (dark)
    overlay: 'rgba(0, 0, 0, 0.5)',             // Semi-transparent dark
    glass: 'rgba(255, 255, 255, 0.7)',         // Frosted glass
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  text: {
    primary: PRIMITIVE_TOKENS.neutral[900],    // Dark text on light / Light text on dark
    secondary: PRIMITIVE_TOKENS.neutral[600],  // Muted text
    tertiary: PRIMITIVE_TOKENS.neutral[500],   // Further muted
    disabled: PRIMITIVE_TOKENS.neutral[400],   // Disabled state text
    inverse: PRIMITIVE_TOKENS.neutral[0],      // Light text for dark backgrounds
  },

  // ── Brands & States ──────────────────────────────────────────────────────
  brand: {
    primary: PRIMITIVE_TOKENS.emerald[600],    // Main primary color
    primaryLight: PRIMITIVE_TOKENS.emerald[50],
    primaryMid: PRIMITIVE_TOKENS.emerald[100],
    success: PRIMITIVE_TOKENS.emerald[600],
    warning: PRIMITIVE_TOKENS.amber[600],
    error: PRIMITIVE_TOKENS.red[600],
    info: PRIMITIVE_TOKENS.blue[600],
    neutral: PRIMITIVE_TOKENS.neutral[400],
  },

  // ── Borders ───────────────────────────────────────────────────────────────
  border: {
    default: PRIMITIVE_TOKENS.neutral[200],
    light: PRIMITIVE_TOKENS.neutral[100],
    strong: PRIMITIVE_TOKENS.neutral[300],
    focus: PRIMITIVE_TOKENS.emerald[600],
  },

  // ── Backdrops ─────────────────────────────────────────────────────────────
  backdrop: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

// ════════════════════════════════════════════════════════════════════════════════
// LAYER 3: COMPONENT TOKENS (Ready-to-use for Specific Components)
// ════════════════════════════════════════════════════════════════════════════════

export const COMPONENT_TOKENS = {
  // ── Button ────────────────────────────────────────────────────────────────
  button: {
    base: {
      padding: `${PRIMITIVE_TOKENS.spacing[2]} ${PRIMITIVE_TOKENS.spacing[4]}`,
      fontSize: PRIMITIVE_TOKENS.fontSize.base,
      fontWeight: PRIMITIVE_TOKENS.fontWeight.medium,
      borderRadius: PRIMITIVE_TOKENS.radius.lg,
      transition: `all ${PRIMITIVE_TOKENS.transition.fast}`,
      border: 'none',
      cursor: 'pointer',
    },
    sizes: {
      xs: {
        padding: `${PRIMITIVE_TOKENS.spacing[1]} ${PRIMITIVE_TOKENS.spacing[2]}`,
        fontSize: PRIMITIVE_TOKENS.fontSize.xs,
      },
      sm: {
        padding: `${PRIMITIVE_TOKENS.spacing[1.5]} ${PRIMITIVE_TOKENS.spacing[3]}`,
        fontSize: PRIMITIVE_TOKENS.fontSize.sm,
      },
      md: {
        padding: `${PRIMITIVE_TOKENS.spacing[2]} ${PRIMITIVE_TOKENS.spacing[4]}`,
        fontSize: PRIMITIVE_TOKENS.fontSize.base,
      },
      lg: {
        padding: `${PRIMITIVE_TOKENS.spacing[3]} ${PRIMITIVE_TOKENS.spacing[6]}`,
        fontSize: PRIMITIVE_TOKENS.fontSize.lg,
      },
      xl: {
        padding: `${PRIMITIVE_TOKENS.spacing[4]} ${PRIMITIVE_TOKENS.spacing[8]}`,
        fontSize: PRIMITIVE_TOKENS.fontSize.xl,
      },
    },
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    base: {
      background: SEMANTIC_TOKENS.surface.primary,
      borderRadius: PRIMITIVE_TOKENS.radius.xl,
      border: `1px solid ${SEMANTIC_TOKENS.border.light}`,
      padding: PRIMITIVE_TOKENS.spacing[6],
      shadow: PRIMITIVE_TOKENS.shadow.md,
      transition: `all ${PRIMITIVE_TOKENS.transition.base}`,
    },
  },

  // ── Input ─────────────────────────────────────────────────────────────────
  input: {
    base: {
      padding: `${PRIMITIVE_TOKENS.spacing[2]} ${PRIMITIVE_TOKENS.spacing[3]}`,
      fontSize: PRIMITIVE_TOKENS.fontSize.base,
      borderRadius: PRIMITIVE_TOKENS.radius.lg,
      border: `1px solid ${SEMANTIC_TOKENS.border.default}`,
      transition: `all ${PRIMITIVE_TOKENS.transition.fast}`,
    },
  },

  // ── Badge / Chip ──────────────────────────────────────────────────────────
  badge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: PRIMITIVE_TOKENS.spacing[1],
      padding: `${PRIMITIVE_TOKENS.spacing[1]} ${PRIMITIVE_TOKENS.spacing[2]}`,
      fontSize: PRIMITIVE_TOKENS.fontSize.xs,
      fontWeight: PRIMITIVE_TOKENS.fontWeight.medium,
      borderRadius: PRIMITIVE_TOKENS.radius.full,
    },
  },
} as const;

export type PrimitiveTokens = typeof PRIMITIVE_TOKENS;
export type SemanticTokens = typeof SEMANTIC_TOKENS;
export type ComponentTokens = typeof COMPONENT_TOKENS;

// Export everything as a unified token set
export const DESIGN_TOKENS = {
  primitive: PRIMITIVE_TOKENS,
  semantic: SEMANTIC_TOKENS,
  component: COMPONENT_TOKENS,
} as const;

