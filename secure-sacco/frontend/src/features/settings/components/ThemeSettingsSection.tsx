import React from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme, THEME_PRESETS } from '../../../shared/context/ThemeContext';

export const ThemeSettingsSection: React.FC = () => {
    const { themeId, mode, setTheme, setMode } = useTheme();

    const activePreset = THEME_PRESETS.find(p => p.id === themeId) ?? THEME_PRESETS[0];
    const activeVars   = mode === 'dark'
        ? { ...activePreset.vars, ...activePreset.darkVars }
        : activePreset.vars;

    return (
        <div className="space-y-8">

            {/* ── Mode toggle ─────────────────────────────────────────── */}
            <div>
                <p className="text-xs font-semibold text-slate-800 mb-1">Display mode</p>
                <p className="text-xs text-slate-500 mb-4">Applies to your browser only — other users keep their own preference.</p>
                <div className="flex gap-3">
                    {([
                        { value: 'light', label: 'Light',  Icon: Sun  },
                        { value: 'dark',  label: 'Dark',   Icon: Moon },
                    ] as const).map(({ value, label, Icon }) => (
                        <button key={value} onClick={() => setMode(value)}
                                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                                    mode === value
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}>
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Theme preset picker ─────────────────────────────────── */}
            <div>
                <p className="text-xs font-semibold text-slate-800 mb-1">Colour theme</p>
                <p className="text-xs text-slate-500 mb-4">Changes the sidebar, primary colour, and all status colours globally.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {THEME_PRESETS.map(preset => {
                        const active = themeId === preset.id;
                        const vars = mode === 'dark' ? { ...preset.vars, ...preset.darkVars } : preset.vars;
                        return (
                            <button key={preset.id} onClick={() => setTheme(preset.id)}
                                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all relative ${
                                        active
                                            ? 'ring-2 ring-offset-1'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                    style={active ? {
                                        borderColor: vars['--color-primary'],
                                        '--tw-ring-color': vars['--color-primary'],
                                        background: `color-mix(in srgb, ${vars['--color-primary']} 8%, white)`,
                                    } as React.CSSProperties : {}}>

                                {/* Colour swatches */}
                                <div className="flex-shrink-0 flex flex-col gap-1 pt-0.5">
                                    <div className="flex gap-1">
                                        <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: vars['--color-primary'] }} title="Primary" />
                                        <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: vars['--color-sidebar-bg'] }} title="Sidebar" />
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: vars['--color-success'] }} title="Success" />
                                        <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: vars['--color-warning'] }} title="Warning" />
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: vars['--color-danger'] }} title="Danger" />
                                        <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: vars['--color-page-bg'], border: '1px solid #e2e8f0' }} title="Background" />
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg leading-none">{preset.emoji}</span>
                                        <span className="text-sm font-semibold text-slate-800">{preset.name}</span>
                                        {active && (
                                            <span className="ml-auto flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                                                  style={{ background: vars['--color-primary'] }}>
                                                <Check size={10} /> Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{preset.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Live colour palette for active theme ─────────────────── */}
            <div>
                <p className="text-xs font-semibold text-slate-800 mb-1">
                    {activePreset.emoji} {activePreset.name} — colour palette
                </p>
                <p className="text-xs text-slate-500 mb-4">
                    All colours shown for the active theme in {mode} mode.
                </p>
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { key: '--color-primary',      label: 'Primary' },
                            { key: '--color-sidebar-bg',   label: 'Sidebar' },
                            { key: '--color-page-bg',      label: 'Background', border: true },
                            { key: '--color-surface',      label: 'Surface', border: true },
                            { key: '--color-success',      label: 'Success / Covered' },
                            { key: '--color-warning',      label: 'Warning / Due' },
                            { key: '--color-danger',       label: 'Danger / Overdue' },
                            { key: '--color-primary-light',label: 'Upcoming / Info bg' },
                            { key: '--color-text-heading', label: 'Heading text', border: true },
                            { key: '--color-text-body',    label: 'Body text', border: true },
                            { key: '--color-text-muted',   label: 'Muted / Pending', border: true },
                            { key: '--color-border',       label: 'Borders', border: true },
                        ].map(({ key, label, border }) => (
                            <div key={key} className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex-shrink-0 shadow-sm ${border ? 'border border-slate-200' : ''}`}
                                     style={{ background: activeVars[key] }} />
                                <div>
                                    <p className="text-xs font-medium text-slate-700 leading-none">{label}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{activeVars[key]}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Note ─────────────────────────────────────────────────── */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Monitor size={15} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                    Theme and dark mode are saved to your browser. Each team member can set their own independently.
                    Changes take effect instantly across the entire system — no page refresh needed.
                </p>
            </div>
        </div>
    );
};