import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSettings } from '../../settings/context/useSettings';
import { reportApi, type MemberMiniSummaryDTO } from '../../reports/api/report-api';
import {
    PiggyBank, Coins, AlertCircle, CalendarCheck,
    CreditCard, ChevronRight, CheckCircle2, Clock,
    TrendingUp, ArrowUpRight, Loader2,
} from 'lucide-react';
import { PaymentModal } from '../../payments/components/PaymentModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LOAN_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE:             { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active'        },
    PENDING_APPROVAL:   { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Pending'       },
    APPROVED:           { bg: 'bg-violet-50',  text: 'text-violet-700',  label: 'Approved'      },
    REJECTED:           { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Rejected'      },
    CLOSED:             { bg: 'bg-slate-100',  text: 'text-slate-600',   label: 'Closed'        },
    NONE:               { bg: 'bg-slate-100',  text: 'text-slate-500',   label: 'No Active Loan'},
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    accent?: string;
}> = ({ label, value, sub, icon: Icon, iconBg, iconColor, accent }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start justify-between gap-4 ${accent ?? ''}`}>
        <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
    </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const MemberDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [summary, setSummary] = useState<MemberMiniSummaryDTO | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const registrationFee = settings?.registrationFee || 1000;
    const isActive  = user?.memberStatus === 'ACTIVE';
    const isPending = user?.memberStatus === 'PENDING';

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const loadSummary = async () => {
            setSummaryLoading(true);
            try {
                const result = await reportApi.getMySummary();
                if (!cancelled) setSummary(result);
            } catch {
                if (!cancelled) setSummary(null);
            } finally {
                if (!cancelled) setSummaryLoading(false);
            }
        };

        void loadSummary();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    const loanStyle = LOAN_STATUS_STYLE[summary?.activeLoanStatus ?? 'NONE'] ?? LOAN_STATUS_STYLE.NONE;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">

            {/* ── Welcome header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Welcome back, {user?.firstName}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Member #{user?.memberNumber ?? 'Pending'} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                    {isActive ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                    {isActive ? 'Active Member' : 'Pending Activation'}
                </div>
            </div>

            {/* ── Pending activation banner ── */}
            {isPending && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-amber-900">Account Activation Required</p>
                            <p className="text-sm text-amber-700 mt-0.5">
                                Pay the KES {registrationFee.toLocaleString()} registration fee via M-Pesa to unlock your full member benefits.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-colors shrink-0 shadow-sm"
                    >
                        <CreditCard size={16} /> Pay Now
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* ── KPI stat cards (only for active members) ── */}
            {isActive && (
                <>
                    {summaryLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                            <Loader2 className="animate-spin text-emerald-600" size={28} />
                            <span className="text-sm">Loading your account summary…</span>
                        </div>
                    ) : summary ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                label="Savings Balance"
                                value={`KES ${fmt(summary.savingsBalance)}`}
                                sub="Total deposited savings"
                                icon={PiggyBank}
                                iconBg="bg-emerald-50"
                                iconColor="text-emerald-600"
                            />
                            <StatCard
                                label="Loan Arrears"
                                value={summary.loanArrears > 0 ? `KES ${fmt(summary.loanArrears)}` : 'Clear'}
                                sub={summary.loanArrears > 0 ? 'Overdue repayment balance' : 'No outstanding arrears'}
                                icon={Coins}
                                iconBg={summary.loanArrears > 0 ? 'bg-rose-50' : 'bg-emerald-50'}
                                iconColor={summary.loanArrears > 0 ? 'text-rose-600' : 'text-emerald-600'}
                            />
                            <StatCard
                                label="Penalties"
                                value={summary.penaltyOutstanding > 0 ? `KES ${fmt(summary.penaltyOutstanding)}` : 'Clear'}
                                sub={summary.penaltyOutstanding > 0 ? 'Outstanding penalty balance' : 'No penalties outstanding'}
                                icon={AlertCircle}
                                iconBg={summary.penaltyOutstanding > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
                                iconColor={summary.penaltyOutstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}
                            />
                            <StatCard
                                label="Next Due Date"
                                value={summary.nextDueDate
                                    ? new Date(summary.nextDueDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
                                    : '—'
                                }
                                sub={summary.nextDueDate ? 'Next loan repayment' : 'No upcoming payments'}
                                icon={CalendarCheck}
                                iconBg="bg-sky-50"
                                iconColor="text-sky-600"
                            />
                        </div>
                    ) : null}

                    {/* ── Active loan status pill ── */}
                    {summary && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-sky-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Loan Status</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{loanStyle.label}</p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${loanStyle.bg} ${loanStyle.text}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                                {loanStyle.label}
                            </span>
                        </div>
                    )}

                    {/* ── Quick actions ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href="/savings" className="group bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl shadow-sm p-5 flex items-center justify-between transition-all hover:shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                    <PiggyBank className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">View Savings</p>
                                    <p className="text-xs text-slate-400">Statement & deposits</p>
                                </div>
                            </div>
                            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                        </a>
                        <a href="/my-loans" className="group bg-white border border-slate-200 hover:border-sky-300 rounded-2xl shadow-sm p-5 flex items-center justify-between transition-all hover:shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                                    <Coins className="w-5 h-5 text-sky-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">My Loans</p>
                                    <p className="text-xs text-slate-400">Applications & repayments</p>
                                </div>
                            </div>
                            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                        </a>
                    </div>
                </>
            )}

            {/* ── Profile card (always visible) ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Account Details</h2>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold border border-emerald-200 uppercase shrink-0">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-1 flex-1">
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Full Name</p>
                            <p className="text-sm font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Email</p>
                            <p className="text-sm text-slate-600 truncate">{user?.email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Member Number</p>
                            <p className="text-sm font-mono font-bold text-emerald-700">{user?.memberNumber || '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                amount={registrationFee}
                accountReference={`REG-${user?.id?.substring(0, 8).toUpperCase() || 'FEE'}`}
                title="Pay Registration Fee"
                description="We'll send a secure M-Pesa prompt to your phone to authorize the transaction."
            />
        </div>
    );
};

export default MemberDashboardPage;