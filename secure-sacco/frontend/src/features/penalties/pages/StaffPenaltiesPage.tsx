import React, { useState, useEffect, useCallback } from 'react';
import { penaltyApi, type StaffPenalty } from '../api/penalty-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import {
    ShieldAlert, Loader2, Search, RefreshCw, Check,
    AlertTriangle, X, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtKES = (n: number) =>
    `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Waive modal ──────────────────────────────────────────────────────────────
const WaiveModal: React.FC<{
    penalty: StaffPenalty;
    onClose: () => void;
    onSuccess: (id: string) => void;
}> = ({ penalty, onClose, onSuccess }) => {
    const [amount, setAmount]   = useState(String(penalty.outstandingAmount));
    const [reason, setReason]   = useState('');
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) { setError('A reason is required for audit purposes.'); return; }
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
        if (amt > penalty.outstandingAmount) { setError(`Amount cannot exceed outstanding balance of ${fmtKES(penalty.outstandingAmount)}.`); return; }

        setSaving(true); setError('');
        try {
            await penaltyApi.waivePenalty(penalty.id, { amount: amt, reason });
            onSuccess(penalty.id);
            onClose();
        } catch (err) { setError(getApiErrorMessage(err, 'Waiver failed.')); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Waive Penalty</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {penalty.memberName} · {penalty.memberNumber}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                        <div><p className="text-slate-500">Rule</p><p className="font-semibold text-slate-800 mt-0.5">{penalty.ruleName}</p></div>
                        <div><p className="text-slate-500">Original Amount</p><p className="font-semibold text-slate-800 mt-0.5">{fmtKES(penalty.originalAmount)}</p></div>
                        <div><p className="text-slate-500">Outstanding</p><p className="font-bold text-red-700 mt-0.5">{fmtKES(penalty.outstandingAmount)}</p></div>
                        <div><p className="text-slate-500">Already Waived</p><p className="font-semibold text-slate-800 mt-0.5">{fmtKES(penalty.amountWaived)}</p></div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertTriangle size={14} className="shrink-0" /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Waiver Amount (KES)
                        </label>
                        <input type="number" step="0.01" min="0.01"
                               value={amount} onChange={e => setAmount(e.target.value)}
                               className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
                        <p className="text-xs text-slate-400 mt-1">Max: {fmtKES(penalty.outstandingAmount)}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea rows={3} required value={reason}
                                  onChange={e => setReason(e.target.value)}
                                  placeholder="Enter reason for waiver (required for audit log)…"
                                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        <strong>Note:</strong> This action is irreversible and will be logged in the security audit trail.
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                                className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold
                                       flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            {saving ? 'Processing…' : 'Apply Waiver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const StaffPenaltiesPage: React.FC = () => {
    const [penalties, setPenalties] = useState<StaffPenalty[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [search, setSearch]       = useState('');
    const [waiveTarget, setWaiveTarget] = useState<StaffPenalty | null>(null);
    const [expanded, setExpanded]   = useState<string | null>(null);
    const [successIds, setSuccessIds] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try   { setPenalties(await penaltyApi.getAllOpenPenalties()); }
        catch { setError('Failed to load penalties.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleWaiveSuccess = (id: string) => {
        setSuccessIds(prev => new Set([...prev, id]));
        // Remove from list after brief delay
        setTimeout(() => setPenalties(prev => prev.filter(p => p.id !== id)), 1500);
    };

    const filtered = penalties.filter(p => {
        const q = search.toLowerCase();
        return !q || p.memberName.toLowerCase().includes(q) || p.memberNumber.toLowerCase().includes(q) || p.ruleName.toLowerCase().includes(q);
    });

    const totalOutstanding = filtered.reduce((s, p) => s + p.outstandingAmount, 0);

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="text-rose-500" size={24} /> Penalty Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        View and waive outstanding member penalties.
                    </p>
                </div>
                <button onClick={load} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Open Penalties',       value: String(filtered.length),        color: 'bg-white' },
                    { label: 'Total Outstanding',    value: fmtKES(totalOutstanding),        color: 'bg-rose-50 border-rose-200' },
                    { label: 'Waived This Session',  value: String(successIds.size),         color: 'bg-emerald-50 border-emerald-200' },
                ].map(card => (
                    <div key={card.label} className={`${card.color} border border-slate-200 rounded-xl p-5`}>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{card.label}</p>
                        <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search member name, number, or rule…"
                               value={search} onChange={e => setSearch(e.target.value)}
                               className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                        <Loader2 size={20} className="animate-spin" /><span>Loading penalties…</span>
                    </div>
                ) : error ? (
                    <div className="p-6 text-center text-red-600 text-sm">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <ShieldAlert size={36} className="mx-auto mb-3 text-slate-200" />
                        <p className="font-medium">No open penalties</p>
                        <p className="text-xs text-slate-400 mt-1">All members are in good standing.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(p => {
                            const isExpanded = expanded === p.id;
                            const wasWaived  = successIds.has(p.id);
                            return (
                                <div key={p.id} className={`transition-colors ${wasWaived ? 'bg-emerald-50' : ''}`}>
                                    <div className="flex items-center gap-4 px-5 py-4">
                                        {/* Member */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-slate-800">{p.memberName}</span>
                                                <span className="text-xs font-mono text-slate-400">{p.memberNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-slate-500">{p.ruleName}</span>
                                                <span className="text-[10px] text-slate-300">·</span>
                                                <span className="text-xs text-slate-400">{fmtDate(p.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Outstanding */}
                                        <div className="text-right shrink-0">
                                            {wasWaived ? (
                                                <div className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                                                    <Check size={14} /> Waived
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-bold text-red-700">{fmtKES(p.outstandingAmount)}</p>
                                                    <p className="text-[10px] text-slate-400">of {fmtKES(p.originalAmount)}</p>
                                                </>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {!wasWaived && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                                                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                </button>
                                                <button
                                                    onClick={() => setWaiveTarget(p)}
                                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors">
                                                    Waive
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { label: 'Original Amount', value: fmtKES(p.originalAmount) },
                                                { label: 'Outstanding',     value: fmtKES(p.outstandingAmount) },
                                                { label: 'Amount Waived',   value: fmtKES(p.amountWaived) },
                                                { label: 'Rule Code',       value: p.ruleCode },
                                            ].map(d => (
                                                <div key={d.label} className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{d.label}</p>
                                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{d.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {waiveTarget && (
                <WaiveModal
                    penalty={waiveTarget}
                    onClose={() => setWaiveTarget(null)}
                    onSuccess={handleWaiveSuccess}
                />
            )}
        </div>
    );
};

export default StaffPenaltiesPage;