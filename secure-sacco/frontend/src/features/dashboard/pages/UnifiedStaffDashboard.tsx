import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { dashboardApi, type StaffDashboardDTO } from '../api/dashboard-api';
import {
    Users, Wallet, Coins, PiggyBank, CalendarClock,
    AlertTriangle, TrendingDown, Banknote, ShieldAlert, Receipt,
    ClipboardList, RefreshCw, CheckCircle2, CalendarDays,
    ArrowRight, Scale,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtKES   = (n: number | null | undefined) =>
    `KES ${(n ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCount = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-KE');
const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ w = 'w-24', h = 'h-8' }: { w?: string; h?: string }) => (
    <div className={`animate-pulse bg-slate-100 rounded-lg ${w} ${h}`} />
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
    label: string; value: string; icon: React.ElementType;
    iconBg: string; iconColor: string; loading: boolean;
    badge?: number; badgeColor?: 'red' | 'orange'; linkTo?: string; accent?: string;
}> = ({ label, value, icon: Icon, iconBg, iconColor, loading, badge, badgeColor, linkTo, accent }) => {
    const inner = (
        <div className={`relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5
            flex flex-col gap-3 h-full group hover:shadow-md transition-shadow ${accent ?? ''}`}>
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                {!loading && badge != null && badge > 0 && (
                    <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full
                        ${badgeColor === 'red' ? 'bg-red-500' : 'bg-orange-500'}`}>
                        {badge}
                    </span>
                )}
            </div>
            {loading ? <Sk /> : <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>}
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

// ─── Permission-to-section map ────────────────────────────────────────────────
// Each section only renders if the user has at least ONE of its required permissions.
// This is the single source of truth — nothing is hardcoded to a role.

interface DashboardSection {
    id: string;
    title: string;
    requiredPermissions: string[]; // any one of these is enough
    render: (data: StaffDashboardDTO | null, loading: boolean) => React.ReactNode;
}

