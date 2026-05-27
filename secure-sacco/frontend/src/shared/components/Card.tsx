import { type CSSProperties, type ReactNode } from 'react';
import { PRIMITIVE_TOKENS, type CardVariant } from '@/shared/design';

export type CardPadding = 'sm' | 'md' | 'lg' | 'xl';
export type CardShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  shadow?: CardShadow;
  interactive?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const paddingMap: Record<CardPadding, string> = {
  sm: PRIMITIVE_TOKENS.spacing[3],
  md: PRIMITIVE_TOKENS.spacing[4],
  lg: PRIMITIVE_TOKENS.spacing[6],
  xl: PRIMITIVE_TOKENS.spacing[8],
};

const shadowMap: Record<CardShadow, string> = {
  none: PRIMITIVE_TOKENS.shadow.none,
  sm: PRIMITIVE_TOKENS.shadow.sm,
  md: PRIMITIVE_TOKENS.shadow.md,
  lg: PRIMITIVE_TOKENS.shadow.lg,
  xl: PRIMITIVE_TOKENS.shadow.xl,
};

export function Card({
  variant = 'solid',
  padding = 'md',
  shadow = 'md',
  interactive = false,
  onClick,
  children,
  className,
  style,
}: CardProps) {
  const baseStyles: CSSProperties = {
    borderRadius: PRIMITIVE_TOKENS.radius.lg,
    transition: PRIMITIVE_TOKENS.transition.base,
    cursor: interactive ? 'pointer' : 'default',
  };

  const variantStyles: Record<CardVariant, CSSProperties> = {
    solid: {
      backgroundColor: 'var(--color-surface)',
      border: `1px solid var(--color-border)`,
      boxShadow: shadowMap[shadow],
    },
    outline: {
      backgroundColor: 'transparent',
      border: `2px solid var(--color-border)`,
      boxShadow: 'none',
    },
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: PRIMITIVE_TOKENS.blur.md,
      border: `1px solid rgba(255, 255, 255, 0.2)`,
      boxShadow: PRIMITIVE_TOKENS.shadow.sm,
    },
    gradient: {
      background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%)',
      border: `1px solid var(--color-primary)`,
      boxShadow: shadowMap[shadow],
    },
    elevated: {
      backgroundColor: 'var(--color-surface)',
      border: 'none',
      boxShadow: shadowMap.lg,
    },
  };

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        padding: paddingMap[padding],
        ...baseStyles,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (interactive && variant === 'solid') {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = shadowMap.lg;
          el.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (interactive && variant === 'solid') {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = shadowMap[shadow];
          el.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
}

export default Card;
