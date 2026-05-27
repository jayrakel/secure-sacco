import React, { createContext, useContext, useEffect, useState } from 'react';

// ─── Theme definitions ────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

export interface ThemePreset {
    id: string;
    name: string;
    description: string;
    emoji: string;
    // CSS variable values applied to :root
    vars: Record<string, string>;
    darkVars: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'arctic',
        name: 'Arctic Precision',
        description: 'Clean slate-blue. Data-forward, fintech-grade.',
        emoji: '🧊',
        vars: {
            '--color-primary':         '#1d4ed8',
            '--color-primary-hover':   '#1e40af',
            '--color-primary-light':   '#eff6ff',
            '--color-primary-mid':     '#bfdbfe',
            '--color-sidebar-bg':      '#0f172a',
            '--color-sidebar-active':  '#1e293b',
            '--color-sidebar-text':    '#94a3b8',
            '--color-sidebar-text-active': '#f1f5f9',
            '--color-page-bg':         '#f8fafc',
            '--color-surface':         '#ffffff',
            '--color-border':          '#e2e8f0',
            '--color-text-heading':    '#0f172a',
            '--color-text-body':       '#334155',
            '--color-text-muted':      '#94a3b8',
            '--color-success':         '#16a34a',
            '--color-warning':         '#d97706',
            '--color-danger':          '#dc2626',
            '--color-accent-forgot':   '#16a34a',
        },
        darkVars: {
            '--color-primary':         '#3b82f6',
            '--color-primary-hover':   '#2563eb',
            '--color-primary-light':   '#1e3a5f',
            '--color-primary-mid':     '#1e40af',
            '--color-sidebar-bg':      '#020617',
            '--color-sidebar-active':  '#0f172a',
            '--color-sidebar-text':    '#64748b',
            '--color-sidebar-text-active': '#e2e8f0',
            '--color-page-bg':         '#0f172a',
            '--color-surface':         '#1e293b',
            '--color-border':          '#334155',
            '--color-text-heading':    '#f1f5f9',
            '--color-text-body':       '#cbd5e1',
            '--color-text-muted':      '#64748b',
            '--color-success':         '#22c55e',
            '--color-warning':         '#f59e0b',
            '--color-danger':          '#ef4444',
            '--color-accent-forgot':   '#22c55e',
        },
    },
    {
        id: 'forest',
        name: 'Forest Trust',
        description: 'Deep greens on near-black. Premium, trustworthy.',
        emoji: '🌲',
        vars: {
            '--color-primary':         '#15803d',
            '--color-primary-hover':   '#166534',
            '--color-primary-light':   '#f0fdf4',
            '--color-primary-mid':     '#bbf7d0',
            '--color-sidebar-bg':      '#0a120c',
            '--color-sidebar-active':  '#162219',
            '--color-sidebar-text':    '#52b788',
            '--color-sidebar-text-active': '#d8f3dc',
            '--color-page-bg':         '#f0fdf4',
            '--color-surface':         '#ffffff',
            '--color-border':          '#d1fae5',
            '--color-text-heading':    '#052e16',
            '--color-text-body':       '#166534',
            '--color-text-muted':      '#6ee7b7',
            '--color-success':         '#15803d',
            '--color-warning':         '#d97706',
            '--color-danger':          '#dc2626',
            '--color-accent-forgot':   '#15803d',
        },
        darkVars: {
            '--color-primary':         '#4ade80',
            '--color-primary-hover':   '#22c55e',
            '--color-primary-light':   '#14532d',
            '--color-primary-mid':     '#166534',
            '--color-sidebar-bg':      '#020d04',
            '--color-sidebar-active':  '#0a120c',
            '--color-sidebar-text':    '#4d7c5a',
            '--color-sidebar-text-active': '#a7f3d0',
            '--color-page-bg':         '#071a0c',
            '--color-surface':         '#0d2414',
            '--color-border':          '#1a4a29',
            '--color-text-heading':    '#d1fae5',
            '--color-text-body':       '#a7f3d0',
            '--color-text-muted':      '#4d7c5a',
            '--color-success':         '#4ade80',
            '--color-warning':         '#fbbf24',
            '--color-danger':          '#f87171',
            '--color-accent-forgot':   '#4ade80',
        },
    },
    {
        id: 'ivory',
        name: 'Ivory & Copper',
        description: 'Warm ivory with copper accents. Editorial warmth.',
        emoji: '🏺',
        vars: {
            '--color-primary':         '#b45309',
            '--color-primary-hover':   '#92400e',
            '--color-primary-light':   '#fffbeb',
            '--color-primary-mid':     '#fde68a',
            '--color-sidebar-bg':      '#1a1208',
            '--color-sidebar-active':  '#2d1f0e',
            '--color-sidebar-text':    '#8a7a5a',
            '--color-sidebar-text-active': '#fef3c7',
            '--color-page-bg':         '#faf8f4',
            '--color-surface':         '#ffffff',
            '--color-border':          '#e8e0d0',
            '--color-text-heading':    '#1a1208',
            '--color-text-body':       '#3a2e1a',
            '--color-text-muted':      '#a08060',
            '--color-success':         '#15803d',
            '--color-warning':         '#b45309',
            '--color-danger':          '#dc2626',
            '--color-accent-forgot':   '#b45309',
        },
        darkVars: {
            '--color-primary':         '#f59e0b',
            '--color-primary-hover':   '#d97706',
            '--color-primary-light':   '#2d1f0e',
            '--color-primary-mid':     '#451a03',
            '--color-sidebar-bg':      '#0c0904',
            '--color-sidebar-active':  '#1a1208',
            '--color-sidebar-text':    '#5c4a2a',
            '--color-sidebar-text-active': '#fde68a',
            '--color-page-bg':         '#12100a',
            '--color-surface':         '#1e1a10',
            '--color-border':          '#2d2518',
            '--color-text-heading':    '#fef3c7',
            '--color-text-body':       '#fde68a',
            '--color-text-muted':      '#5c4a2a',
            '--color-success':         '#4ade80',
            '--color-warning':         '#fbbf24',
            '--color-danger':          '#f87171',
            '--color-accent-forgot':   '#f59e0b',
        },
    },
    {
        id: 'midnight',
        name: 'Midnight Indigo',
        description: 'Deep purple-indigo. Rich, modern, professional.',
        emoji: '🌌',
        vars: {
            '--color-primary':         '#4f46e5',
            '--color-primary-hover':   '#4338ca',
            '--color-primary-light':   '#eef2ff',
            '--color-primary-mid':     '#c7d2fe',
            '--color-sidebar-bg':      '#1e1b4b',
            '--color-sidebar-active':  '#312e81',
            '--color-sidebar-text':    '#a5b4fc',
            '--color-sidebar-text-active': '#e0e7ff',
            '--color-page-bg':         '#f5f3ff',
            '--color-surface':         '#ffffff',
            '--color-border':          '#e0e7ff',
            '--color-text-heading':    '#1e1b4b',
            '--color-text-body':       '#3730a3',
            '--color-text-muted':      '#a5b4fc',
            '--color-success':         '#16a34a',
            '--color-warning':         '#d97706',
            '--color-danger':          '#dc2626',
            '--color-accent-forgot':   '#4f46e5',
        },
        darkVars: {
            '--color-primary':         '#818cf8',
            '--color-primary-hover':   '#6366f1',
            '--color-primary-light':   '#312e81',
            '--color-primary-mid':     '#3730a3',
            '--color-sidebar-bg':      '#0d0b2e',
            '--color-sidebar-active':  '#1e1b4b',
            '--color-sidebar-text':    '#4c4896',
            '--color-sidebar-text-active': '#c7d2fe',
            '--color-page-bg':         '#0d0b2e',
            '--color-surface':         '#1e1b4b',
            '--color-border':          '#312e81',
            '--color-text-heading':    '#e0e7ff',
            '--color-text-body':       '#c7d2fe',
            '--color-text-muted':      '#4c4896',
            '--color-success':         '#4ade80',
            '--color-warning':         '#fbbf24',
            '--color-danger':          '#f87171',
            '--color-accent-forgot':   '#818cf8',
        },
    },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextType {
    themeId: string;
    mode: ThemeMode;
    preset: ThemePreset;
    setTheme: (id: string) => void;
    toggleMode: () => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

const LS_THEME = 'sacco_theme_id';
const LS_MODE  = 'sacco_theme_mode';

function applyTheme(preset: ThemePreset, mode: ThemeMode) {
    const vars = mode === 'dark' ? { ...preset.vars, ...preset.darkVars } : preset.vars;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.classList.toggle('dark', mode === 'dark');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeId, setThemeId] = useState<string>(() => localStorage.getItem(LS_THEME) ?? 'arctic');
    const [mode, setModeState]  = useState<ThemeMode>(() => (localStorage.getItem(LS_MODE) as ThemeMode) ?? 'light');

    const preset = THEME_PRESETS.find(p => p.id === themeId) ?? THEME_PRESETS[0];

    useEffect(() => { applyTheme(preset, mode); }, [preset, mode]);

    const setTheme = (id: string) => {
        setThemeId(id);
        localStorage.setItem(LS_THEME, id);
    };

    const setMode = (m: ThemeMode) => {
        setModeState(m);
        localStorage.setItem(LS_MODE, m);
    };

    const toggleMode = () => setMode(mode === 'light' ? 'dark' : 'light');

    return (
        <ThemeContext.Provider value={{ themeId, mode, preset, setTheme, toggleMode, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
};