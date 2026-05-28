import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
    CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight,
    CalendarClock, Smartphone, X, Loader2,
} from 'lucide-react';
import type { ObligationPeriodResponse, PagedResponse, PeriodStatus } from '../api/obligation-api';
import { penaltyApi } from '../../penalties/api/penalty-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: PeriodStatus }> = ({ status }) => {
    const styles: Record<PeriodStatus, { cls: string; icon: React.ReactNode; label: string }> = {
        UPCOMING: { cls: 'bg-blue-50 border-blue-200 text-blue-700',        icon: <CalendarClock size={11} />, label: 'Upcoming' },
        DUE:      { cls: 'bg-amber-50 border-amber-200 text-amber-700',     icon: <Clock size={11} />,         label: 'Due'      },
        COVERED:  { cls: 'bg-emerald-50 border-emerald-200 text-emerald-700',icon: <CheckCircle2 size={11} />, label: 'Covered'  },
        OVERDUE:  { cls: 'bg-red-50 border-red-200 text-red-700',           icon: <AlertTriangle size={11} />, label: 'Overdue'  },
    };
    const s = styles[status] ?? styles.DUE;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
            {s.icon} {s.label}
        </span>
    );
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
            await penaltyApi.repayPenalty({
                phoneNumber: phone,
                amount: Number(amount),
                penaltyId,
            });
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
                        <input
                            type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                            placeholder="e.g. 0712345678"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount (KES)</label>
                        <input
                            type="number" required min="1" max={outstanding} value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-slate-400 mt-1">Outstanding: KES {outstanding.toLocaleString()}</p>
                    </div>
                    <button
                        type="submit" disabled={loading || !!success}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        {loading ? 'Sending…' : 'Send STK Push'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRows: React.FC = () => (
    <div className="space-y-2 animate-pulse p-4">
        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
    </div>
);

// ── Main table ────────────────────────────────────────────────────────────────

interface Props {
    data: PagedResponse<ObligationPeriodResponse> | null;
    loading: boolean;
    page: number;
    onPageChange: (page: number) => void;
    onPaid?: () => void;
}

export const ObligationHistoryTable: React.FC<Props> = ({ data, loading, page, onPageChange, onPaid }) => {
    const [payTarget, setPayTarget] = useState<ObligationPeriodResponse | null>(null);

    if (loading) return <SkeletonRows />;

    if (!data || data.content.length === 0) {
        return (
            <div className="text-center py-10 text-slate-500 text-sm">
                No obligation history yet. History appears once periods are evaluated.
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left">Period</th>
                            <th className="px-4 py-3 text-right">Required</th>
                            <th className="px-4 py-3 text-right">Paid</th>
                            <th className="px-4 py-3 text-right">Shortfall</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Penalty</th>
                            <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {data.content.map((period) => {
                            const shortfall = Math.max(0, period.requiredAmount - period.paidAmount);
                            const hasPenalty = !!period.penaltyId && period.penaltyStatus === 'OPEN';
                            const displayStatus = period.computedStatus ?? period.status;
                            return (
                                <tr key={period.id} className={`hover:bg-slate-50 transition-colors ${period.status === 'OVERDUE' ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-4 py-3 text-slate-700 font-medium">
                                        {format(parseISO(period.periodStart), 'dd MMM')}
                                        {' – '}
                                        {format(parseISO(period.periodEnd), 'dd MMM yyyy')}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        KES {period.requiredAmount.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                                        KES {period.paidAmount.toLocaleString()}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-medium ${shortfall > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                        {shortfall > 0 ? `KES ${shortfall.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={displayStatus} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {period.penaltyAmount ? (
                                            <span className={`text-sm font-semibold ${period.penaltyStatus === 'OPEN' ? 'text-red-600' : 'text-slate-400'}`}>
                                                KES {(period.penaltyOutstanding ?? period.penaltyAmount).toLocaleString()}
                                                {period.penaltyStatus !== 'OPEN' && (
                                                    <span className="ml-1 text-xs font-normal capitalize text-slate-400">
                                                        ({period.penaltyStatus?.toLowerCase()})
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {hasPenalty && period.penaltyId && period.penaltyOutstanding ? (
                                            <button
                                                onClick={() => setPayTarget(period)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                            >
                                                <Smartphone size={11} /> Pay
                                            </button>
                                        ) : (
                                            <span className="text-slate-200 text-xs">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {data.totalPages > 1 && (
                    <div className="flex justify-between items-center text-sm text-slate-600 px-1">
                        <span>{data.number * data.size + 1}–{Math.min((data.number + 1) * data.size, data.totalElements)} of {data.totalElements}</span>
                        <div className="flex items-center gap-2">
                            <button disabled={data.first} onClick={() => onPageChange(page - 1)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft size={15} />
                            </button>
                            <span className="text-xs text-slate-500">{data.number + 1} / {data.totalPages}</span>
                            <button disabled={data.last} onClick={() => onPageChange(page + 1)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {payTarget && payTarget.penaltyId && payTarget.penaltyOutstanding && (
                <PayPenaltyModal
                    penaltyId={payTarget.penaltyId}
                    outstanding={payTarget.penaltyOutstanding}
                    onClose={() => setPayTarget(null)}
                    onSuccess={() => { setPayTarget(null); onPaid?.(); }}
                />
            )}
        </>
    );
};