const buildSections = (): DashboardSection[] => [
    // ── Members ─────────────────────────────────────────────────────────────
    {
        id: 'members',
        title: 'Membership',
        requiredPermissions: ['MEMBERS_READ', 'MEMBERS_WRITE'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Members"       value={fmtCount(data?.totalMembers)}      icon={Users}        iconBg="bg-blue-50"    iconColor="text-blue-600"   loading={loading} linkTo="/members" />
                <StatCard label="Active Members"      value={fmtCount(data?.activeMembers)}      icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
                <StatCard label="Pending Activation"  value={fmtCount(data?.pendingActivations)} icon={Users}        iconBg="bg-amber-50"   iconColor="text-amber-600"  loading={loading} badge={data?.pendingActivations} badgeColor="orange" linkTo="/members" accent={data?.pendingActivations ? 'border-t-4 border-t-amber-400' : ''} />
                <StatCard label="Upcoming Meetings"   value={fmtCount(data?.upcomingMeetings)}   icon={CalendarClock} iconBg="bg-violet-50" iconColor="text-violet-600" loading={loading} linkTo="/meetings" />
            </div>
        ),
    },

    // ── Loans ────────────────────────────────────────────────────────────────
    {
        id: 'loans',
        title: 'Loans',
        requiredPermissions: ['LOANS_READ'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Active Loans"         value={fmtCount(data?.activeLoans)}          icon={Coins}        iconBg="bg-blue-50"    iconColor="text-blue-600"   loading={loading} linkTo="/loans" />
                <StatCard label="Pending Applications" value={fmtCount(data?.pendingLoanApplications)} icon={ClipboardList} iconBg="bg-amber-50" iconColor="text-amber-600" loading={loading} badge={data?.pendingLoanApplications} badgeColor="orange" linkTo="/loans" accent={data?.pendingLoanApplications ? 'border-t-4 border-t-amber-400' : ''} />
                <StatCard label="Loans in Arrears"     value={fmtCount(data?.loansInArrears)}        icon={TrendingDown}  iconBg="bg-red-50"   iconColor="text-red-600"    loading={loading} badge={data?.loansInArrears} badgeColor="red" linkTo="/reports/arrears" accent={data?.loansInArrears ? 'border-t-4 border-t-red-500' : ''} />
                <StatCard label="Loan Portfolio"       value={fmtKES(data?.loanPortfolio)}            icon={Banknote}      iconBg="bg-green-50"  iconColor="text-green-700"  loading={loading} />
            </div>
        ),
    },

    // ── Savings ──────────────────────────────────────────────────────────────
    {
        id: 'savings',
        title: 'Savings',
        requiredPermissions: ['SAVINGS_READ', 'SAVINGS_MANUAL_POST'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total Savings Pool"  value={fmtKES(data?.totalSavings)}      icon={PiggyBank}  iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} linkTo="/savings" accent="border-t-4 border-t-emerald-500" />
                <StatCard label="Today's Collections" value={fmtKES(data?.todaysCollections)}  icon={Banknote}   iconBg="bg-blue-50"    iconColor="text-blue-600"   loading={loading} linkTo="/reports/collections" />
                <StatCard label="Active Members"      value={fmtCount(data?.activeMembers)}    icon={Users}      iconBg="bg-slate-50"   iconColor="text-slate-600"  loading={loading} />
            </div>
        ),
    },

    // ── Reports ──────────────────────────────────────────────────────────────
    {
        id: 'reports',
        title: 'Reports & Finance',
        requiredPermissions: ['REPORTS_READ', 'GL_TRIAL_BALANCE'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Arrears Amount" value={fmtKES(data?.totalArrearsAmount)}   icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-600" loading={loading} linkTo="/reports/arrears" />
                <StatCard label="Today's Collections"  value={fmtKES(data?.todaysCollections)}    icon={Banknote}      iconBg="bg-blue-50"   iconColor="text-blue-600"   loading={loading} linkTo="/reports/collections" />
                <StatCard label="Total Savings"        value={fmtKES(data?.totalSavings)}          icon={Scale}         iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
                <StatCard label="Loan Portfolio"       value={fmtKES(data?.loanPortfolio)}          icon={Coins}         iconBg="bg-violet-50" iconColor="text-violet-600" loading={loading} />
            </div>
        ),
    },

    // ── Penalties ────────────────────────────────────────────────────────────
    {
        id: 'penalties',
        title: 'Penalties',
        requiredPermissions: ['PENALTIES_WAIVE_ADJUST', 'PENALTIES_MANAGE_RULES'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Open Penalties"        value={fmtCount(data?.openPenalties)}        icon={AlertTriangle} iconBg="bg-red-50"    iconColor="text-red-600"    loading={loading} badge={data?.openPenalties} badgeColor="red" linkTo="/staff/penalties" accent={data?.openPenalties ? 'border-t-4 border-t-red-500' : ''} />
                <StatCard label="Outstanding Penalties" value={fmtKES(data?.outstandingPenalties)}    icon={Receipt}       iconBg="bg-rose-50"   iconColor="text-rose-600"   loading={loading} linkTo="/staff/penalties" />
                <StatCard label="Loans in Arrears"      value={fmtCount(data?.loansInArrears)}        icon={TrendingDown}  iconBg="bg-orange-50" iconColor="text-orange-600" loading={loading} badge={data?.loansInArrears} badgeColor="orange" />
            </div>
        ),
    },

    // ── Meetings ─────────────────────────────────────────────────────────────
    {
        id: 'meetings',
        title: 'Meetings',
        requiredPermissions: ['MEETINGS_READ', 'MEETINGS_MANAGE'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Upcoming Meetings"    value={fmtCount(data?.upcomingMeetings)}    icon={CalendarClock} iconBg="bg-violet-50" iconColor="text-violet-600" loading={loading} badge={data?.upcomingMeetings} badgeColor="orange" linkTo="/meetings" accent="border-t-4 border-t-violet-500" />
                <StatCard label="Meetings This Month"  value={fmtCount(data?.meetingsThisMonth)}   icon={CalendarDays}  iconBg="bg-blue-50"   iconColor="text-blue-600"   loading={loading} linkTo="/meetings" />
                <StatCard label="Active Members"       value={fmtCount(data?.activeMembers)}        icon={CheckCircle2}  iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
            </div>
        ),
    },

    // ── Overview / Admin catch-all ───────────────────────────────────────────
    {
        id: 'overview',
        title: 'SACCO Overview',
        // Shows for SYSTEM_ADMIN or anyone with broad access
        requiredPermissions: ['ROLE_SYSTEM_ADMIN'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Members"         value={fmtCount(data?.totalMembers)}         icon={Users}         iconBg="bg-sky-50"     iconColor="text-sky-600"     loading={loading} linkTo="/members" />
                <StatCard label="Total Savings"         value={fmtKES(data?.totalSavings)}            icon={Wallet}        iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} linkTo="/savings" />
                <StatCard label="Loan Portfolio"        value={fmtKES(data?.loanPortfolio)}            icon={Coins}         iconBg="bg-violet-50"  iconColor="text-violet-600"  loading={loading} linkTo="/loans" />
                <StatCard label="Outstanding Penalties" value={fmtKES(data?.outstandingPenalties)}     icon={AlertTriangle} iconBg="bg-rose-50"    iconColor="text-rose-500"    loading={loading} accent="border-t-2 border-t-rose-300" />
            </div>
        ),
    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const UnifiedStaffDashboard: React.FC = () => {
    const { user } = useAuth();

    const [data,        setData]        = useState<StaffDashboardDTO | null>(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

    const fetchDashboard = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            setData(await dashboardApi.getStaffDashboard());
            setRefreshedAt(new Date());
        } catch { setError('Failed to load dashboard data.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const iv = setInterval(fetchDashboard, 5 * 60 * 1000);
        return () => clearInterval(iv);
    }, [fetchDashboard]);

    const permissions: string[] = user?.permissions ?? [];
    const isAdmin = user?.roles?.includes('ROLE_SYSTEM_ADMIN') ?? false;

    // Filter sections: show a section if the user has SYSTEM_ADMIN OR any of its required permissions
    const sections = buildSections().filter(s =>
        isAdmin || s.requiredPermissions.some(p => permissions.includes(p))
    );

    const roleName = user?.roles?.[0]?.replace('ROLE_', '').replace(/_/g, ' ') ?? 'Staff';

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                        {greeting()}, {user?.firstName}
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {roleName} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button onClick={fetchDashboard} disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Refreshing…' : refreshedAt ? refreshedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={fetchDashboard} className="text-xs font-bold underline">Retry</button>
                </div>
            )}

            {/* No permissions at all */}
            {!loading && sections.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-slate-400">
                    <ShieldAlert className="w-12 h-12 text-slate-300" />
                    <p className="text-base font-semibold text-slate-500">No dashboard sections available</p>
                    <p className="text-sm text-center max-w-sm">
                        Your account doesn't have any permissions that display dashboard data.
                        Contact your System Administrator to grant appropriate permissions.
                    </p>
                </div>
            )}

            {/* Loading skeleton when we have no data yet */}
            {loading && sections.length === 0 && (
                <div className="space-y-8">
                    {[1, 2].map(i => (
                        <div key={i}>
                            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mb-4" />
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1,2,3,4].map(j => <div key={j} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Dynamic sections — each only shows if permission allows */}
            {sections.map(section => (
                <section key={section.id}>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                        {section.title}
                    </h2>
                    {section.render(data, loading)}
                </section>
            ))}
        </div>
    );
};

export default UnifiedStaffDashboard;