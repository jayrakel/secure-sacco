import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { memberApi } from '../../members/api/member-api';
import { loanApi, type LoanApplication } from '../../loans/api/loan-api';
import { reportApi, type DailyCollectionDTO, type LoanArrearsDTO } from '../../reports/api/report-api';
import {
    Users, Coins, AlertTriangle, RefreshCw, Loader2,
    CheckCircle2, ChevronRight, Smartphone, CreditCard,
    CircleDollarSign, ShieldAlert, TrendingUp, ArrowUpRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
        : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
            : n.toFixed(0);
const todayStr = () => new Date().toISOString().split('T')[0];
const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const LOAN_CFG: Record<string, { badge: string; label: string; dot: string }> = {
    PENDING_VERIFICATION: { badge: 'bg-sky-100 text-sky-800',      label: 'Needs Verification', dot: 'bg-sky-500'    },
    VERIFIED:             { badge: 'bg-violet-100 text-violet-800', label: 'Needs Approval',     dot: 'bg-violet-500' },
    APPROVED:             { badge: 'bg-emerald-100 text-emerald-800',label: 'Needs Disbursal',   dot: 'bg-emerald-500'},
    ACTIVE:               { badge: 'bg-green-100 text-green-800',   label: 'Active',             dot: 'bg-green-500'  },
    REJECTED:             { badge: 'bg-red-100 text-red-800',       label: 'Rejected',           dot: 'bg-red-500'    },
    CLOSED:               { badge: 'bg-slate-100 text-slate-600',   label: 'Closed',             dot: 'bg-slate-400'  },
};

// ─── KPI card ─────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
    label: string; value: string; sub: string;
    icon: React.ElementType; iconBg: string; iconColor: string;
    linkTo?: string; loading?: boolean; accent?: string;
}> = ({ label, value, sub, icon: Icon, iconBg, iconColor, linkTo, loading, accent }) => {
    const body = (
        <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 h-full group hover:shadow-md transition-shadow ${accent ?? 'border-slate-200'}`}>
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                {linkTo && <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />}
            </div>
            {loading ? (
                <div className="space-y-2 flex-1">
                    <div className="h-7 w-2/3 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                </div>
            ) : (
                <div className="flex-1">
                    <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
                    <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
                </div>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        </div>
    );
    return linkTo ? <Link to={linkTo}>{body}</Link> : <div>{body}</div>;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();

    const [memberCount, setMemberCount]   = useState<number | null>(null);
    const [allLoans,    setAllLoans]      = useState<LoanApplication[]>([]);
    const [collections, setCollections]   = useState<DailyCollectionDTO | null>(null);
    const [arrears,     setArrears]       = useState<LoanArrearsDTO[]>([]);
    const [loading,     setLoading]       = useState(true);
    const [refreshedAt, setRefreshedAt]   = useState(new Date());

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [mp, lp, cp, ap] = await Promise.allSettled([
            memberApi.getMembers('', 'ACTIVE', 0, 1),
            loanApi.getAllApplications(),
            reportApi.getDailyCollections(todayStr()),
            reportApi.getLoanArrears(),
        ]);
        if (mp.status === 'fulfilled') setMemberCount(mp.value.totalElements);
        if (lp.status === 'fulfilled') setAllLoans(lp.value);
        if (cp.status === 'fulfilled') setCollections(cp.value);
        if (ap.status === 'fulfilled') setArrears(ap.value);
        setLoading(false);
        setRefreshedAt(new Date());
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Derived
    const activeLoans   = allLoans.filter(l => l.status === 'ACTIVE').length;
    const pendingAction = allLoans.filter(l => ['PENDING_VERIFICATION', 'VERIFIED', 'APPROVED'].includes(l.status));
    const totalArrears  = arrears.reduce((s, a) => s + a.amountOverdue, 0);
    const todayTotal    = collections?.totalCollected ?? 0;
    const topArrears    = [...arrears].sort((a, b) => b.amountOverdue - a.amountOverdue).slice(0, 5);
    const recentLoans   = [...allLoans]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

    const roleName = user?.roles?.[0]?.replace('ROLE_', '').replace(/_/g, ' ') ?? 'Admin';

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{greeting()}, {user?.firstName}</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {roleName} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={fetchAll} disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Refreshing…' : refreshedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Active Members" value={memberCount !== null ? memberCount.toLocaleString() : '—'}
                         sub="Registered & active" icon={Users} iconBg="bg-sky-50" iconColor="text-sky-600"
                         linkTo="/members" loading={loading && memberCount === null} />
                <KpiCard label="Active Loans" value={loading ? '—' : activeLoans.toString()}
                         sub={`${pendingAction.length} awaiting action`} icon={Coins} iconBg="bg-violet-50" iconColor="text-violet-600"
                         linkTo="/loans" loading={loading && allLoans.length === 0} />
                <KpiCard label="Today's Collections" value={loading ? '—' : `KES ${fmtShort(todayTotal)}`}
                         sub={collections ? Object.keys(collections.byChannel).join(' · ') : 'No payments yet'}
                         icon={CircleDollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600"
                         linkTo="/reports/collections" loading={loading && !collections} />
                <KpiCard label="Total Arrears" value={loading ? '—' : `KES ${fmtShort(totalArrears)}`}
                         sub={`${arrears.length} overdue loan${arrears.length !== 1 ? 's' : ''}`}
                         icon={AlertTriangle}
                         iconBg={totalArrears > 0 ? 'bg-rose-50' : 'bg-emerald-50'}
                         iconColor={totalArrears > 0 ? 'text-rose-600' : 'text-emerald-600'}
                         linkTo="/reports/arrears" loading={loading && arrears.length === 0} />
            </div>

            {/* Middle row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Pending loan actions */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Pending Actions</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{pendingAction.length} loan{pendingAction.length !== 1 ? 's' : ''} need attention</p>
                        </div>
                        <Link to="/loans" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            Go to Loans <ChevronRight size={13} />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50 flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-slate-200" /></div>
                        ) : pendingAction.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                                <CheckCircle2 size={28} className="text-emerald-300" />
                                <p className="text-sm font-medium text-slate-500">All clear — nothing pending</p>
                            </div>
                        ) : pendingAction.slice(0, 6).map(loan => {
                            const cfg = LOAN_CFG[loan.status] ?? LOAN_CFG.CLOSED;
                            return (
                                <div key={loan.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{loan.productName}</p>
                                            <p className="text-[10px] text-slate-400 font-mono truncate">{loan.memberId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                                        <span className="text-xs font-bold text-slate-700">KES {fmt(loan.principalAmount)}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>{cfg.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Today's collections */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Today's Collections</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                        <Link to="/reports/collections" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            Full report <ChevronRight size={13} />
                        </Link>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-slate-200" /></div>
                    ) : !collections || todayTotal === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                            <CircleDollarSign size={28} className="text-slate-200" />
                            <p className="text-sm font-medium text-slate-500">No collections yet today</p>
                        </div>
                    ) : (
                        <div className="p-5 space-y-4 flex-1">
                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Total Collected</p>
                                <p className="text-3xl font-bold mt-1">KES {fmt(todayTotal)}</p>
                            </div>
                            <div className="space-y-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By Channel</p>
                                {Object.entries(collections.byChannel).map(([ch, amt]) => {
                                    const pct = todayTotal > 0 ? (amt / todayTotal) * 100 : 0;
                                    const Icon = ch === 'MPESA' ? Smartphone : CreditCard;
                                    return (
                                        <div key={ch} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                                <Icon size={12} className="text-slate-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-semibold text-slate-600">{ch}</span>
                                                    <span className="font-bold text-slate-800">KES {fmt(amt)}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Recent applications */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Recent Loan Applications</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Latest {recentLoans.length} submissions</p>
                        </div>
                        <Link to="/loans" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">Manage <ChevronRight size={13} /></Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-200" /></div>
                        ) : recentLoans.length === 0 ? (
                            <div className="py-10 text-center text-sm text-slate-400">No loan applications yet.</div>
                        ) : recentLoans.map(loan => {
                            const cfg = LOAN_CFG[loan.status] ?? LOAN_CFG.CLOSED;
                            return (
                                <div key={loan.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{loan.productName}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(loan.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                                        <span className="text-xs font-bold text-slate-700">KES {fmt(loan.principalAmount)}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top arrears */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Top Arrears</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Highest overdue balances in portfolio</p>
                        </div>
                        <Link to="/reports/arrears" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">Full report <ChevronRight size={13} /></Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-200" /></div>
                        ) : topArrears.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                                <TrendingUp size={26} className="text-emerald-300" />
                                <p className="text-sm font-medium text-slate-500">Portfolio is clean — no arrears</p>
                            </div>
                        ) : topArrears.map(a => (
                            <div key={a.loanId} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                                        <ShieldAlert size={14} className="text-rose-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-700 truncate">{a.memberName}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{a.memberNumber} · {a.daysOverdue}d overdue</p>
                                    </div>
                                </div>
                                <div className="shrink-0 ml-3 text-right">
                                    <p className="text-xs font-bold text-rose-600">KES {fmt(a.amountOverdue)}</p>
                                    <p className="text-[10px] text-slate-400">{a.bucket}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;