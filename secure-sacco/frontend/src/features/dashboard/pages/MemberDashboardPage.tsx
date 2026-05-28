import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSettings } from '../../settings/context/useSettings';
import { dashboardApi, type MemberDashboardDTO } from '../api/dashboard-api';
import { meetingsApi } from '../../meetings/api/meetings-api';
import { PaymentModal } from '../../payments/components/PaymentModal';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import {
    PiggyBank, Coins, AlertCircle, CalendarClock, CreditCard,
    ChevronRight, CheckCircle2, Clock, ArrowUpRight, TrendingUp,
    RefreshCw, ShieldCheck, ArrowDownCircle, UserCheck, FileText,
    ShieldAlert, Banknote, BarChart3,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const isOverdue = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />
);

// ── Page ───────────────────────────────────────────────────────────────────────
const MemberDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { settings } = useSettings();

    const isPending = user?.memberStatus === 'PENDING';
    const isActive  = user?.memberStatus === 'ACTIVE';
    const registrationFee = settings?.registrationFee || 1000; // || guards 0 too, not just null/undefined

    const [data,       setData]       = useState<MemberDashboardDTO | null>(null);
    const [loading,    setLoading]    = useState(true);
    const [refreshedAt, setRefreshedAt] = useState(new Date());
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [checkingIn, setCheckingIn]   = useState(false);
    const [checkedIn,  setCheckedIn]    = useState(false);

    const fetchData = useCallback(async () => {
        if (!isActive) return;
        try {
            setLoading(true);
            setData(await dashboardApi.getMemberDashboard());
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshedAt(new Date()); }
    }, [isActive]);

    useEffect(() => {
        if (!isActive) return;
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const d = await dashboardApi.getMemberDashboard();
                if (!cancelled) setData(d);
            } catch (e) { if (!cancelled) console.error(e); }
            finally { if (!cancelled) { setLoading(false); setRefreshedAt(new Date()); } }
        })();
        return () => { cancelled = true; };
    }, [isActive]);

    const handleCheckIn = async () => {
        if (!data?.upcomingMeetingId) return;
        setCheckingIn(true);
        try { await meetingsApi.checkIn(data.upcomingMeetingId); setCheckedIn(true); }
        catch (e) { console.error(getApiErrorMessage(e, 'Check-in failed.')); }
        finally { setCheckingIn(false); }
    };

    const nextOverdue    = isOverdue(data?.nextInstallmentDueDate);
    const hasOpenPenalties = (data?.openPenaltiesCount ?? 0) > 0;

    const parseMeetingStart = (raw: string | null | undefined): Date | null => {
        if (!raw) return null;
        const iso = raw.replace(' ', 'T');
        return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
    };
    const meetingStartDate  = parseMeetingStart(data?.upcomingMeetingStartAt);
    const meetingHasStarted = meetingStartDate ? new Date() >= meetingStartDate : false;
    const meetingIsCheckable = data?.upcomingMeetingStatus === 'SCHEDULED' && meetingHasStarted;

    // ── Pending screen ─────────────────────────────────────────────────────────
    if (isPending) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 px-4">
                <div className="w-full max-w-md space-y-6">
                    {/* Hero */}
                    <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-200">
                            <Clock className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Almost there, {user?.firstName}!</h1>
                        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                            Complete your registration by paying the one-time fee to unlock all member benefits.
                        </p>
                    </div>

                    {/* Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Avatar strip */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-lg uppercase border-2 border-white/20">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div>
                                <p className="font-bold text-white">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-white/50">{user?.email}</p>
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="p-6 space-y-4">
                            {[
                                { icon: CheckCircle2, label: 'Account created',                                         done: true  },
                                { icon: CreditCard,   label: `Pay registration fee — KES ${registrationFee.toLocaleString()}`, done: false },
                                { icon: ShieldCheck,  label: 'Account activated & member number assigned',              done: false },
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
                                        ${step.done ? 'bg-emerald-100 text-emerald-600' : i === 1 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <step.icon size={16} />
                                    </div>
                                    <p className={`text-sm ${step.done ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>{step.label}</p>
                                    {step.done && <CheckCircle2 size={14} className="text-emerald-500 ml-auto shrink-0" />}
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="px-6 pb-6">
                            <button onClick={() => setPayModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold rounded-xl transition-all text-sm shadow-md shadow-emerald-200 hover:shadow-lg active:scale-[0.98]">
                                <CreditCard size={16} />
                                Pay KES {registrationFee.toLocaleString()} via M-Pesa
                                <ChevronRight size={16} />
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-3">
                                After paying, refresh the page. Contact support for assistance.
                            </p>
                        </div>
                    </div>

                    <PaymentModal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)}
                        amount={registrationFee}
                        accountReference={`REG-${user?.id?.substring(0, 8).toUpperCase() ?? 'FEE'}`}
                        title="Pay Registration Fee"
                        description="Enter your M-Pesa phone number. A payment prompt will be sent to your phone." />
                </div>
            </div>
        );
    }

    // ── Active member dashboard ────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                            Member <span className="font-mono text-emerald-600">{user?.memberNumber}</span>
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {greeting()}, {user?.firstName} 👋
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={() => { void fetchData(); }} disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Refreshing…' : refreshedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                </div>

                {/* ── KPI Hero Row ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Savings — big hero card */}
                    <Link to="/savings"
                        className="col-span-2 lg:col-span-1 relative bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl p-5 text-white shadow-md shadow-emerald-200 hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <PiggyBank size={20} />
                            </div>
                            <ArrowUpRight size={15} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {loading
                            ? <Skeleton className="h-9 w-36 bg-white/20 mb-2" />
                            : <p className="text-3xl font-bold leading-none">KES {fmt(data?.savingsBalance)}</p>}
                        <p className="text-xs text-white/60 mt-2 font-medium">Savings Balance</p>
                    </Link>

                    {/* Loan */}
                    <Link to="/my-loans"
                        className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col gap-2.5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                                <Coins size={18} className="text-violet-600" />
                            </div>
                            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-violet-400 transition-colors" />
                        </div>
                        {loading ? <Skeleton className="h-8 w-28" /> : (
                            <p className="text-2xl font-bold text-slate-900 leading-none">
                                {(data?.loanOutstanding ?? 0) > 0 ? `KES ${fmt(data?.loanOutstanding)}` : '—'}
                            </p>
                        )}
                        <div>
                            <p className="text-sm font-medium text-slate-500">Loan Outstanding</p>
                            {!loading && <p className="text-xs text-slate-400 mt-0.5">{(data?.loanOutstanding ?? 0) > 0 ? 'Active loan balance' : 'No active loan'}</p>}
                        </div>
                    </Link>

                    {/* Penalties */}
                    <Link to="/my-penalties"
                        className={`rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col gap-2.5
                            ${hasOpenPenalties ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-slate-100'}`}>
                        <div className="flex items-start justify-between">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasOpenPenalties ? 'bg-rose-100' : 'bg-slate-100'}`}>
                                <AlertCircle size={18} className={hasOpenPenalties ? 'text-rose-600' : 'text-slate-400'} />
                            </div>
                            <ArrowUpRight size={14} className={`${hasOpenPenalties ? 'text-rose-300 group-hover:text-rose-500' : 'text-slate-300 group-hover:text-slate-500'} transition-colors`} />
                        </div>
                        {loading ? <Skeleton className="h-8 w-24" /> : (
                            <p className={`text-2xl font-bold leading-none ${hasOpenPenalties ? 'text-rose-700' : 'text-slate-800'}`}>
                                {hasOpenPenalties ? `KES ${fmt(data?.openPenaltiesAmount)}` : 'Clear'}
                            </p>
                        )}
                        <div>
                            <p className="text-sm font-medium text-slate-500">Penalties</p>
                            {!loading && <p className="text-xs text-slate-400 mt-0.5">
                                {hasOpenPenalties ? `${data!.openPenaltiesCount} open item${data!.openPenaltiesCount !== 1 ? 's' : ''}` : 'No outstanding penalties'}
                            </p>}
                        </div>
                    </Link>

                    {/* Attendance */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-2.5">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                            <BarChart3 size={18} className="text-sky-600" />
                        </div>
                        {loading ? <Skeleton className="h-8 w-20" /> : (
                            <p className="text-2xl font-bold text-slate-900 leading-none">
                                {data?.attendanceRate != null ? `${Math.round(data.attendanceRate)}%` : '—'}
                            </p>
                        )}
                        <div>
                            <p className="text-sm font-medium text-slate-500">Attendance Rate</p>
                            <p className="text-xs text-slate-400 mt-0.5">Meeting participation</p>
                        </div>
                    </div>
                </div>

                {/* ── Detail Cards Row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Next Installment */}
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${nextOverdue ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
                        <div className={`px-5 py-4 border-b flex items-center justify-between ${nextOverdue ? 'border-rose-100' : 'border-slate-100'}`}>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Next Loan Installment</h2>
                                <p className={`text-xs mt-0.5 ${nextOverdue ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                                    {nextOverdue ? '⚠ Payment overdue' : 'Upcoming repayment'}
                                </p>
                            </div>
                            <Link to="/my-loans" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                My Loans <ChevronRight size={13} />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="p-5 space-y-3"><Skeleton className="h-12 w-48" /><Skeleton className="h-4 w-32" /></div>
                        ) : data?.nextInstallmentAmount != null ? (
                            <div className="p-5">
                                <div className={`rounded-xl p-5 text-white ${nextOverdue ? 'bg-gradient-to-br from-rose-500 to-rose-600' : 'bg-gradient-to-br from-indigo-600 to-indigo-700'}`}>
                                    <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Amount Due</p>
                                    <p className="text-3xl font-bold mt-1">KES {fmt(data.nextInstallmentAmount)}</p>
                                    <p className="text-xs opacity-70 mt-1.5">
                                        Due: {data.nextInstallmentDueDate
                                            ? new Date(data.nextInstallmentDueDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                                <TrendingUp size={28} className="text-emerald-300" />
                                <p className="text-sm font-medium text-slate-500">No upcoming installment</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Meeting */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Upcoming Meeting</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Your next scheduled session</p>
                            </div>
                            <Link to="/my-meetings" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                View all <ChevronRight size={13} />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="p-5 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                        ) : data?.upcomingMeetingTitle ? (
                            <div className="p-5 space-y-4">
                                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
                                    <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Next Meeting</p>
                                    <p className="text-lg font-bold mt-1 leading-snug">{data.upcomingMeetingTitle}</p>
                                    {data.upcomingMeetingStartAt && (
                                        <p className="text-xs opacity-75 mt-1.5">
                                            {new Date(data.upcomingMeetingStartAt).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                            {' · '}
                                            {new Date(data.upcomingMeetingStartAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                                {meetingIsCheckable && (
                                    checkedIn ? (
                                        <div className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                                            <CheckCircle2 size={16} /> Checked in successfully
                                        </div>
                                    ) : (
                                        <button onClick={handleCheckIn} disabled={checkingIn}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60">
                                            <UserCheck size={15} />
                                            {checkingIn ? 'Checking in…' : 'Check In Now'}
                                        </button>
                                    )
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <CalendarClock size={28} className="text-slate-200" />
                                <p className="text-sm font-medium text-slate-500">No upcoming meetings</p>
                                <Link to="/my-meetings" className="text-xs text-emerald-600 hover:underline font-semibold">View meeting history →</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Quick Actions ── */}
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { to: '/savings',      icon: ArrowDownCircle, bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100', ic: 'text-emerald-600', label: 'Top Up Savings',   sub: 'Deposit via M-Pesa' },
                            { to: '/my-loans',     icon: TrendingUp,      bg: 'bg-violet-50  hover:bg-violet-100  border-violet-100',  ic: 'text-violet-600',  label: 'Pay Loan',         sub: 'Repay outstanding balance' },
                            { to: '/my-penalties', icon: ShieldAlert,     bg: 'bg-rose-50    hover:bg-rose-100    border-rose-100',    ic: 'text-rose-500',    label: 'Pay Penalty',      sub: `${data?.openPenaltiesCount ?? 0} open item${(data?.openPenaltiesCount ?? 0) !== 1 ? 's' : ''}` },
                            { to: '/my-reports',   icon: FileText,        bg: 'bg-sky-50     hover:bg-sky-100     border-sky-100',     ic: 'text-sky-600',     label: 'My Statement',    sub: 'View transactions & reports' },
                        ].map(a => (
                            <Link key={a.to} to={a.to}
                                className={`group border ${a.bg} rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-all`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center`}>
                                        <a.icon size={18} className={a.ic} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                                        <p className="text-xs text-slate-400">{a.sub}</p>
                                    </div>
                                </div>
                                <ArrowUpRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Savings mini-stats ── */}
                {!loading && data && (
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Savings Summary</p>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Total Deposited', value: `KES ${fmt(data.totalDeposited)}`,   icon: Banknote,  color: 'text-emerald-600 bg-emerald-50' },
                                { label: 'Total Withdrawn', value: `KES ${fmt(data.totalWithdrawn)}`,   icon: ArrowDownCircle, color: 'text-rose-600 bg-rose-50' },
                                { label: 'Net Balance',     value: `KES ${fmt(data.savingsBalance)}`,   icon: PiggyBank, color: 'text-blue-600 bg-blue-50' },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="text-center">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
                                        <Icon size={18} />
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberDashboardPage;