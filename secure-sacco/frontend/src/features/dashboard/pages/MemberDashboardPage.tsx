import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSettings } from '../../settings/context/useSettings';
import { dashboardApi, type MemberDashboardDTO } from '../api/dashboard-api';
import { meetingsApi } from '../../meetings/api/meetings-api';
import { PaymentModal } from '../../payments/components/PaymentModal';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import {
    PiggyBank, Coins, AlertCircle, BarChart3,
    CalendarClock, CreditCard, ChevronRight, CheckCircle2, Clock,
    ArrowUpRight, TrendingUp, RefreshCw, ShieldCheck,
    ArrowDownCircle, UserCheck, FileText, ShieldAlert,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const MemberDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { settings } = useSettings();

    const isPending = user?.memberStatus === 'PENDING';
    const isActive = user?.memberStatus === 'ACTIVE';
    const registrationFee = settings?.registrationFee ?? 1000;

    const [data, setData] = useState<MemberDashboardDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshedAt, setRefreshedAt] = useState(new Date());
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkedIn, setCheckedIn] = useState(false);

    const fetchData = useCallback(async () => {
        if (!isActive) return;

        try {
            setLoading(true);
            const result = await dashboardApi.getMemberDashboard();
            setData(result);
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshedAt(new Date());
        }
    }, [isActive]);

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const loadInitialData = async () => {
            try {
                const result = await dashboardApi.getMemberDashboard();
                if (!cancelled) {
                    setData(result);
                }
            } catch (error: unknown) {
                if (!cancelled) {
                    console.error(error);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setRefreshedAt(new Date());
                }
            }
        };

        void loadInitialData();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    const handleCheckIn = async () => {
        if (!data?.upcomingMeetingId) return;

        setCheckingIn(true);
        try {
            await meetingsApi.checkIn(data.upcomingMeetingId);
            setCheckedIn(true);
        } catch (error: unknown) {
            console.error(getApiErrorMessage(error, 'Check-in failed.'));
        } finally {
            setCheckingIn(false);
        }
    };

    const nextOverdue = isOverdue(data?.nextInstallmentDueDate);
    const hasOpenPenalties = (data?.openPenaltiesCount ?? 0) > 0;

    // Mirror the backend rule exactly:
    // Button only appears when the meeting's start_at datetime has been reached.
    // Normalize the string from the backend (space-separated, no tz) → ISO with Z (UTC).
    const parseMeetingStart = (raw: string | null | undefined): Date | null => {
        if (!raw) return null;
        const iso = raw.replace(' ', 'T');
        return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
    };

    const meetingStartDate = parseMeetingStart(data?.upcomingMeetingStartAt);
    const meetingHasStarted = meetingStartDate ? new Date() >= meetingStartDate : false;
    const meetingIsCheckable = (data?.upcomingMeetingStatus === 'SCHEDULED') && meetingHasStarted;

    // ── Pending activation screen ─────────────────────────────────────────────
    if (isPending) {
        return (
            <div className="max-w-2xl mx-auto mt-12 space-y-6 pb-12 px-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Complete Your Registration</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Pay the one-time registration fee to activate your account and unlock savings, loans and all member benefits.
                    </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg uppercase">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-slate-400">{user?.email}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {[
                            { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: 'Account created', done: true },
                            { icon: CreditCard, color: 'text-amber-600 bg-amber-50', label: `Pay registration fee — KES ${registrationFee.toLocaleString()}`, done: false },
                            { icon: ShieldCheck, color: 'text-slate-400 bg-slate-100', label: 'Account activated & member number assigned', done: false },
                        ].map((step, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.color}`}>
                                    <step.icon size={16} />
                                </div>
                                <p className={`text-sm ${step.done ? 'text-slate-800 font-semibold' : 'text-slate-600'}`}>{step.label}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setPayModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm shadow-sm"
                    >
                        <CreditCard size={16} />
                        Pay KES {registrationFee.toLocaleString()} via M-Pesa
                        <ChevronRight size={16} />
                    </button>
                    <p className="text-center text-xs text-slate-400">
                        After paying on your phone, refresh the page. Contact support if you experience issues.
                    </p>
                </div>

                <PaymentModal
                    isOpen={payModalOpen}
                    onClose={() => setPayModalOpen(false)}
                    amount={registrationFee}
                    accountReference={`REG-${user?.id?.substring(0, 8).toUpperCase() ?? 'FEE'}`}
                    title="Pay Registration Fee"
                    description="Enter your M-Pesa phone number. A payment prompt will be sent to your phone."
                />
            </div>
        );
    }

    // ── Active member dashboard ───────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{greeting()}, {user?.firstName}</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Member <span className="font-mono font-semibold text-emerald-600">{user?.memberNumber}</span>
                        &nbsp;·&nbsp;
                        {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={() => { void fetchData(); }}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Refreshing…' : refreshedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/savings" className="bg-linear-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-shadow group col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                            <PiggyBank size={18} />
                        </div>
                        <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {loading ? <Skeleton className="h-8 w-32 bg-white/20 mb-1" /> : (
                        <p className="text-3xl font-bold leading-none">
                            KES {fmt(data?.savingsBalance)}
                        </p>
                    )}
                    <p className="text-xs text-white/70 mt-2">Savings Balance</p>
                </Link>

                <Link to="/my-loans" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow group flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                            <Coins size={18} className="text-violet-600" />
                        </div>
                        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                    {loading ? <Skeleton className="h-7 w-28 mb-1" /> : (
                        <div>
                            <p className="text-2xl font-bold text-slate-800 leading-none">
                                {(data?.loanOutstanding ?? 0) > 0 ? `KES ${fmt(data?.loanOutstanding)}` : '—'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">
                                {(data?.loanOutstanding ?? 0) > 0 ? 'Outstanding balance' : 'No active loan'}
                            </p>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-auto">Loan Outstanding</p>
                </Link>

                <Link to="/my-penalties" className={`rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow group flex flex-col gap-3 ${hasOpenPenalties ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${hasOpenPenalties ? 'bg-rose-100' : 'bg-slate-100'}`}>
                            <AlertCircle size={18} className={hasOpenPenalties ? 'text-rose-600' : 'text-slate-400'} />
                        </div>
                        <ArrowUpRight size={14} className={hasOpenPenalties ? 'text-rose-300 group-hover:text-rose-500' : 'text-slate-300 group-hover:text-slate-500'} />
                    </div>
                    {loading ? <Skeleton className="h-7 w-24 mb-1" /> : (
                        <div>
                            <p className={`text-2xl font-bold leading-none ${hasOpenPenalties ? 'text-rose-700' : 'text-slate-800'}`}>
                                {hasOpenPenalties ? `KES ${fmt(data?.openPenaltiesAmount)}` : 'Clear'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">
                                {hasOpenPenalties
                                    ? `${data!.openPenaltiesCount} open penalty item${data!.openPenaltiesCount !== 1 ? 's' : ''}`
                                    : 'No outstanding penalties'}
                            </p>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-auto">Penalties</p>
                </Link>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                    <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
                        <BarChart3 size={18} className="text-sky-600" />
                    </div>
                    {loading ? <Skeleton className="h-7 w-20 mb-1" /> : (
                        <div>
                            <p className="text-2xl font-bold text-slate-800 leading-none">
                                {data?.attendanceRate != null ? `${Math.round(data.attendanceRate)}%` : '—'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">Meeting attendance</p>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-auto">Attendance Rate</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${nextOverdue ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                    <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${nextOverdue ? 'border-rose-100' : 'border-slate-100'}`}>
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
                        <div className="flex items-center justify-center py-12"><div className="space-y-3 w-full px-5"><Skeleton className="h-10 w-48" /><Skeleton className="h-4 w-32" /></div></div>
                    ) : data?.nextInstallmentAmount != null ? (
                        <div className="p-5">
                            <div className={`rounded-xl p-4 text-white ${nextOverdue ? 'bg-linear-to-br from-rose-500 to-rose-600' : 'bg-linear-to-br from-indigo-600 to-indigo-700'}`}>
                                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Amount Due</p>
                                <p className="text-3xl font-bold mt-1">KES {fmt(data.nextInstallmentAmount)}</p>
                                <p className="text-xs opacity-70 mt-1">
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

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Upcoming Meeting</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Your next scheduled session</p>
                        </div>
                        <Link to="/my-meetings" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            View all <ChevronRight size={13} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12"><div className="space-y-3 w-full px-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></div>
                    ) : data?.upcomingMeetingTitle ? (
                        <div className="p-5 space-y-4 flex-1">
                            <div className="bg-linear-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Next Meeting</p>
                                <p className="text-lg font-bold mt-1 leading-snug">{data.upcomingMeetingTitle}</p>
                                {data.upcomingMeetingTitle && data.upcomingMeetingStartAt && (
                                    <p className="text-xs opacity-75 mt-1">
                                        {new Date(data.upcomingMeetingStartAt as string).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                        {' · '}
                                        {new Date(data.upcomingMeetingStartAt as string).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>

                            {meetingIsCheckable && (
                                checkedIn ? (
                                    <div className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                                        <CheckCircle2 size={16} />
                                        Checked in successfully
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={checkingIn}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60"
                                    >
                                        <UserCheck size={15} />
                                        {checkingIn ? 'Checking in…' : 'Check In'}
                                    </button>
                                )
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                            <CalendarClock size={28} className="text-slate-200" />
                            <p className="text-sm font-medium text-slate-500">No upcoming meetings</p>
                            <Link to="/my-meetings" className="text-xs text-emerald-600 hover:underline font-semibold">View meeting history →</Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                    { to: '/savings', icon: ArrowDownCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', borderHover: 'hover:border-emerald-300', label: 'Top Up Savings', sub: 'Deposit via M-Pesa' },
                    { to: '/my-loans', icon: TrendingUp, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', borderHover: 'hover:border-violet-300', label: 'Pay Loan', sub: 'Repay outstanding balance' },
                    { to: '/my-penalties', icon: ShieldAlert, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', borderHover: 'hover:border-rose-200', label: 'Pay Penalty', sub: `${data?.openPenaltiesCount ?? 0} open item${(data?.openPenaltiesCount ?? 0) !== 1 ? 's' : ''}` },
                    { to: '/my-reports', icon: FileText, iconBg: 'bg-sky-50', iconColor: 'text-sky-600', borderHover: 'hover:border-sky-200', label: 'My Statement', sub: 'View transactions & reports' },
                ].map(action => (
                    <Link
                        key={action.to}
                        to={action.to}
                        className={`group bg-white border border-slate-200 ${action.borderHover} rounded-2xl shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-all`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${action.iconBg} flex items-center justify-center`}>
                                <action.icon size={18} className={action.iconColor} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                                <p className="text-xs text-slate-400">{action.sub}</p>
                            </div>
                        </div>
                        <ArrowUpRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default MemberDashboardPage;