import React, { useState, useEffect, useCallback } from 'react';
import {
    Banknote, TrendingUp, Receipt, AlertTriangle,
    Coins, FileBarChart2, Scale,
} from 'lucide-react';
import { dashboardApi, type StaffDashboardDTO } from '../api/dashboard-api';
import { useAuth } from '../../auth/context/AuthProvider';
import { StatCard, QuickLink, DashboardHeader, fmtKES, fmtCount } from '../components/DashboardWidgets';

/**
 * Dashboard for TREASURER, DEPUTY_TREASURER, and ACCOUNTANT.
 * Focus: savings pool, today's collections, outstanding penalties, loan portfolio value.
 */
const TreasurerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [data, setData]       = useState<StaffDashboardDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await dashboardApi.getStaffDashboard());
        } catch {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

    const roleLabel = user?.roles?.includes('ROLE_DEPUTY_TREASURER') ? 'Deputy Treasurer'
        : user?.roles?.includes('ROLE_ACCOUNTANT') ? 'Accountant'
            : 'Treasurer';

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <DashboardHeader
                name={fullName}
                roleLabel={roleLabel}
                onRefresh={load}
                loading={loading}
                icon={Scale}
                iconColor="text-emerald-600"
            />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}

            {/* ── Savings & Collections ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Savings & Collections</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Savings Pool"
                        value={fmtKES(data?.totalSavings)}
                        icon={Banknote}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                        loading={loading}
                        linkTo="/savings"
                        accent="border-t-4 border-t-emerald-500"
                    />
                    <StatCard
                        label="Today's Collections"
                        value={fmtKES(data?.todaysCollections)}
                        icon={TrendingUp}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                        loading={loading}
                        linkTo="/reports/collections"
                    />
                    <StatCard
                        label="Loan Portfolio"
                        value={fmtKES(data?.loanPortfolio)}
                        icon={Coins}
                        iconBg="bg-violet-50"
                        iconColor="text-violet-600"
                        loading={loading}
                    />
                </div>
            </section>

            {/* ── Penalties & Arrears ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Penalties & Arrears</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Open Penalties"
                        value={fmtCount(data?.openPenalties)}
                        icon={AlertTriangle}
                        iconBg="bg-red-50"
                        iconColor="text-red-600"
                        loading={loading}
                        badge={data?.openPenalties}
                        badgeColor="red"
                        accent={data?.openPenalties ? 'border-t-4 border-t-red-500' : ''}
                    />
                    <StatCard
                        label="Outstanding Penalties"
                        value={fmtKES(data?.outstandingPenalties)}
                        icon={Receipt}
                        iconBg="bg-rose-50"
                        iconColor="text-rose-600"
                        loading={loading}
                    />
                    <StatCard
                        label="Loans in Arrears"
                        value={fmtCount(data?.loansInArrears)}
                        icon={AlertTriangle}
                        iconBg="bg-orange-50"
                        iconColor="text-orange-600"
                        loading={loading}
                        badge={data?.loansInArrears}
                        badgeColor="orange"
                        linkTo="/reports/arrears"
                    />
                    <StatCard
                        label="Total Arrears Amount"
                        value={fmtKES(data?.totalArrearsAmount)}
                        icon={Receipt}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-700"
                        loading={loading}
                        linkTo="/reports/arrears"
                    />
                </div>
            </section>

            {/* ── Quick actions ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <QuickLink label="Savings"          to="/savings"                    icon={Banknote}     color="bg-emerald-50"  textColor="text-emerald-700" />
                    <QuickLink label="Trial Balance"    to="/accounting/trial-balance"   icon={Scale}        color="bg-blue-50"     textColor="text-blue-700" />
                    <QuickLink label="Journal Entries"  to="/accounting/journals"        icon={FileBarChart2} color="bg-violet-50"  textColor="text-violet-700" />
                    <QuickLink label="Daily Collections" to="/reports/collections"       icon={TrendingUp}   color="bg-slate-100"   textColor="text-slate-700" />
                </div>
            </section>
        </div>
    );
};

export default TreasurerDashboard;