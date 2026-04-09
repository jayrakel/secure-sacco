import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, CalendarClock, Coins, AlertTriangle,
    Banknote, TrendingDown, UserPlus, ShieldAlert, BarChart3,
} from 'lucide-react';
import { dashboardApi, type StaffDashboardDTO } from '../api/dashboard-api';
import { useAuth } from '../../auth/context/AuthProvider';
import { StatCard, QuickLink, DashboardHeader, fmtKES, fmtCount } from '../components/DashboardWidgets';

/**
 * Dashboard for CHAIRPERSON and DEPUTY_CHAIRPERSON.
 * Shows high-level governance metrics: membership, meetings, loan portfolio
 * health, and financial penalties.
 */
const ChairpersonDashboard: React.FC = () => {
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
    const isDeputy = user?.roles?.includes('ROLE_DEPUTY_CHAIRPERSON');

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <DashboardHeader
                name={fullName}
                roleLabel={isDeputy ? 'Deputy Chairperson' : 'Chairperson'}
                onRefresh={load}
                loading={loading}
                icon={ShieldAlert}
                iconColor="text-indigo-600"
            />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}

            {/* ── Membership ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Membership</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Members"   value={fmtCount(data?.totalMembers)}       icon={Users}       iconBg="bg-blue-50"   iconColor="text-blue-600"   loading={loading} linkTo="/members" />
                    <StatCard label="Active Members"  value={fmtCount(data?.activeMembers)}       icon={Users}       iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
                    <StatCard label="Pending Activation" value={fmtCount(data?.pendingActivations)} icon={UserPlus}  iconBg="bg-amber-50"  iconColor="text-amber-600"  loading={loading} badge={data?.pendingActivations} badgeColor="orange" linkTo="/members" />
                    <StatCard label="Upcoming Meetings" value={fmtCount(data?.upcomingMeetings)}  icon={CalendarClock} iconBg="bg-violet-50" iconColor="text-violet-600" loading={loading} linkTo="/meetings" />
                </div>
            </section>

            {/* ── Loan Portfolio Health ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Loan Portfolio</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Loan Portfolio"  value={fmtKES(data?.loanPortfolio)}         icon={Banknote}     iconBg="bg-green-50"  iconColor="text-green-700"  loading={loading} />
                    <StatCard label="Active Loans"    value={fmtCount(data?.activeLoans)}          icon={Coins}        iconBg="bg-blue-50"   iconColor="text-blue-600"   loading={loading} linkTo="/loans" />
                    <StatCard label="Loans in Arrears" value={fmtCount(data?.loansInArrears)}      icon={TrendingDown} iconBg="bg-red-50"    iconColor="text-red-600"    loading={loading} badge={data?.loansInArrears} badgeColor="red" linkTo="/reports/arrears" />
                    <StatCard label="Total Arrears"   value={fmtKES(data?.totalArrearsAmount)}     icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-600" loading={loading} linkTo="/reports/arrears" />
                </div>
            </section>

            {/* ── Financial Health ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Financial Health</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard label="Total Savings Pool" value={fmtKES(data?.totalSavings)}       icon={Banknote}     iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
                    <StatCard label="Open Penalties"     value={fmtCount(data?.openPenalties)}     icon={AlertTriangle} iconBg="bg-red-50"   iconColor="text-red-600"    loading={loading} badge={data?.openPenalties} badgeColor="red" />
                    <StatCard label="Outstanding Penalties" value={fmtKES(data?.outstandingPenalties)} icon={ShieldAlert} iconBg="bg-rose-50" iconColor="text-rose-600"  loading={loading} />
                </div>
            </section>

            {/* ── Quick actions ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <QuickLink label="Members"           to="/members"          icon={Users}         color="bg-blue-50"    textColor="text-blue-700" />
                    <QuickLink label="Meetings"          to="/meetings"         icon={CalendarClock}  color="bg-violet-50"  textColor="text-violet-700" />
                    <QuickLink label="Loan Applications" to="/loans"            icon={Coins}         color="bg-amber-50"   textColor="text-amber-700" />
                    <QuickLink label="Reports"           to="/reports"          icon={BarChart3}     color="bg-slate-100"  textColor="text-slate-700" />
                </div>
            </section>
        </div>
    );
};

export default ChairpersonDashboard;