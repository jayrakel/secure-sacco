import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Compact toggle button — drop into Sidebar footer or Topbar.
 */
export const DarkModeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { mode, toggleMode } = useTheme();

    return (
        <button
            onClick={toggleMode}
            title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                mode === 'dark'
                    ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } ${className}`}>
            {mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    );
};