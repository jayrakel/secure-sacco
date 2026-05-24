import { useState, useEffect, useCallback } from 'react';
import {
    getMyExpenseClaims,
    submitMyExpenseClaim,
    type ExpenseClaimResponse,
} from '../api/expense-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import { PlusCircle } from 'lucide-react';

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        PENDING:  'bg-amber-100 text-amber-800 border border-amber-200',
        APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        REJECTED: 'bg-red-100 text-red-800 border border-red-200',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}>
            {status === 'PENDING' ? '⏳ Pending' : status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
        </span>
    );
};

export default function MyExpenseClaimsPage() {
    const [claims, setClaims]   = useState<ExpenseClaimResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    // Submit modal state
    const [showModal,    setShowModal]    = useState(false);
    const [form,         setForm]         = useState({ amount: '', description: '', receiptReference: '' });
    const [submitting,   setSubmitting]   = useState(false);
    const [submitError,  setSubmitError]  = useState<string | null>(null);

    const fetchClaims = useCallback(async () => {
        try { setLoading(true); setError(null); setClaims(await getMyExpenseClaims()); }
        catch (e) { setError(getApiErrorMessage(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchClaims(); }, [fetchClaims]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true); setSubmitError(null);
        try {
            await submitMyExpenseClaim({
                amount:           parseFloat(form.amount),
                description:      form.description.trim(),
                receiptReference: form.receiptReference.trim() || undefined,
            });
            setShowModal(false);
            setForm({ amount: '', description: '', receiptReference: '' });
            await fetchClaims();
        } catch (e) { setSubmitError(getApiErrorMessage(e)); }
        finally { setSubmitting(false); }
    };

    const pending  = claims.filter(c => c.status === 'PENDING').length;
    const approved = claims.filter(c => c.status === 'APPROVED').length;
    const totalApproved = claims.filter(c => c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0);

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">My Expense Claims</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Submit expenses you paid on behalf of the SACCO — approved amounts are credited to your savings
                        </p>
                    </div>
                    <button
                        id="btn-submit-my-expense-claim"
                        onClick={() => { setShowModal(true); setSubmitError(null); }}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                    >
                        <PlusCircle size={16} /> Submit Claim
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                        { label: 'Pending Review',  display: String(pending),      color: 'text-amber-600'   },
                        { label: 'Approved',         display: String(approved),     color: 'text-emerald-600' },
                        { label: 'Total Reimbursed', display: `KES ${totalApproved.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, color: 'text-slate-700' },
                    ].map(({ label, display, color }) => (
                        <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                            <p className={`text-2xl font-bold mt-1 ${color}`}>{display}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info banner */}
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800">
                <p className="font-semibold mb-0.5">How reimbursement works</p>
                <p>Submit a claim for any SACCO-related expense you paid out of pocket. Once a staff member approves it, the amount is <strong>credited directly to your savings account</strong> — you'll see it in your savings history.</p>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

            {/* Claims list */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-700">Claim History ({claims.length})</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />
                        Loading your claims…
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="text-5xl mb-3">🧾</div>
                        <p className="text-slate-500 font-medium">No expense claims yet</p>
                        <p className="text-slate-400 text-sm mt-1">Click "Submit Claim" above to submit your first expense</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {claims.map((claim) => (
                            <div key={claim.id} className="px-6 py-5 hover:bg-slate-50/60 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <StatusBadge status={claim.status} />
                                            {claim.journalReference && (
                                                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    {claim.journalReference}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-slate-800 mt-1">{claim.description}</p>
                                        {claim.receiptReference && (
                                            <p className="text-xs text-slate-400 mt-0.5">Receipt: <span className="font-mono">{claim.receiptReference}</span></p>
                                        )}
                                        {claim.status === 'APPROVED' && (
                                            <p className="text-xs text-emerald-600 font-medium mt-1">
                                                ✓ Credited to your savings account
                                            </p>
                                        )}
                                        {claim.rejectionReason && (
                                            <p className="text-xs text-red-600 mt-1 italic">Rejection reason: {claim.rejectionReason}</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-2">
                                            Submitted {new Date(claim.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xl font-bold text-slate-900">
                                            KES {Number(claim.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                        </p>
                                        {claim.reviewedAt && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Reviewed {new Date(claim.reviewedAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Submit Expense Claim</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Record an expense you paid on behalf of the SACCO — once approved it will be credited to your savings
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {submitError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{submitError}</div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Amount (KES) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="input-my-expense-amount"
                                    type="number" required min="1" step="0.01"
                                    placeholder="e.g. 1500"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="input-my-expense-description"
                                    required rows={3}
                                    placeholder="e.g. Bought stationery for the AGM — attach receipt"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Receipt Reference <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    id="input-my-receipt-reference"
                                    type="text"
                                    placeholder="e.g. RCP-2026-001"
                                    value={form.receiptReference}
                                    onChange={e => setForm(f => ({ ...f, receiptReference: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button id="btn-confirm-my-claim" type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                                    {submitting ? 'Submitting…' : 'Submit Claim'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
