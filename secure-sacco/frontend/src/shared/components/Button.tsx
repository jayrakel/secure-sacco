import { type CSSProperties, type ReactNode } from 'react';
import { PRIMITIVE_TOKENS } from '@/shared/design';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonState = 'idle' | 'loading' | 'disabled' | 'success';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

const sizeMap: Record<ButtonSize, CSSProperties> = {
  xs: {
    padding: `${PRIMITIVE_TOKENS.spacing[1]} ${PRIMITIVE_TOKENS.spacing[2]}`,
    fontSize: PRIMITIVE_TOKENS.fontSize.xs[0],
  },
  sm: {
    padding: `${PRIMITIVE_TOKENS.spacing[1.5]} ${PRIMITIVE_TOKENS.spacing[3]}`,
    fontSize: PRIMITIVE_TOKENS.fontSize.sm[0],
  },
  md: {
    padding: `${PRIMITIVE_TOKENS.spacing[2]} ${PRIMITIVE_TOKENS.spacing[4]}`,
    fontSize: PRIMITIVE_TOKENS.fontSize.base[0],
  },
  lg: {
    padding: `${PRIMITIVE_TOKENS.spacing[3]} ${PRIMITIVE_TOKENS.spacing[6]}`,
    fontSize: PRIMITIVE_TOKENS.fontSize.lg[0],
  },
  xl: {
    padding: `${PRIMITIVE_TOKENS.spacing[4]} ${PRIMITIVE_TOKENS.spacing[8]}`,
    fontSize: PRIMITIVE_TOKENS.fontSize.xl[0],
  },
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: 'var(--brand-primary)',
    color: 'var(--text-inverse)',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'var(--surface-secondary)',
    color: 'var(--text-primary)',
    border: `1px solid var(--border-default)`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--brand-primary)',
    border: `1px solid var(--brand-primary)`,
  },
  danger: {
    backgroundColor: 'var(--brand-error)',
    color: 'var(--text-inverse)',
    border: 'none',
  },
  success: {
    backgroundColor: 'var(--brand-success)',
    color: 'var(--text-inverse)',
    border: 'none',
  },
  warning: {
    backgroundColor: 'var(--brand-warning)',
    color: 'var(--text-inverse)',
    border: 'none',
  },
};

const baseStyles: CSSProperties = {
  borderRadius: PRIMITIVE_TOKENS.radius.lg,
  fontWeight: PRIMITIVE_TOKENS.fontWeight.semibold,
  cursor: 'pointer',
  transition: PRIMITIVE_TOKENS.transition.fast,
  display: 'inline-flex',
  alignItems: 'center',
  gap: PRIMITIVE_TOKENS.spacing[2],
  border: 'none',
};

export function Button({
  variant = 'primary',
  size = 'md',
  state = 'idle',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  children,
  className,
  style,
  type = 'button',
  title,
}: ButtonProps) {
  const isDisabled = state === 'disabled';
  const isLoading = state === 'loading';

  const stateStyles: CSSProperties =
    state === 'disabled'
      ? {
          opacity: 0.5,
          cursor: 'not-allowed',
        }
      : state === 'loading'
        ? {
            opacity: 0.7,
            cursor: 'wait',
          }
        : {};

  const containerStyles: CSSProperties = {
    ...baseStyles,
    ...sizeMap[size],
    ...variantStyles[variant],
    ...stateStyles,
    width: fullWidth ? '100%' : 'auto',
    justifyContent: fullWidth ? 'center' : 'center',
    ...style,
  };

  const iconElement = icon ? <span>{icon}</span> : null;

  return (
    <button
      type={type}
      style={containerStyles}
      onClick={onClick}
      disabled={isDisabled || isLoading}
      className={className}
      title={title}
      onMouseEnter={(e) => {
        if (!isDisabled && !isLoading && variant === 'primary') {
          const el = e.currentTarget;
          el.style.boxShadow = PRIMITIVE_TOKENS.shadow.lg;
          el.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled && !isLoading) {
          const el = e.currentTarget;
          el.style.boxShadow = 'none';
          el.style.transform = 'translateY(0)';
        }
      }}
    >
      {iconPosition === 'left' && iconElement}
      <span>{isLoading ? '...' : children}</span>
      {iconPosition === 'right' && iconElement}
    </button>
  );
}

export default Button;

