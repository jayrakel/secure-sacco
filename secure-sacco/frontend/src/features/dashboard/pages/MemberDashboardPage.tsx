import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSettings } from '../../settings/context/SettingsContext';
import { savingsApi, type StatementTransactionResponse } from '../../savings/api/savings-api';
import { loanApi, type LoanApplication, type LoanSummary } from '../../loans/api/loan-api';
import { penaltyApi, type PenaltySummary } from '../../penalties/api/penalty-api';
import {
    PiggyBank, Coins, AlertCircle, CalendarCheck,
    CreditCard, ChevronRight, CheckCircle2, Clock,
    ArrowUpRight, ArrowDownLeft, Loader2, TrendingUp,
    RefreshCw, ShieldCheck, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';
import { PaymentModal } from '../../payments/components/PaymentModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const LOAN_STATUS: Record<string, { badge: string; label: string }> = {
    PENDING_FEE:           { badge: 'bg-amber-100 text-amber-800',   label: 'Fee Pending'        },
    PENDING_GUARANTORS:    { badge: 'bg-orange-100 text-orange-800', label: 'Needs Guarantors'   },
    PENDING_VERIFICATION:  { badge: 'bg-sky-100 text-sky-800',       label: 'Under Review'       },
    VERIFIED:              { badge: 'bg-violet-100 text-violet-800', label: 'Verified'           },
    APPROVED:              { badge: 'bg-emerald-100 text-emerald-800',label: 'Approved'          },
    ACTIVE:                { badge: 'bg-green-100 text-green-800',   label: 'Active'             },
    REJECTED:              { badge: 'bg-red-100 text-red-800',       label: 'Rejected'           },
    CLOSED:                { badge: 'bg-slate-100 text-slate-600',   label: 'Closed'             },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const MemberDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { settings } = useSettings();

    const [savingsBalance, setSavingsBalance] = useState<number | null>(null);
    const [recentTxns,     setRecentTxns]     = useState<StatementTransactionResponse[]>([]);
    const [loans,          setLoans]          = useState<LoanApplication[]>([]);
    const [activeLoanSum,  setActiveLoanSum]  = useState<LoanSummary | null>(null);
    const [penalties,      setPenalties]      = useState<PenaltySummary[]>([]);
    const [loading,        setLoading]        = useState(true);
    const [refreshedAt,    setRefreshedAt]    = useState(new Date());
    const [payModalOpen,   setPayModalOpen]   = useState(false);

    const isPending = user?.memberStatus === 'PENDING';
    const isActive  = user?.memberStatus === 'ACTIVE';
    const registrationFee = settings?.registrationFee ?? 1000;

    const fetchData = useCallback(async () => {
        if (!isActive) { setLoading(false); return; }
        setLoading(true);
        const [balRes, stmtRes, loansRes, penRes] = await Promise.allSettled([
            savingsApi.getMyBalance(),
            savingsApi.getMyStatement(),
            loanApi.getMyApplications(),
            penaltyApi.getMyOpenPenalties(),
        ]);

        if (balRes.status   === 'fulfilled') setSavingsBalance(balRes.value.availableBalance);
        if (stmtRes.status  === 'fulfilled') setRecentTxns(stmtRes.value.slice(0, 5));
        if (loansRes.status === 'fulfilled') {
            const all = loansRes.value;
            setLoans(all);
            // Try to load summary for any active loan
            const active = all.find(l => l.status === 'ACTIVE');
            if (active) {
                try {
                    const sum = await loanApi.getLoanSummary(active.id);
                    setActiveLoanSum(sum);
                } catch {}
            }
        }
        if (penRes.status === 'fulfilled') setPenalties(penRes.value);

        setLoading(false);
        setRefreshedAt(new Date());
    }, [isActive]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalPenalties = penalties.reduce((s, p) => s + p.outstandingAmount, 0);
    const activeLoan     = loans.find(l => l.status === 'ACTIVE');
    const pendingLoans   = loans.filter(l => !['ACTIVE', 'CLOSED', 'REJECTED'].includes(l.status));
    const closedLoans    = loans.filter(l => l.status === 'CLOSED');

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
                    {/* User info */}
                    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg uppercase">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-slate-400">{user?.email}</p>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                        {[
                            { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: 'Account created', done: true },
                            { icon: CreditCard,   color: 'text-amber-600 bg-amber-50',     label: `Pay registration fee — KES ${registrationFee.toLocaleString()}`, done: false },
                            { icon: ShieldCheck,  color: 'text-slate-400 bg-slate-100',    label: 'Account activated & member number assigned', done: false },
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

            {/* Header */}
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
                    onClick={fetchData}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Refreshing…' : refreshedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </button>
            </div>

            {/* ── KPI row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Savings Balance */}
                <Link to="/savings" className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-shadow group col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                            <PiggyBank size={18} />
                        </div>
                        <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {loading ? <Skeleton className="h-8 w-32 bg-white/20 mb-1" /> : (
                        <p className="text-3xl font-bold leading-none">
                            KES {savingsBalance !== null ? fmt(savingsBalance) : '—'}
                        </p>
                    )}
                    <p className="text-xs text-white/70 mt-2">Savings Balance</p>
                </Link>

                {/* Active Loan */}
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
                                {activeLoanSum
                                    ? `KES ${fmt(activeLoanSum.totalOutstanding)}`
                                    : activeLoan ? 'Active' : loans.length > 0 ? `${loans.length} loan${loans.length > 1 ? 's' : ''}` : '—'
                                }
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">
                                {activeLoanSum ? 'Outstanding balance' : activeLoan ? 'Loan active' : loans.length > 0 ? 'In progress' : 'No loans yet'}
                            </p>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-auto">Active Loan</p>
                </Link>

                {/* Next Due */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                    <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
                        <CalendarCheck size={18} className="text-sky-600" />
                    </div>
                    {loading ? <Skeleton className="h-7 w-24 mb-1" /> : (
                        <div>
                            <p className="text-2xl font-bold text-slate-800 leading-none">
                                {activeLoanSum?.nextDueDate
                                    ? new Date(activeLoanSum.nextDueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
                                    : '—'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">
                                {activeLoanSum?.nextDueAmount
                                    ? `KES ${fmt(activeLoanSum.nextDueAmount)} due`
                                    : 'No upcoming payment'}
                            </p>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-auto">Next Repayment</p>
                </div>

                {/* Penalties */}
                <Link to="/my-penalties" className={`rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow group flex flex-col gap-3 ${totalPenalties > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${totalPenalties > 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                            <AlertCircle size={18} className={totalPenalties > 0 ? 'text-rose-600' : 'text-slate-400'} />
                        </div>
                        <ArrowUpRight size={14} className={totalPenalties > 0 ? 'text-rose-300 group-hover:text-rose-500' : 'text-slate-300 group-hover:text-slate-500'} />
                    </div>
                    {loading ? <Skeleton className="h-7 w-24 mb-1" /> : (
                        <div>
                            <p className={`text-2xl font-bold leading-none ${totalPenalties > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                                {totalPenalties > 0 ? `KES ${fmt(totalPenalties)}` : 'Clear'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">
                                {penalties.length > 0 ? `${penalties.length} open penalty item${penalties.length > 1 ? 's' : ''}` : 'No outstanding penalties'}
                            </p>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-auto">Penalties</p>
                </Link>
            </div>

            {/* ── Middle row: Loan card + Recent savings txns ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Active loan detail card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">My Loans</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{loans.length} total · {closedLoans.length} closed</p>
                        </div>
                        <Link to="/my-loans" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            Manage <ChevronRight size={13} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-slate-200" /></div>
                    ) : activeLoan && activeLoanSum ? (
                        <div className="p-5 space-y-4">
                            {/* Loan hero */}
                            <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl p-4 text-white">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{activeLoan.productName}</p>
                                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">ACTIVE</span>
                                </div>
                                <p className="text-3xl font-bold">KES {fmt(activeLoanSum.totalOutstanding)}</p>
                                <p className="text-xs opacity-70 mt-1">Outstanding balance</p>
                            </div>
                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Principal', value: `KES ${fmt(activeLoan.principalAmount)}` },
                                    { label: 'Arrears',   value: activeLoanSum.totalArrears > 0 ? `KES ${fmt(activeLoanSum.totalArrears)}` : 'None', danger: activeLoanSum.totalArrears > 0 },
                                    { label: 'Next Due',  value: activeLoanSum.nextDueDate ? new Date(activeLoanSum.nextDueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                                    { label: 'Due Amt',   value: activeLoanSum.nextDueAmount > 0 ? `KES ${fmt(activeLoanSum.nextDueAmount)}` : '—' },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                        <p className={`text-sm font-bold mt-0.5 ${item.danger ? 'text-rose-600' : 'text-slate-800'}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : pendingLoans.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {pendingLoans.map(loan => {
                                const cfg = LOAN_STATUS[loan.status] ?? { badge: 'bg-slate-100 text-slate-600', label: loan.status };
                                return (
                                    <div key={loan.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-700">{loan.productName}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">KES {fmt(loan.principalAmount)}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                            <Coins size={28} className="text-slate-200" />
                            <p className="text-sm font-medium text-slate-500">No active loans</p>
                            <Link to="/my-loans" className="text-xs text-emerald-600 hover:underline font-semibold">Apply for a loan →</Link>
                        </div>
                    )}
                </div>

                {/* Recent savings transactions */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Recent Transactions</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Latest savings activity</p>
                        </div>
                        <Link to="/savings" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            View all <ChevronRight size={13} />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50 flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-slate-200" /></div>
                        ) : recentTxns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                                <PiggyBank size={28} className="text-slate-200" />
                                <p className="text-sm font-medium text-slate-500">No transactions yet</p>
                                <Link to="/savings" className="text-xs text-emerald-600 hover:underline font-semibold">Make a deposit →</Link>
                            </div>
                        ) : recentTxns.map(tx => {
                            const isDeposit = tx.type === 'DEPOSIT';
                            return (
                                <div key={tx.transactionId} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDeposit ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                            {isDeposit
                                                ? <ArrowDownLeft size={15} className="text-emerald-600" />
                                                : <ArrowUpCircle size={15} className="text-amber-600" />
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 capitalize">{tx.type.toLowerCase()}</p>
                                            <p className="text-[10px] text-slate-400 font-mono truncate">{tx.reference}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className={`text-sm font-bold ${isDeposit ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {isDeposit ? '+' : '-'}KES {fmt(tx.amount)}
                                        </p>
                                        <p className="text-[10px] text-slate-400">Bal: {fmt(tx.runningBalance)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Quick actions ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { to: '/savings', icon: ArrowDownCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', borderHover: 'hover:border-emerald-300', label: 'Deposit Savings', sub: 'Top up via M-Pesa' },
                    { to: '/my-loans', icon: TrendingUp,     iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  borderHover: 'hover:border-violet-300',  label: 'Loan Repayment', sub: 'Pay outstanding balance' },
                    { to: '/my-penalties', icon: ShieldCheck, iconBg: 'bg-rose-50',   iconColor: 'text-rose-500',    borderHover: 'hover:border-rose-200',    label: 'Clear Penalties', sub: `${penalties.length} open item${penalties.length !== 1 ? 's' : ''}` },
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