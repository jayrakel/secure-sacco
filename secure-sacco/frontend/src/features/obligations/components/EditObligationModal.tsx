import React, { useState, useEffect } from 'react';
import { X, Loader2, Edit2, AlertTriangle } from 'lucide-react';
import { obligationsApi, type ObligationResponse, type ObligationFrequency, type ObligationStatus } from '../api/obligation-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditObligationModalProps {
    obligation: ObligationResponse | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updated: ObligationResponse) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
    'w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ' +
    'bg-white placeholder-slate-300 transition-all';

const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

const FREQ_LABELS: Record<ObligationFrequency, string> = {
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
};

const STATUS_OPTIONS: { value: ObligationStatus; label: string; color: string }[] = [
    { value: 'ACTIVE', label: 'Active',  color: 'text-emerald-700' },
    { value: 'PAUSED', label: 'Paused',  color: 'text-amber-700'   },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const EditObligationModal: React.FC<EditObligationModalProps> = ({
                                                                            obligation, isOpen, onClose, onSuccess,
                                                                        }) => {
    const [amountDue, setAmountDue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [graceDays, setGraceDays] = useState(0);
    const [status, setStatus]       = useState<ObligationStatus>('ACTIVE');
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');

    // ── Populate form when obligation changes ─────────────────────────────────
    useEffect(() => {
        if (obligation) {
            setAmountDue(String(obligation.amountDue));
            setStartDate(obligation.startDate);
            setGraceDays(obligation.graceDays);
            setStatus(obligation.status);
            setError('');
        }
    }, [obligation]);

    if (!isOpen || !obligation) return null;

    // ── Detect what changed ────────────────────────────────────────────────────
    const termsChanged =
        parseFloat(amountDue) !== obligation.amountDue ||
        startDate !== obligation.startDate ||
        graceDays !== obligation.graceDays;

    const statusChanged = status !== obligation.status;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            let updated = obligation;

            // 1. Update terms if changed
            if (termsChanged) {
                updated = await obligationsApi.updateObligation(obligation.id, {
                    amountDue: parseFloat(amountDue),
                    startDate,
                    graceDays,
                });
            }

            // 2. Update status if changed
            if (statusChanged) {
                updated = await obligationsApi.updateStatus(obligation.id, status);
            }

            onSuccess(updated);
            onClose();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to update obligation.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                                <Edit2 size={14} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Edit Obligation</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {FREQ_LABELS[obligation.frequency]} · KES {obligation.amountDue.toLocaleString()} / period
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                <AlertTriangle size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Frequency (read-only — changing it would invalidate existing periods) */}
                        <div>
                            <label className={labelCls}>Frequency</label>
                            <div className="px-3.5 py-2.5 border border-slate-100 rounded-lg bg-slate-50 text-sm text-slate-500 flex items-center justify-between">
                                <span>{FREQ_LABELS[obligation.frequency]}</span>
                                <span className="text-xs text-slate-400">Cannot be changed</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">
                                Changing frequency after periods have been created would invalidate historical records.
                            </p>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className={labelCls}>Required Amount (KES)</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">KES</span>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    value={amountDue}
                                    onChange={e => setAmountDue(e.target.value)}
                                    className={inputCls + ' pl-12'}
                                    placeholder="1000.00"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">
                                Amount required per {obligation.frequency.toLowerCase()} period.
                            </p>
                        </div>

                        {/* Start date */}
                        <div>
                            <label className={labelCls}>Start Date</label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className={inputCls}
                            />
                        </div>

                        {/* Grace days */}
                        <div>
                            <label className={labelCls}>Grace Period (days)</label>
                            <input
                                type="number"
                                min={0}
                                max={30}
                                value={graceDays}
                                onChange={e => setGraceDays(parseInt(e.target.value) || 0)}
                                className={inputCls}
                            />
                            <p className="text-xs text-slate-400 mt-1.5">
                                Extra days after a period ends before it counts as overdue.
                            </p>
                        </div>

                        {/* Status */}
                        <div>
                            <label className={labelCls}>Status</label>
                            <div className="flex gap-3">
                                {STATUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setStatus(opt.value)}
                                        className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all
                                            ${status === opt.value
                                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {status === 'PAUSED' && (
                                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                                    <AlertTriangle size={11} />
                                    Paused obligations stop generating compliance periods.
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || (!termsChanged && !statusChanged)}
                                className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm
                                           font-semibold flex items-center justify-center gap-2 transition-all
                                           disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};