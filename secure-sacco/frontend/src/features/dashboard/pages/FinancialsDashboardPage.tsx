import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    PiggyBank, Coins, AlertCircle, Package, Loader2,
    TrendingUp, ArrowRight, Wallet,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard-api';
import type { StaffDashboardDTO } from '../api/dashboard-api';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const SummaryCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    gradient: string;
    to: string;
}> = ({ icon, label, value, sub, gradient, to }) => (
    <Link
        to={to}
        className="block p-5 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow"
    >
        <div className="flex items-start justify-between">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white`}>
                {icon}
            </div>
            <ArrowRight size={16} className="text-slate-300" />
        </div>
        <p className="text-xs text-slate-500 mt-3">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </Link>
);

/**
 * SAC-265: the master financial overview — Savings, Loans, Penalties, and
 * every custom payment product side by side. Custom products appear here
 * automatically the moment they're created in Settings, with zero extra code.
 */
export const FinancialsDashboardPage: React.FC = () => {
    const [data, setData]       = useState<StaffDashboardDTO | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardApi.getStaffDashboard()
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" /> Loading financial overview…
            </div>
        );
    }

    if (!data) {
        return <div className="text-center py-24 text-slate-400">Could not load the financial overview.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-slate-800 text-white">
                    <Wallet size={22} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Financials</h1>
                    <p className="text-sm text-slate-500">
                        Every fund the SACCO holds — savings, loans, penalties, and contributions — in one place.
                    </p>
                </div>
            </div>

            {/* ── Built-in modules ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <SummaryCard
                    icon={<PiggyBank size={20} />}
                    label="Member Savings"
                    value={`KES ${fmt(data.totalSavings)}`}
                    sub="Total balance across all members"
                    gradient="from-emerald-500 to-emerald-600"
                    to="/savings"
                />
                <SummaryCard
                    icon={<Coins size={20} />}
                    label="Loan Portfolio"
                    value={`KES ${fmt(data.loanPortfolio)}`}
                    sub={`${data.activeLoans} active · ${data.loansInArrears} in arrears`}
                    gradient="from-blue-500 to-blue-600"
                    to="/loans"
                />
                <SummaryCard
                    icon={<AlertCircle size={20} />}
                    label="Outstanding Penalties"
                    value={`KES ${fmt(data.outstandingPenalties)}`}
                    sub={`${data.openPenalties} open`}
                    gradient="from-red-500 to-red-600"
                    to="/staff/penalties"
                />
            </div>

            {/* ── Custom payment products — automatic ── */}
            <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-purple-600" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Contribution Funds</h2>
            </div>

            {data.customProductSummaries.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 text-center text-sm text-slate-400">
                    No custom contribution products yet.{' '}
                    <Link to="/settings" className="text-emerald-600 font-medium hover:underline">
                        Create one in Settings →
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {data.customProductSummaries.map(p => {
                        const progressPct = p.requiredAmount && p.requiredAmount > 0
                            ? Math.min(100, (p.totalReceived / p.requiredAmount) * 100)
                            : null;
                        return (
                            <Link
                                key={p.productId}
                                to="/settings"
                                className="block p-5 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">{p.glAccountCode}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-3">{p.name}</p>
                                <p className="text-2xl font-bold text-slate-800 mt-0.5">KES {fmt(p.totalReceived)}</p>
                                <p className="text-xs text-slate-400 mt-1">{p.transactionCount} transaction{p.transactionCount === 1 ? '' : 's'}</p>

                                {progressPct !== null && (
                                    <div className="mt-3">
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progressPct}%` }} />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Target: KES {fmt(p.requiredAmount as number)} per member
                                        </p>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FinancialsDashboardPage;