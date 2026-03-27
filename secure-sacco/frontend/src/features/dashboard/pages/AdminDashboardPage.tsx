import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { dashboardApi, type StaffDashboardDTO } from '../api/dashboard-api';
import {
    Users, Wallet, LayoutDashboard, AlertTriangle,
    ClipboardList, TrendingDown, Banknote,
    CalendarClock, ShieldAlert, RefreshCw,
    UserPlus, FileBarChart2, Receipt,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtKES = (n: number | undefined | null) =>
    `KES ${(n ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtCount = (n: number | undefined | null) => (n ?? 0).toLocaleString('en-KE');

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
    label:       string;
    value:       string;
    icon:        React.ElementType;
    iconBg:      string;
    iconColor:   string;
    loading:     boolean;
    badge?:      number;
    badgeColor?: 'red' | 'orange';
    linkTo?:     string;
    accent?:     string; // border-top colour class
}

const StatCard: React.FC<StatCardProps> = ({
                                               label, value, icon: Icon, iconBg, iconColor,
                                               loading, badge, badgeColor, linkTo, accent,
                                           }) => {
    const inner = (
        <div
            className={`
                relative bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5
                flex flex-col gap-3 h-full group hover:shadow-md transition-shadow
                ${accent ?? ''}
            `}
        >
            {/* Icon + Badge row */}
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>

                {/* Alert badge — only shown when badge > 0 */}
                {!loading && badge != null && badge > 0 && (
                    <span
                        className={`
                            text-[10px] font-bold px-2.5 py-0.5 rounded-full
                            ${badgeColor === 'red'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'}
                        `}
                    >
                        {badge}
                    </span>
                )}
            </div>

            {/* Value / Skeleton */}
            {loading ? (
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            ) : (
                <div className="flex-1">
                    <p className="text-lg sm:text-2xl font-bold text-slate-800 leading-none tracking-tight">{value}</p>
                </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        </div>
    );

    return linkTo ? <Link to={linkTo} className="block h-full">{inner}</Link> : <div className="h-full">{inner}</div>;
};

// ─── Quick Action Button ──────────────────────────────────────────────────────
const QuickAction: React.FC<{
    label: string;
    icon:  React.ElementType;
    to?:   string;
    onClick?: () => void;
}> = ({ label, icon: Icon, to, onClick }) => {
    const cls = `
                inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5
        bg-white border border-slate-200 rounded-xl shadow-sm
                text-xs sm:text-sm font-semibold text-slate-700
        hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700
        transition-colors
    `;
    if (to) return (
        <Link to={to} className={cls}>
            <Icon className="w-4 h-4" />
            {label}
        </Link>
    );
    return (
        <button className={cls} onClick={onClick}>
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();

    // Roles that are allowed to see this dashboard (mirrors REPORTS_READ permission)
    const hasAccess =
        (user?.permissions?.includes('REPORTS_READ') ?? false) ||
        (user?.roles?.some(r => ['ROLE_ADMIN', 'ROLE_STAFF', 'ROLE_MANAGER'].includes(r)) ?? false);

    const [data,        setData]        = useState<StaffDashboardDTO | null>(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await dashboardApi.getStaffDashboard();
            setData(result);
            setRefreshedAt(new Date());
        } catch {
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load + auto-refresh every 5 minutes
    useEffect(() => {
        if (!hasAccess) return;
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchDashboard, hasAccess]);

    // ── Access guard ──────────────────────────────────────────────────────────
    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
                <ShieldAlert className="w-12 h-12 text-slate-300" />
                <p className="text-base font-semibold text-slate-500">Access Restricted</p>
                <p className="text-sm">You don't have permission to view this dashboard.</p>
            </div>
        );
    }

    const roleName = user?.roles?.[0]?.replace('ROLE_', '').replace(/_/g, ' ') ?? 'Admin';

    return (
        <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-12">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                        {greeting()}, {user?.firstName}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        {roleName}&nbsp;·&nbsp;
                        {new Date().toLocaleDateString('en-KE', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                    </p>
                </div>

                <button
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    {loading
                        ? 'Refreshing…'
                        : refreshedAt
                            ? refreshedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                            : 'Refresh'}
                </button>
            </div>

            {/* ── Error banner ──────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button
                        onClick={fetchDashboard}
                        className="text-xs font-bold underline hover:no-underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── Row 1: 4 core financial stat cards ───────────────────── */}
            <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                    SACCO Health at a Glance
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Members"
                        value={data ? fmtCount(data.totalMembers) : '—'}
                        icon={Users}
                        iconBg="bg-sky-50"
                        iconColor="text-sky-600"
                        loading={loading}
                        linkTo="/members"
                    />
                    <StatCard
                        label="Total Savings"
                        value={data ? fmtKES(data.totalSavings) : '—'}
                        icon={Wallet}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                        loading={loading}
                        linkTo="/savings"
                    />
                    <StatCard
                        label="Loan Portfolio"
                        value={data ? fmtKES(data.loanPortfolio) : '—'}
                        icon={LayoutDashboard}
                        iconBg="bg-violet-50"
                        iconColor="text-violet-600"
                        loading={loading}
                        linkTo="/loans"
                    />
                    <StatCard
                        label="Outstanding Penalties"
                        value={data ? fmtKES(data.outstandingPenalties) : '—'}
                        icon={AlertTriangle}
                        iconBg="bg-rose-50"
                        iconColor="text-rose-500"
                        loading={loading}
                        accent="border-t-2 border-t-rose-300"
                    />
                </div>
            </section>

            {/* ── Row 2: 3 operational alert cards ─────────────────────── */}
            <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Operational Status
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        label="Pending Loan Applications"
                        value={data ? fmtCount(data.pendingLoanApplications) : '—'}
                        icon={ClipboardList}
                        iconBg="bg-orange-50"
                        iconColor="text-orange-500"
                        loading={loading}
                        badge={data?.pendingLoanApplications}
                        badgeColor="orange"
                        linkTo="/loans"
                        accent={
                            !loading && (data?.pendingLoanApplications ?? 0) > 0
                                ? 'border-t-2 border-t-orange-400'
                                : ''
                        }
                    />
                    <StatCard
                        label="Loans in Arrears"
                        value={data ? fmtCount(data.loansInArrears) : '—'}
                        icon={TrendingDown}
                        iconBg="bg-red-50"
                        iconColor="text-red-500"
                        loading={loading}
                        badge={data?.loansInArrears}
                        badgeColor="red"
                        linkTo="/reports/arrears"
                        accent={
                            !loading && (data?.loansInArrears ?? 0) > 0
                                ? 'border-t-2 border-t-red-400'
                                : ''
                        }
                    />
                    <StatCard
                        label="Today's Collections"
                        value={data ? fmtKES(data.todaysCollections) : '—'}
                        icon={Banknote}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                        loading={loading}
                        linkTo="/reports/collections"
                    />
                </div>
            </section>

            {/* ── Row 3: 2 secondary metric cards ──────────────────────── */}
            <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Upcoming & Compliance
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard
                        label="Upcoming Meetings"
                        value={data ? fmtCount(data.upcomingMeetings) : '—'}
                        icon={CalendarClock}
                        iconBg="bg-indigo-50"
                        iconColor="text-indigo-600"
                        loading={loading}
                        linkTo="/meetings"
                    />
                    <StatCard
                        label="Open Penalties"
                        value={data ? fmtCount(data.openPenalties) : '—'}
                        icon={ShieldAlert}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                        loading={loading}
                        accent={
                            !loading && (data?.openPenalties ?? 0) > 0
                                ? 'border-t-2 border-t-amber-400'
                                : ''
                        }
                    />
                </div>
            </section>

            {/* ── Quick Action row ──────────────────────────────────────── */}
            <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Quick Actions
                </p>
                <div className="flex flex-wrap gap-3">
                    <QuickAction label="New Member"            icon={UserPlus}      to="/members?action=new" />
                    <QuickAction label="View Arrears Report"   icon={FileBarChart2} to="/reports/arrears" />
                    <QuickAction label="View Daily Collections" icon={Receipt}      to="/reports/collections" />
                </div>
            </section>
        </div>
    );
};

export default AdminDashboardPage;