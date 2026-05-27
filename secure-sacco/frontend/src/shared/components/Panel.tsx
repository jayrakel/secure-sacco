import { type ReactNode, type CSSProperties, useState } from 'react';
import { PRIMITIVE_TOKENS } from '@/shared/design';
import { ChevronDown } from 'lucide-react';

export interface PanelProps {
  title?: string;
  subtitle?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'solid' | 'outline' | 'glass';
  className?: string;
  style?: CSSProperties;
}

export function Panel({
  title,
  subtitle,
  collapsible = false,
  defaultOpen = true,
  children,
  footer,
  variant = 'solid',
  className,
  style,
}: PanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles: Record<string, CSSProperties> = {
    solid: {
      backgroundColor: 'var(--surface-primary)',
      border: `1px solid var(--border-light)`,
      boxShadow: PRIMITIVE_TOKENS.shadow.md,
    },
    outline: {
      backgroundColor: 'transparent',
      border: `1px solid var(--border-default)`,
      boxShadow: 'none',
    },
    glass: {
      backgroundColor: 'var(--glass-color)',
      backdropFilter: PRIMITIVE_TOKENS.blur.md,
      border: `1px solid rgba(255, 255, 255, 0.2)`,
      boxShadow: PRIMITIVE_TOKENS.shadow.glass,
    },
  };

  const containerStyles: CSSProperties = {
    borderRadius: PRIMITIVE_TOKENS.radius.lg,
    overflow: 'hidden',
    transition: PRIMITIVE_TOKENS.transition.base,
    ...variantStyles[variant],
    ...style,
  };

  const headerStyles: CSSProperties = {
    padding: PRIMITIVE_TOKENS.spacing[4],
    borderBottom: isOpen ? `1px solid var(--border-light)` : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: collapsible ? 'pointer' : 'default',
    backgroundColor: 'var(--surface-secondary)',
    transition: PRIMITIVE_TOKENS.transition.fast,
  };

  const titleStyles: CSSProperties = {
    fontSize: PRIMITIVE_TOKENS.fontSize.lg[0],
    fontWeight: PRIMITIVE_TOKENS.fontWeight.bold,
    color: 'var(--text-primary)',
    margin: 0,
  };

  const subtitleStyles: CSSProperties = {
    fontSize: PRIMITIVE_TOKENS.fontSize.sm[0],
    color: 'var(--text-secondary)',
    margin: `${PRIMITIVE_TOKENS.spacing[1]} 0 0 0`,
  };

  const bodyStyles: CSSProperties = {
    padding: PRIMITIVE_TOKENS.spacing[4],
    color: 'var(--text-primary)',
    maxHeight: isOpen ? 'none' : '0px',
    overflow: 'hidden',
    transition: `max-height ${PRIMITIVE_TOKENS.transition.base}`,
  };

  const footerStyles: CSSProperties = {
    padding: PRIMITIVE_TOKENS.spacing[4],
    borderTop: `1px solid var(--border-light)`,
    backgroundColor: 'var(--surface-secondary)',
    display: 'flex',
    gap: PRIMITIVE_TOKENS.spacing[3],
    justifyContent: 'flex-end',
  };

  return (
    <div style={containerStyles} className={className}>
      <div
        style={headerStyles}
        onClick={() => collapsible && setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          if (collapsible) {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = 'var(--surface-tertiary)';
          }
        }}
        onMouseLeave={(e) => {
          if (collapsible) {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = 'var(--surface-secondary)';
          }
        }}
      >
        <div style={{ flex: 1 }}>
          {title && <h3 style={titleStyles}>{title}</h3>}
          {subtitle && <p style={subtitleStyles}>{subtitle}</p>}
        </div>
        {collapsible && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              transition: PRIMITIVE_TOKENS.transition.fast,
              transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            <ChevronDown size={20} color="var(--text-secondary)" />
          </div>
        )}
      </div>

      <div style={bodyStyles}>{children}</div>

      {footer && isOpen && <div style={footerStyles}>{footer}</div>}
    </div>
  );
}

export default Panel;

