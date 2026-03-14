// This file intentionally exports both utility functions (fmtKES, fmtCount, greeting)
// and React components from the same module. They are tightly coupled dashboard
// utilities and splitting them would create unnecessary indirection.
/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmtKES = (n: number | undefined | null) =>
    `KES ${(n ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtCount = (n: number | undefined | null) =>
    (n ?? 0).toLocaleString('en-KE');

export const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

export interface StatCardProps {
    label:       string;
    value:       string;
    icon:        React.ElementType;
    iconBg:      string;
    iconColor:   string;
    loading:     boolean;
    badge?:      number;
    badgeColor?: 'red' | 'orange' | 'amber';
    linkTo?:     string;
    accent?:     string;
    sublabel?:   string;
}

export const StatCard: React.FC<StatCardProps> = ({
                                                      label, value, icon: Icon, iconBg, iconColor,
                                                      loading, badge, badgeColor, linkTo, accent, sublabel,
                                                  }) => {
    const badgeColors = {
        red:    'bg-red-500',
        orange: 'bg-orange-500',
        amber:  'bg-amber-400',
    };

    const inner = (
        <div className={`relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 h-full group hover:shadow-md transition-shadow ${accent ?? ''}`}>
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                {badge !== undefined && badge > 0 && (
                    <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[badgeColor ?? 'red']}`}>
                        {badge}
                    </span>
                )}
            </div>
            {loading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <div>
                    <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
                    {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
                </div>
            )}
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            {linkTo && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
            )}
        </div>
    );

    return linkTo ? <Link to={linkTo} className="block h-full">{inner}</Link> : inner;
};

// ─── Quick Action Button ──────────────────────────────────────────────────────

export interface QuickLinkProps {
    label:     string;
    to:        string;
    icon:      React.ElementType;
    color:     string;
    textColor: string;
}

export const QuickLink: React.FC<QuickLinkProps> = ({ label, to, icon: Icon, color, textColor }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 ${color} rounded-xl text-sm font-medium ${textColor} hover:opacity-90 transition-opacity`}
    >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
    </Link>
);

// ─── Page header ──────────────────────────────────────────────────────────────

export const DashboardHeader: React.FC<{
    name:     string;
    roleLabel: string;
    onRefresh: () => void;
    loading:   boolean;
    icon:      React.ElementType;
    iconColor: string;
}> = ({ name, roleLabel, onRefresh, loading, icon: Icon, iconColor }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-900">
                    {greeting()}, {name.split(' ')[0]}
                </h1>
                <p className="text-sm text-slate-500">{roleLabel} Dashboard</p>
            </div>
        </div>
        <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
        </button>
    </div>
);