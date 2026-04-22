import React, { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
    Calendar, CheckCircle2, AlertTriangle, Clock, CalendarClock,
    Smartphone, X, Loader2,
} from 'lucide-react';
import type { ObligationResponse, PeriodStatus } from '../api/obligation-api';
import { penaltyApi } from '../../penalties/api/penalty-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ── Config per status ─────────────────────────────────────────────────────────

const statusConfig: Record<PeriodStatus, {
    label: string;
    textColor: string;
    badgeBg: string;
    cardBorder: string;
    icon: React.ReactNode;
}> = {
    UPCOMING: {
        label: 'Upcoming',
        textColor: 'text-blue-700',
        badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
        cardBorder: 'border-slate-200 bg-white',
        icon: <CalendarClock size={13} />,
    },
    DUE: {
        label: 'Due',
        textColor: 'text-amber-700',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
        cardBorder: 'border-amber-200 bg-amber-50/20',
        icon: <Clock size={13} />,
    },
    COVERED: {
        label: 'Covered',
        textColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        cardBorder: 'border-slate-200 bg-white',
        icon: <CheckCircle2 size={13} />,
    },
    OVERDUE: {
        label: 'Overdue',
        textColor: 'text-red-700',
        badgeBg: 'bg-red-50 border-red-200 text-red-700',
        cardBorder: 'border-red-200 bg-red-50/30',
        icon: <AlertTriangle size={13} />,
    },
};

// ── Pay penalty mini-modal ────────────────────────────────────────────────────

interface PayModalProps {
    penaltyId: string;
    outstanding: number;
    onClose: () => void;
    onSuccess: () => void;
}

const PayPenaltyModal: React.FC<PayModalProps> = ({ penaltyId, outstanding, onClose, onSuccess }) => {
    const [phone,   setPhone]   = useState('');
    const [amount,  setAmount]  = useState(String(outstanding));
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState('');

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await penaltyApi.repayPenalty({ phoneNumber: phone, amount: Number(amount), penaltyId });
            setSuccess('STK push sent! Check your phone to complete payment.');
            setTimeout(onSuccess, 2500);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Payment failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Smartphone size={18} className="text-emerald-600" />
                        <h3 className="font-semibold text-slate-900 text-sm">Pay Penalty via M-Pesa</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handlePay} className="p-6 space-y-4">
                    {error   && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                    {success && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{success}</p>}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">M-Pesa Phone Number</label>
                        <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                               placeholder="e.g. 0712345678"
                               className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount (KES)</label>
                        <input type="number" required min="1" max={outstanding} value={amount}
                               onChange={e => setAmount(e.target.value)}
                               className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <p className="text-xs text-slate-400 mt-1">Outstanding: KES {outstanding.toLocaleString()}</p>
                    </div>
                    <button type="submit" disabled={loading || !!success}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        {loading ? 'Sending…' : 'Send STK Push'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ── Card ──────────────────────────────────────────────────────────────────────

interface Props {
    obligation: ObligationResponse;
    onPaid?: () => void;
}

export const ObligationStatusCard: React.FC<Props> = ({ obligation, onPaid }) => {
    const [showPayModal, setShowPayModal] = useState(false);

    const period     = obligation.currentPeriod;
    const rawStatus  = period?.computedStatus ?? period?.status ?? 'DUE';
    const cfg        = statusConfig[rawStatus] ?? statusConfig.DUE;
    const periodEnd  = period ? parseISO(period.periodEnd) : null;
    const today      = new Date();
    const daysLeft   = periodEnd ? differenceInDays(periodEnd, today) : null;
    const progressPct = period
        ? Math.min(100, Math.round((period.paidAmount / period.requiredAmount) * 100))
        : 0;

    const hasPenalty = !!period?.penaltyId && period.penaltyStatus === 'OPEN';

    return (
        <>
            <div className={`rounded-xl border p-5 shadow-sm ${cfg.cardBorder}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1.5">
                            <Calendar size={13} />
                            <span className="font-medium uppercase tracking-wide">
                                {obligation.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} Obligation
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">
                            KES {obligation.amountDue.toLocaleString()}
                            <span className="text-sm font-normal text-slate-500 ml-1">
                                / {obligation.frequency === 'WEEKLY' ? 'week' : 'month'}
                            </span>
                        </p>
                    </div>
                    {period && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badgeBg}`}>
                            {cfg.icon} {cfg.label}
                        </span>
                    )}
                </div>

                {period ? (
                    <>
                        {/* Progress bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                <span>Contribution progress</span>
                                <span className="font-medium">{progressPct}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        rawStatus === 'COVERED'  ? 'bg-emerald-500' :
                                            rawStatus === 'OVERDUE'  ? 'bg-red-500'     :
                                                rawStatus === 'DUE'      ? 'bg-amber-400'   : 'bg-blue-400'
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-3 text-center mb-4">
                            <div className="bg-white/80 rounded-lg p-3 border border-slate-100">
                                <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Required</p>
                                <p className="font-semibold text-slate-800 text-sm">
                                    KES {period.requiredAmount.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-white/80 rounded-lg p-3 border border-slate-100">
                                <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Paid</p>
                                <p className="font-semibold text-emerald-700 text-sm">
                                    KES {period.paidAmount.toLocaleString()}
                                </p>
                            </div>
                            <div className={`rounded-lg p-3 border ${
                                period.remaining > 0 ? 'bg-red-50/80 border-red-100' : 'bg-slate-50 border-slate-100'
                            }`}>
                                <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Remaining</p>
                                <p className={`font-semibold text-sm ${period.remaining > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                                    {period.remaining > 0 ? `KES ${period.remaining.toLocaleString()}` : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Penalty alert (OVERDUE only) */}
                        {hasPenalty && period.penaltyId && period.penaltyOutstanding && (
                            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-red-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-red-800">Penalty Raised</p>
                                        <p className="text-xs text-red-600">
                                            KES {period.penaltyOutstanding.toLocaleString()} outstanding
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPayModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                    <Smartphone size={12} /> Pay
                                </button>
                            </div>
                        )}

                        {/* Period dates + days label */}
                        <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>
                                {format(parseISO(period.periodStart), 'dd MMM')}
                                {' – '}
                                {format(parseISO(period.periodEnd), 'dd MMM yyyy')}
                            </span>
                            {daysLeft !== null && rawStatus !== 'COVERED' && rawStatus !== 'OVERDUE' && (
                                <span className={`font-medium ${
                                    daysLeft < 0 ? 'text-red-600' :
                                        daysLeft <= 2 ? 'text-amber-600' : 'text-slate-500'
                                }`}>
                                    {daysLeft < 0  ? `${Math.abs(daysLeft)}d overdue` :
                                        daysLeft === 0 ? 'Due today'                      :
                                            `${daysLeft}d left`}
                                </span>
                            )}
                            {rawStatus === 'UPCOMING' && (
                                <span className="text-blue-600 font-medium">Savings day coming up</span>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-500 mt-2">No period opened yet for this cycle.</p>
                )}
            </div>

            {showPayModal && period?.penaltyId && period.penaltyOutstanding && (
                <PayPenaltyModal
                    penaltyId={period.penaltyId}
                    outstanding={period.penaltyOutstanding}
                    onClose={() => setShowPayModal(false)}
                    onSuccess={() => { setShowPayModal(false); onPaid?.(); }}
                />
            )}
        </>
    );
};