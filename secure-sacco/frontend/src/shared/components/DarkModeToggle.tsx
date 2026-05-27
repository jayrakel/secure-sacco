import React, { type CSSProperties } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PRIMITIVE_TOKENS } from '@/shared/design';

/**
 * Compact toggle button — drop into Sidebar footer or Topbar.
 */
export const DarkModeToggle: React.FC<{ className?: string; style?: CSSProperties }> = ({ className = '', style }) => {
    const { mode, toggleMode } = useTheme();

    const isDark = mode === 'dark';

    return (
        <button
            onClick={toggleMode}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: PRIMITIVE_TOKENS.spacing[8],
                height: PRIMITIVE_TOKENS.spacing[8],
                borderRadius: PRIMITIVE_TOKENS.radius.lg,
                background: isDark ? 'var(--surface-secondary)' : 'var(--surface-secondary)',
                color: isDark ? '#fcd34d' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: PRIMITIVE_TOKENS.transition.fast,
                ...style,
            }}
            className={className}
            onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
            }}
        >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    );
};