import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { dashboardApi, type StaffDashboardDTO } from '../api/dashboard-api';
import { CoopAccountBalanceCard } from '../components/CoopAccountBalanceCard';
import {
    Users, Wallet, Coins, PiggyBank, CalendarClock,
    AlertTriangle, TrendingDown, Banknote, ShieldAlert, Receipt,
    ClipboardList, RefreshCw, CheckCircle2, CalendarDays,
    ArrowUpRight, Scale, Package, BarChart3, TrendingUp,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtKES = (n: number | null | undefined) =>
    `KES ${(n ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCount = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-KE');
const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
const Sk = ({ w = 'w-24', h = 'h-8' }: { w?: string; h?: string }) => (
    <div className={`animate-pulse bg-slate-100 rounded-lg ${w} ${h}`} />
);

// ── Static colour token map ────────────────────────────────────────────────────
// ALL Tailwind class strings must be complete literals so JIT can detect them.
type CardColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'red' | 'rose' | 'orange' | 'green' | 'slate' | 'sky';

const COLORS: Record<CardColor, {
    card: string;       // full-card gradient (highlight mode)
    iconBg: string;     // icon container bg (normal mode)
    iconText: string;   // icon colour (normal mode)
}> = {
    blue:    { card: 'bg-gradient-to-br from-blue-500 to-blue-600',    iconBg: 'bg-blue-100',    iconText: 'text-blue-600' },
    emerald: { card: 'bg-gradient-to-br from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
    violet:  { card: 'bg-gradient-to-br from-violet-500 to-violet-600', iconBg: 'bg-violet-100',  iconText: 'text-violet-600' },
    amber:   { card: 'bg-gradient-to-br from-amber-400 to-amber-500',  iconBg: 'bg-amber-100',   iconText: 'text-amber-600' },
    red:     { card: 'bg-gradient-to-br from-red-500 to-red-600',      iconBg: 'bg-red-100',     iconText: 'text-red-600' },
    rose:    { card: 'bg-gradient-to-br from-rose-500 to-rose-600',    iconBg: 'bg-rose-100',    iconText: 'text-rose-600' },
    orange:  { card: 'bg-gradient-to-br from-orange-400 to-orange-500', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
    green:   { card: 'bg-gradient-to-br from-green-500 to-green-600',  iconBg: 'bg-green-100',   iconText: 'text-green-700' },
    slate:   { card: 'bg-gradient-to-br from-slate-500 to-slate-600',  iconBg: 'bg-slate-100',   iconText: 'text-slate-600' },
    sky:     { card: 'bg-gradient-to-br from-sky-500 to-sky-600',      iconBg: 'bg-sky-100',     iconText: 'text-sky-600' },
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
    label: string; value: string; sub?: string;
    icon: React.ElementType; color: CardColor; loading: boolean;
    badge?: number; badgeColor?: 'red' | 'orange' | 'amber';
    linkTo?: string; highlight?: boolean;
}> = ({ label, value, sub, icon: Icon, color, loading, badge, badgeColor, linkTo, highlight }) => {
    const c = COLORS[color];
    const inner = (
        <div className={`relative rounded-2xl p-5 flex flex-col gap-2.5 h-full group overflow-hidden
            transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
            ${highlight ? `${c.card} shadow-md` : 'bg-white border border-slate-100 shadow-sm hover:border-slate-200'}`}>

            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${highlight ? 'bg-white/20' : c.iconBg}`}>
                    <Icon className={`w-5 h-5 ${highlight ? 'text-white' : c.iconText}`} />
                </div>
                {!loading && badge != null && badge > 0 && (
                    <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full
                        ${badgeColor === 'red' ? 'bg-red-500' : badgeColor === 'amber' ? 'bg-amber-500' : 'bg-orange-500'}`}>
                        {badge}
                    </span>
                )}
            </div>

            {loading
                ? <Sk h="h-8" w="w-28" />
                : <p className={`text-2xl font-bold leading-none truncate ${highlight ? 'text-white' : 'text-slate-900'}`}>
                    {value}
                  </p>}

            <div>
                <p className={`text-sm font-medium leading-none ${highlight ? 'text-white/75' : 'text-slate-500'}`}>{label}</p>
                {sub && !loading && <p className={`text-xs mt-0.5 ${highlight ? 'text-white/55' : 'text-slate-400'}`}>{sub}</p>}
            </div>

            {linkTo && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className={`w-4 h-4 ${highlight ? 'text-white/60' : 'text-slate-400'}`} />
                </div>
            )}
        </div>
    );
    return linkTo ? <Link to={linkTo} className="block h-full">{inner}</Link> : inner;
};

// ── Section wrapper ────────────────────────────────────────────────────────────
const Section: React.FC<{
    title: string; icon: React.ElementType;
    linkTo?: string; linkLabel?: string; children: React.ReactNode;
}> = ({ title, icon: Icon, linkTo, linkLabel, children }) => (
    <section>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h2>
            </div>
            {linkTo && (
                <Link to={linkTo}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                    {linkLabel ?? 'View all'} <ArrowUpRight size={11} />
                </Link>
            )}
        </div>
        {children}
    </section>
);

// ── Permission-to-section map ──────────────────────────────────────────────────
interface DashboardSection {
    id: string; title: string; icon: React.ElementType;
    requiredPermissions: string[];
    linkTo?: string; linkLabel?: string;
    render: (data: StaffDashboardDTO | null, loading: boolean) => React.ReactNode;
}

const buildSections = (): DashboardSection[] => [
    // ── SACCO Overview (SYSTEM_ADMIN only) ─────────────────────────────────────
    {
        id: 'overview', title: 'SACCO Overview', icon: BarChart3,
        requiredPermissions: ['ROLE_SYSTEM_ADMIN'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Members"         value={fmtCount(data?.totalMembers)}        icon={Users}         color="blue"    loading={loading} linkTo="/members"        highlight />
                <StatCard label="Total Savings"         value={fmtKES(data?.totalSavings)}           icon={Wallet}        color="emerald" loading={loading} linkTo="/savings"        highlight />
                <StatCard label="Loan Portfolio"        value={fmtKES(data?.loanPortfolio)}           icon={Coins}         color="violet"  loading={loading} linkTo="/loans"          highlight />
                <StatCard label="Outstanding Penalties" value={fmtKES(data?.outstandingPenalties)}    icon={AlertTriangle} color="rose"    loading={loading} badge={data?.openPenalties} badgeColor="red" highlight />
            </div>
        ),
    },

    // ── Membership ─────────────────────────────────────────────────────────────
    {
        id: 'members', title: 'Membership', icon: Users,
        requiredPermissions: ['MEMBERS_READ', 'MEMBERS_WRITE'],
        linkTo: '/members',
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Members"      value={fmtCount(data?.totalMembers)}      icon={Users}         color="blue"   loading={loading} linkTo="/members" />
                <StatCard label="Active Members"     value={fmtCount(data?.activeMembers)}     icon={CheckCircle2}  color="emerald" loading={loading} sub="Fully registered" />
                <StatCard label="Pending Activation" value={fmtCount(data?.pendingActivations)} icon={ClipboardList} color="amber"  loading={loading}
                    sub="Awaiting registration fee"
                    badge={data?.pendingActivations} badgeColor="amber" linkTo="/members"
                    highlight={!!data?.pendingActivations} />
                <StatCard label="Upcoming Meetings"  value={fmtCount(data?.upcomingMeetings)}  icon={CalendarClock} color="violet" loading={loading} linkTo="/meetings" />
            </div>
        ),
    },

    // ── Loans ──────────────────────────────────────────────────────────────────
    {
        id: 'loans', title: 'Loans', icon: Coins,
        requiredPermissions: ['LOANS_READ'],
        linkTo: '/loans',
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Active Loans"         value={fmtCount(data?.activeLoans)}             icon={Coins}        color="blue"   loading={loading} linkTo="/loans" />
                <StatCard label="Pending Applications" value={fmtCount(data?.pendingLoanApplications)}  icon={ClipboardList} color="amber"  loading={loading}
                    sub="Awaiting review"
                    badge={data?.pendingLoanApplications} badgeColor="amber" linkTo="/loans"
                    highlight={!!data?.pendingLoanApplications} />
                <StatCard label="Loans in Arrears"     value={fmtCount(data?.loansInArrears)}           icon={TrendingDown}  color="red"    loading={loading}
                    sub="Past due date"
                    badge={data?.loansInArrears} badgeColor="red"
                    highlight={!!data?.loansInArrears} />
                <StatCard label="Loan Portfolio"       value={fmtKES(data?.loanPortfolio)}               icon={Banknote}      color="green"  loading={loading} />
            </div>
        ),
    },

    // ── Savings ────────────────────────────────────────────────────────────────
    {
        id: 'savings', title: 'Savings', icon: PiggyBank,
        requiredPermissions: ['SAVINGS_READ', 'SAVINGS_MANUAL_POST'],
        linkTo: '/savings',
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total Savings Pool"  value={fmtKES(data?.totalSavings)}     icon={PiggyBank} color="emerald" loading={loading} linkTo="/savings" highlight />
                <StatCard label="Today's Collections" value={fmtKES(data?.todaysCollections)} icon={Banknote}  color="blue"   loading={loading} />
                <StatCard label="Active Members"      value={fmtCount(data?.activeMembers)}   icon={Users}     color="slate"  loading={loading} />
            </div>
        ),
    },

    // ── Penalties ──────────────────────────────────────────────────────────────
    {
        id: 'penalties', title: 'Penalties', icon: Receipt,
        requiredPermissions: ['PENALTIES_WAIVE_ADJUST', 'PENALTIES_MANAGE_RULES'],
        linkTo: '/staff/penalties',
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Open Penalties"      value={fmtCount(data?.openPenalties)}      icon={AlertTriangle} color="red"    loading={loading}
                    sub="Requires attention"
                    badge={data?.openPenalties} badgeColor="red" linkTo="/staff/penalties"
                    highlight={!!data?.openPenalties} />
                <StatCard label="Outstanding Amount"  value={fmtKES(data?.outstandingPenalties)}  icon={Receipt}       color="rose"   loading={loading} linkTo="/staff/penalties" />
                <StatCard label="Loans in Arrears"    value={fmtCount(data?.loansInArrears)}      icon={TrendingDown}  color="orange" loading={loading}
                    badge={data?.loansInArrears} badgeColor="orange" />
            </div>
        ),
    },

    // ── Meetings ───────────────────────────────────────────────────────────────
    {
        id: 'meetings', title: 'Meetings', icon: CalendarDays,
        requiredPermissions: ['MEETINGS_READ', 'MEETINGS_MANAGE'],
        linkTo: '/meetings',
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Upcoming Meetings"   value={fmtCount(data?.upcomingMeetings)}  icon={CalendarClock} color="violet" loading={loading}
                    badge={data?.upcomingMeetings} badgeColor="amber" linkTo="/meetings" highlight />
                <StatCard label="Meetings This Month" value={fmtCount(data?.meetingsThisMonth)} icon={CalendarDays}  color="blue"   loading={loading} linkTo="/meetings" />
                <StatCard label="Active Members"      value={fmtCount(data?.activeMembers)}      icon={CheckCircle2}  color="emerald" loading={loading} />
            </div>
        ),
    },

    // ── Reports & Finance ──────────────────────────────────────────────────────
    {
        id: 'reports', title: 'Reports & Finance', icon: TrendingUp,
        requiredPermissions: ['REPORTS_READ', 'GL_TRIAL_BALANCE'],
        render: (data, loading) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Arrears Amount" value={fmtKES(data?.totalArrearsAmount)}  icon={AlertTriangle} color="orange"  loading={loading} />
                <StatCard label="Today's Collections"  value={fmtKES(data?.todaysCollections)}   icon={Banknote}      color="blue"    loading={loading} />
                <StatCard label="Total Savings"        value={fmtKES(data?.totalSavings)}          icon={Scale}         color="emerald" loading={loading} />
                <StatCard label="Loan Portfolio"       value={fmtKES(data?.loanPortfolio)}          icon={Coins}         color="violet"  loading={loading} />
            </div>
        ),
    },
];

// ── Quick links ────────────────────────────────────────────────────────────────
const QUICK_LINKS = [
    { to: '/members',         icon: Users,        label: 'Members',   color: 'text-blue-600    bg-blue-50    hover:bg-blue-100'    },
    { to: '/loans',           icon: Coins,        label: 'Loans',     color: 'text-violet-600  bg-violet-50  hover:bg-violet-100'  },
    { to: '/savings',         icon: PiggyBank,    label: 'Savings',   color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { to: '/meetings',        icon: CalendarDays, label: 'Meetings',  color: 'text-amber-600   bg-amber-50   hover:bg-amber-100'   },
    { to: '/staff/penalties', icon: Receipt,      label: 'Penalties', color: 'text-rose-600    bg-rose-50    hover:bg-rose-100'    },
    { to: '/assets',          icon: Package,      label: 'Assets',    color: 'text-slate-600   bg-slate-50   hover:bg-slate-100'   },
];

// ── Page ───────────────────────────────────────────────────────────────────────
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

    const sections = buildSections().filter(s =>
        isAdmin || s.requiredPermissions.some(p => permissions.includes(p))
    );

    const roleName = (user?.roles?.[0] ?? '')
        .replace('ROLE_', '').replace(/_/g, ' ')
        .toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || 'Staff';

    const today = new Date().toLocaleDateString('en-KE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-16">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{roleName}</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                            {greeting()}, {user?.firstName} 👋
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">{today}</p>
                    </div>
                    <button onClick={fetchDashboard} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 hover:shadow">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Refreshing…' : refreshedAt
                            ? `Updated ${refreshedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Refresh'}
                    </button>
                </div>

                {/* ── Coop account balance card ── */}
                <CoopAccountBalanceCard />


                {/* ── Error ── */}
                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={fetchDashboard} className="text-xs font-bold underline">Retry</button>
                    </div>
                )}

                {/* ── Quick Links ── */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Access</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {QUICK_LINKS.map(({ to, icon: Icon, label, color }) => (
                            <Link key={to} to={to}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150 ${color}`}>
                                <Icon size={20} />
                                <span className="text-xs font-semibold">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── No permissions ── */}
                {!loading && sections.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
                        <ShieldAlert className="w-12 h-12 text-slate-300" />
                        <p className="text-base font-semibold text-slate-500">No dashboard sections available</p>
                        <p className="text-sm text-center max-w-sm text-slate-400">
                            Your account doesn't have any dashboard permissions. Contact your System Administrator.
                        </p>
                    </div>
                )}

                {/* ── Loading skeleton ── */}
                {loading && sections.length === 0 && (
                    <div className="space-y-8">
                        {[1, 2].map(i => (
                            <div key={i}>
                                <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mb-4" />
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(j => (
                                        <div key={j} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Dashboard sections ── */}
                {sections.map(section => (
                    <Section key={section.id} title={section.title} icon={section.icon}
                        linkTo={section.linkTo} linkLabel="View all">
                        {section.render(data, loading)}
                    </Section>
                ))}
            </div>
        </div>
    );
};

export default UnifiedStaffDashboard;