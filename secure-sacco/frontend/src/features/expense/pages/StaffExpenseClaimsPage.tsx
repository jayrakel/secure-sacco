import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getAllExpenseClaims,
    submitExpenseClaim,
    reviewExpenseClaim,
    type ExpenseClaimResponse,
} from '../api/expense-api';
import { memberApi, type Member } from '../../members/api/member-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import { Search, X, CheckCircle2, User } from 'lucide-react';

// ── Status Badge ───────────────────────────────────────────────────────────────
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

// ── Member Search Picker ───────────────────────────────────────────────────────
// Replaces the raw UUID text input with a live-search dropdown.
interface MemberPickerProps {
    value: Member | null;
    onChange: (m: Member | null) => void;
}
function MemberPicker({ value, onChange }: MemberPickerProps) {
    const [query,    setQuery]    = useState('');
    const [results,  setResults]  = useState<Member[]>([]);
    const [open,     setOpen]     = useState(false);
    const [searching, setSearching] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const search = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        setSearching(true);
        try {
            const page = await memberApi.getMembers(q, 'ACTIVE', 0, 8);
            setResults(page.content);
            setOpen(true);
        } catch { setResults([]); }
        finally { setSearching(false); }
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(q), 300);
    };

    const select = (m: Member) => {
        onChange(m);
        setQuery('');
        setResults([]);
        setOpen(false);
    };

    const clear = () => {
        onChange(null);
        setQuery('');
        setResults([]);
    };

    // Show the selected member chip
    if (value) {
        return (
            <div className="flex items-center gap-2 w-full border border-emerald-300 bg-emerald-50 rounded-xl px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <User size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{value.firstName} {value.lastName}</p>
                    <p className="text-xs text-emerald-700 font-mono">{value.memberNumber}</p>
                </div>
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <button type="button" onClick={clear}
                    className="p-0.5 rounded hover:bg-emerald-100 transition-colors shrink-0" aria-label="Clear member">
                    <X size={14} className="text-slate-400" />
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    id="input-member-search"
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onFocus={() => query && results.length > 0 && setOpen(true)}
                    placeholder="Search by name or member number…"
                    autoComplete="off"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {open && results.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {results.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => select(m)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-emerald-700">
                                    {m.firstName[0]}{m.lastName[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{m.firstName} {m.lastName}</p>
                                <p className="text-xs text-slate-400 font-mono">{m.memberNumber}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium shrink-0">
                                {m.status}
                            </span>
                        </button>
                    ))}
                    {results.length === 0 && !searching && (
                        <p className="px-4 py-3 text-sm text-slate-400 text-center">No active members found</p>
                    )}
                </div>
            )}

            {open && !searching && results.length === 0 && query.trim() && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3">
                    <p className="text-sm text-slate-400 text-center">No active members match "{query}"</p>
                </div>
            )}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function StaffExpenseClaimsPage() {
    const [claims, setClaims]           = useState<ExpenseClaimResponse[]>([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedMember, setSelectedMember]   = useState<Member | null>(null);
    const [submitForm, setSubmitForm] = useState({ amount: '', description: '', receiptReference: '' });
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
        if (!selectedMember) { setActionError('Please select a member first.'); return; }
        setSubmitting(true); setActionError(null);
        try {
            await submitExpenseClaim({
                memberId:         selectedMember.id,
                amount:           parseFloat(submitForm.amount),
                description:      submitForm.description.trim(),
                receiptReference: submitForm.receiptReference.trim() || undefined,
            });
            setShowSubmitModal(false);
            setSelectedMember(null);
            setSubmitForm({ amount: '', description: '', receiptReference: '' });
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
                approved:        reviewAction === 'approve',
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
                        onClick={() => { setShowSubmitModal(true); setActionError(null); setSelectedMember(null); setSubmitForm({ amount: '', description: '', receiptReference: '' }); }}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                    >
                        <span className="text-lg leading-none">+</span> Submit Claim
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                        { label: 'Pending Review', value: pending,  color: 'text-amber-600'   },
                        { label: 'Approved',        value: approved, color: 'text-emerald-600' },
                        { label: 'Rejected',        value: rejected, color: 'text-red-600'     },
                    ].map(({ label, value, color }) => (
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
                                                    <button id={`btn-reject-${claim.id}`}  onClick={() => openReview(claim, 'reject')}  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors">Reject</button>
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

            {/* ── Submit Modal ── */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Submit Expense Claim</h3>
                            <p className="text-sm text-slate-500 mt-1">Record a member expense for verification and approval</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{actionError}</div>}

                            {/* Member picker — replaces UUID input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Member <span className="text-red-500">*</span>
                                </label>
                                <MemberPicker value={selectedMember} onChange={setSelectedMember} />
                                <p className="text-xs text-slate-400 mt-1">Search by full name or member number</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (KES) <span className="text-red-500">*</span></label>
                                <input
                                    id="input-expense-amount" type="number" required min="1" step="0.01"
                                    placeholder="e.g. 1500"
                                    value={submitForm.amount}
                                    onChange={e => setSubmitForm(f => ({ ...f, amount: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description <span className="text-red-500">*</span></label>
                                <textarea id="input-expense-description" required rows={3}
                                    placeholder="e.g. Bought A4 paper for AGM registration"
                                    value={submitForm.description}
                                    onChange={e => setSubmitForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Receipt Reference <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input
                                    id="input-receipt-reference" type="text"
                                    placeholder="e.g. RCP-2026-001"
                                    value={submitForm.receiptReference}
                                    onChange={e => setSubmitForm(f => ({ ...f, receiptReference: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button"
                                    onClick={() => { setShowSubmitModal(false); setSelectedMember(null); }}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button id="btn-confirm-submit" type="submit"
                                    disabled={submitting || !selectedMember}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                                    {submitting ? 'Submitting…' : 'Submit Claim'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Review Modal ── */}
            {reviewTarget && reviewAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className={`p-6 border-b ${reviewAction === 'approve' ? 'border-emerald-100' : 'border-red-100'}`}>
                            <h3 className="text-lg font-bold text-slate-900">
                                {reviewAction === 'approve' ? '✅ Approve Claim' : '❌ Reject Claim'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {reviewTarget.memberName} — KES {Number(reviewTarget.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{actionError}</div>}
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                                <span className="font-semibold text-slate-700">Expense: </span>{reviewTarget.description}
                            </p>
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
                                    <textarea id="input-rejection-reason" rows={3} required
                                        placeholder="State why this claim cannot be approved…"
                                        value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                                </div>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button type="button"
                                    onClick={() => { setReviewTarget(null); setReviewAction(null); }}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
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
