import React from 'react';
import { Link } from 'react-router-dom';
import {
    FileText, AlertTriangle, Wallet, TrendingUp,
    Lock, BarChart3, ArrowRight,
} from 'lucide-react';
import HasPermission from '../../../shared/components/HasPermission';
import { useAuth } from '../../auth/context/AuthProvider';

// ─── Tile config ───────────────────────────────────────────────────────────────
interface TileConfig {
    to: string;
    permission: string;
    icon: React.ElementType;
    gradient: string;
    iconColor: string;
    hoverBorder: string;
    title: string;
    description: string;
    tag: string;
}

const TILES: TileConfig[] = [
    {
        to: '/reports/statements',
        permission: 'REPORTS_READ',
        icon: FileText,
        gradient: 'from-sky-500 to-sky-600',
        iconColor: 'text-sky-600',
        hoverBorder: 'hover:border-sky-300',
        title: 'Member Statements',
        description: 'Unified chronological ledger per member — savings, loan repayments and fines in one view.',
        tag: 'Members · Savings · Loans',
    },
    {
        to: '/reports/arrears',
        permission: 'REPORTS_READ',
        icon: AlertTriangle,
        gradient: 'from-rose-500 to-rose-600',
        iconColor: 'text-rose-600',
        hoverBorder: 'hover:border-rose-300',
        title: 'Loan Arrears',
        description: 'Non-performing loans grouped by aging bucket — 1–7, 8–30, 31–60, 61–90, 90+ days overdue.',
        tag: 'Credit Risk · Portfolio Health',
    },
    {
        to: '/reports/collections',
        permission: 'REPORTS_READ',
        icon: Wallet,
        gradient: 'from-emerald-500 to-emerald-600',
        iconColor: 'text-emerald-600',
        hoverBorder: 'hover:border-emerald-300',
        title: 'Daily Collections',
        description: 'Incoming cashflow by channel and purpose — M-Pesa STK, C2B, Bank Transfers per day.',
        tag: 'Cashflow · Liquidity · Channels',
    },
    {
        to: '/reports/income',
        permission: 'REPORTS_READ',
        icon: TrendingUp,
        gradient: 'from-violet-500 to-violet-600',
        iconColor: 'text-violet-600',
        hoverBorder: 'hover:border-violet-300',
        title: 'Income Report',
        description: 'P&L proxy across General Ledger income accounts — fees, interest earned and penalties.',
        tag: 'Fees · Interest · Penalties',
    },
];

// ─── Report tile ───────────────────────────────────────────────────────────────
const ReportTile: React.FC<TileConfig> = ({
                                              to, icon: Icon, gradient, iconColor, hoverBorder, title, description, tag,
                                          }) => (
    <Link
        to={to}
        className={`group bg-white rounded-2xl border border-slate-200 shadow-sm ${hoverBorder} hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col`}
    >
        {/* Gradient bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

        <div className="flex flex-col flex-1 p-5">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${gradient} bg-opacity-10 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
            </div>

            {/* Text */}
            <h3 className={`text-base font-bold text-slate-800 mb-1.5 group-hover:${iconColor} transition-colors`}>
                {title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed flex-1">
                {description}
            </p>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {tag}
                </span>
                <ArrowRight
                    size={14}
                    className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-150"
                />
            </div>
        </div>
    </Link>
);

// ─── Locked tile ───────────────────────────────────────────────────────────────
const LockedTile: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 shadow-sm overflow-hidden flex flex-col opacity-50 cursor-not-allowed select-none">
        <div className="h-1.5 w-full bg-slate-200" />
        <div className="flex flex-col flex-1 p-5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Lock className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-400 mb-1.5">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-1">
                You don't have permission to access this report.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                    Restricted
                </span>
            </div>
        </div>
    </div>
);

// ─── Page ──────────────────────────────────────────────────────────────────────
export const ReportsHubPage: React.FC = () => {
    const { user } = useAuth();
    const accessibleCount = TILES.filter(t =>
        user?.permissions?.includes('ROLE_SYSTEM_ADMIN') ||
        user?.permissions?.includes(t.permission)
    ).length;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">

            {/* ── Page header ── */}
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="text-slate-600" size={24} />
                        Reports & Analytics
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {accessibleCount} of {TILES.length} reports available to your role.
                    </p>
                </div>
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TILES.map((tile) => (
                    <HasPermission
                        key={tile.to}
                        permission={tile.permission}
                        fallback={<LockedTile title={tile.title} />}
                    >
                        <ReportTile {...tile} />
                    </HasPermission>
                ))}
            </div>

            {/* ── Footer ── */}
            <p className="text-xs text-slate-400 text-center">
                Report access is controlled by your assigned role.
                Contact your administrator to request additional access.
            </p>
        </div>
    );
};