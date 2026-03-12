import React, { useState, useEffect, useCallback } from 'react';
import {
    Coins, TrendingDown, ClipboardList, AlertTriangle,
    CheckCircle2, Banknote,
} from 'lucide-react';
import { dashboardApi, type StaffDashboardDTO } from '../api/dashboard-api';
import { useAuth } from '../../auth/context/AuthProvider';
import { StatCard, QuickLink, DashboardHeader, fmtKES, fmtCount } from '../components/DashboardWidgets';

/**
 * Dashboard for LOAN_OFFICER and DEPUTY_LOAN_OFFICER.
 * Focus: pending applications, active loans, arrears, portfolio size.
 */
const LoanOfficerDashboard: React.FC = () => {
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
    const isDeputy = user?.roles?.includes('ROLE_DEPUTY_LOAN_OFFICER');

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <DashboardHeader
                name={fullName}
                roleLabel={isDeputy ? 'Deputy Loan Officer' : 'Loan Officer'}
                onRefresh={load}
                loading={loading}
                icon={Coins}
                iconColor="text-blue-600"
            />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}

            {/* ── Loan Pipeline ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Loan Pipeline</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Pending Applications"
                        value={fmtCount(data?.pendingLoanApplications)}
                        icon={ClipboardList}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                        loading={loading}
                        badge={data?.pendingLoanApplications}
                        badgeColor="orange"
                        linkTo="/loans"
                        accent={data?.pendingLoanApplications ? 'border-t-4 border-t-amber-400' : ''}
                    />
                    <StatCard
                        label="Active Loans"
                        value={fmtCount(data?.activeLoans)}
                        icon={CheckCircle2}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                        loading={loading}
                        linkTo="/loans"
                    />
                    <StatCard
                        label="Loans in Arrears"
                        value={fmtCount(data?.loansInArrears)}
                        icon={TrendingDown}
                        iconBg="bg-red-50"
                        iconColor="text-red-600"
                        loading={loading}
                        badge={data?.loansInArrears}
                        badgeColor="red"
                        linkTo="/reports/arrears"
                        accent={data?.loansInArrears ? 'border-t-4 border-t-red-500' : ''}
                    />
                    <StatCard
                        label="Total Arrears"
                        value={fmtKES(data?.totalArrearsAmount)}
                        icon={AlertTriangle}
                        iconBg="bg-orange-50"
                        iconColor="text-orange-600"
                        loading={loading}
                        linkTo="/reports/arrears"
                    />
                </div>
            </section>

            {/* ── Portfolio ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Portfolio</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        label="Loan Portfolio Value"
                        value={fmtKES(data?.loanPortfolio)}
                        icon={Banknote}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                        loading={loading}
                    />
                    <StatCard
                        label="Today's Collections"
                        value={fmtKES(data?.todaysCollections)}
                        icon={Coins}
                        iconBg="bg-violet-50"
                        iconColor="text-violet-600"
                        loading={loading}
                        linkTo="/reports/collections"
                    />
                    <StatCard
                        label="Open Penalties"
                        value={fmtCount(data?.openPenalties)}
                        icon={AlertTriangle}
                        iconBg="bg-rose-50"
                        iconColor="text-rose-600"
                        loading={loading}
                        badge={data?.openPenalties}
                        badgeColor="red"
                    />
                </div>
            </section>

            {/* ── Quick actions ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <QuickLink label="Loan Applications" to="/loans"             icon={ClipboardList} color="bg-amber-50"   textColor="text-amber-700" />
                    <QuickLink label="Arrears Report"    to="/reports/arrears"   icon={TrendingDown}  color="bg-red-50"    textColor="text-red-700" />
                    <QuickLink label="Members"           to="/members"           icon={CheckCircle2}  color="bg-blue-50"   textColor="text-blue-700" />
                    <QuickLink label="Collections"       to="/reports/collections" icon={Coins}       color="bg-violet-50" textColor="text-violet-700" />
                </div>
            </section>
        </div>
    );
};

export default LoanOfficerDashboard;