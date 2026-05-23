import { useState, useEffect, useCallback } from 'react';
import {
    getAllExpenseClaims,
    submitExpenseClaim,
    reviewExpenseClaim,
    type ExpenseClaimResponse,
} from '../api/expense-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

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

export default function StaffExpenseClaimsPage() {
    const [claims, setClaims]           = useState<ExpenseClaimResponse[]>([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitForm, setSubmitForm] = useState({ memberId: '', amount: '', description: '', receiptReference: '' });
    const [submitting, setSubmitting] = useState(false);

    const [reviewTarget, setReviewTarget] = useState<ExpenseClaimResponse | null>(null);
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [reviewing, setReviewing] = useState(false);

    const fetchClaims = useCallback(async () => {
        try { setLoading(true); setError(null); setClaims(await getAllExpenseClaims()); }
        catch (e) { setError(getApiErrorMessage(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchClaims(); }, [fetchClaims]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true); setActionError(null);
        try {
            await submitExpenseClaim({
                memberId: submitForm.memberId.trim(),
                amount: parseFloat(submitForm.amount),
                description: submitForm.description.trim(),
                receiptReference: submitForm.receiptReference.trim() || undefined,
            });
            setShowSubmitModal(false);
            setSubmitForm({ memberId: '', amount: '', description: '', receiptReference: '' });
            await fetchClaims();
        } catch (e) { setActionError(getApiErrorMessage(e)); }
        finally { setSubmitting(false); }
    };

    const openReview = (claim: ExpenseClaimResponse, action: 'approve' | 'reject') => {
        setReviewTarget(claim); setReviewAction(action); setRejectionReason(''); setActionError(null);
    };

    const handleReview = async () => {
        if (!reviewTarget || !reviewAction) return;
        setReviewing(true); setActionError(null);
        try {
            await reviewExpenseClaim(reviewTarget.id, {
                approved: reviewAction === 'approve',
                rejectionReason: reviewAction === 'reject' ? rejectionReason : undefined,
            });
            setReviewTarget(null); setReviewAction(null);
            await fetchClaims();
        } catch (e) { setActionError(getApiErrorMessage(e)); }
        finally { setReviewing(false); }
    };

    const pending  = claims.filter(c => c.status === 'PENDING').length;
    const approved = claims.filter(c => c.status === 'APPROVED').length;
    const rejected = claims.filter(c => c.status === 'REJECTED').length;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Expense Claims</h1>
                        <p className="text-slate-500 text-sm mt-1">Member expense reimbursement — verify and approve after review</p>
                    </div>
                    <button
                        id="btn-submit-expense-claim"
                        onClick={() => { setShowSubmitModal(true); setActionError(null); }}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                    >
                        <span className="text-lg leading-none">+</span> Submit Claim
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[{ label: 'Pending Review', value: pending, color: 'text-amber-600' },
                      { label: 'Approved', value: approved, color: 'text-emerald-600' },
                      { label: 'Rejected', value: rejected, color: 'text-red-600' }].map(({ label, value, color }) => (
                        <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-700">All Claims ({claims.length})</h2>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />Loading claims…
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="text-5xl mb-3">🧾</div>
                        <p className="text-slate-500 font-medium">No expense claims yet</p>
                        <p className="text-slate-400 text-sm mt-1">Submit the first claim using the button above</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    {['Member', 'Description', 'Receipt Ref', 'Amount (KES)', 'Status', 'GL Ref', 'Submitted', 'Actions'].map(h => (
                                        <th key={h} className={`px-6 py-3 font-semibold ${h === 'Amount (KES)' ? 'text-right' : h === 'Status' || h === 'Actions' ? 'text-center' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {claims.map((claim) => (
                                    <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-800">{claim.memberName}</p>
                                            <p className="text-xs text-slate-400 font-mono">{claim.memberNumber}</p>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="text-slate-700 truncate" title={claim.description}>{claim.description}</p>
                                            {claim.rejectionReason && <p className="text-xs text-red-500 mt-0.5 italic">Reason: {claim.rejectionReason}</p>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{claim.receiptReference ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-slate-800">
                                            {Number(claim.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center"><StatusBadge status={claim.status} /></td>
                                        <td className="px-6 py-4 font-mono text-xs text-emerald-600">{claim.journalReference ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                                            {new Date(claim.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {claim.status === 'PENDING' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button id={`btn-approve-${claim.id}`} onClick={() => openReview(claim, 'approve')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">Approve</button>
                                                    <button id={`btn-reject-${claim.id}`} onClick={() => openReview(claim, 'reject')} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors">Reject</button>
                                                </div>
                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Submit Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Submit Expense Claim</h3>
                            <p className="text-sm text-slate-500 mt-1">Record a member expense for verification and approval</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{actionError}</div>}
                            {[
                                { id: 'input-member-id', label: 'Member ID *', type: 'text', key: 'memberId', placeholder: 'Paste member UUID', required: true, mono: true },
                                { id: 'input-expense-amount', label: 'Amount (KES) *', type: 'number', key: 'amount', placeholder: 'e.g. 1500', required: true },
                                { id: 'input-receipt-reference', label: 'Receipt Reference (optional)', type: 'text', key: 'receiptReference', placeholder: 'e.g. RCP-2026-001', required: false },
                            ].map(({ id, label, type, key, placeholder, required, mono }) => (
                                <div key={key}>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                                    <input
                                        id={id} type={type} required={required} placeholder={placeholder}
                                        value={submitForm[key as keyof typeof submitForm]}
                                        onChange={e => setSubmitForm(f => ({ ...f, [key]: e.target.value }))}
                                        className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${mono ? 'font-mono' : ''}`}
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description *</label>
                                <textarea id="input-expense-description" required rows={3} placeholder="e.g. Bought A4 paper for AGM registration"
                                    value={submitForm.description}
                                    onChange={e => setSubmitForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button id="btn-confirm-submit" type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                                    {submitting ? 'Submitting…' : 'Submit Claim'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewTarget && reviewAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className={`p-6 border-b ${reviewAction === 'approve' ? 'border-emerald-100' : 'border-red-100'}`}>
                            <h3 className="text-lg font-bold text-slate-900">{reviewAction === 'approve' ? '✅ Approve Claim' : '❌ Reject Claim'}</h3>
                            <p className="text-sm text-slate-500 mt-1">{reviewTarget.memberName} — KES {Number(reviewTarget.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{actionError}</div>}
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl"><span className="font-semibold text-slate-700">Expense: </span>{reviewTarget.description}</p>
                            {reviewAction === 'approve' && (
                                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1">
                                    <p className="font-semibold text-sm">GL entry on approval:</p>
                                    <p className="font-mono">DR 5360 Member Expense Reimbursement</p>
                                    <p className="font-mono">CR 2190 Member Reimbursement Payable</p>
                                </div>
                            )}
                            {reviewAction === 'reject' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rejection Reason *</label>
                                    <textarea id="input-rejection-reason" rows={3} required placeholder="State why this claim cannot be approved…"
                                        value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                                </div>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setReviewTarget(null); setReviewAction(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button id={`btn-confirm-${reviewAction}`} onClick={handleReview}
                                    disabled={reviewing || (reviewAction === 'reject' && !rejectionReason.trim())}
                                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 ${reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {reviewing ? 'Processing…' : reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
