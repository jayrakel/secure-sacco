import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle, PencilLine, X } from 'lucide-react';

interface MemberSearch {
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
}

interface HistoricalTransaction {
    transactionId: string;
    type: string;
    channel: string;
    amount: number;
    reference: string;
    status: string;
    postedAt: string;
    linkedToJournalEntry: boolean;
}

interface ActiveLoan {
    id: string;
    loanProductId: string;
    principalAmount: number;
    interestRate: number;
    status: string;
    prepaymentBalance: number;
}

interface PenaltySummary {
    id: string;
    ruleCode: string;
    ruleName: string;
    originalAmount: number;
    outstandingAmount: number;
}

interface PaymentProduct {
    id: string;
    name: string;
    code: string;
    moduleType: string;
    isActive: boolean;
}

const fmt = (num: number) => new Intl.NumberFormat('en-KE').format(num);

const HistoricalEditPage: React.FC = () => {
    const [q, setQ] = useState('');
    const [searching, setSearching] = useState(false);
    const [memberResults, setMemberResults] = useState<MemberSearch[]>([]);

    const [member, setMember] = useState<MemberSearch | null>(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<HistoricalTransaction[] | null>(null);

    const [editing, setEditing] = useState<HistoricalTransaction | null>(null);
    const [newAmount, setNewAmount] = useState('');
    const [newReference, setNewReference] = useState('');
    const [reason, setReason] = useState('');
    
    // Routing state
    const [destination, setDestination] = useState<'SAVINGS' | 'LOAN' | 'PENALTY' | 'PRODUCT'>('SAVINGS');
    
    const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
    const [loadingLoans, setLoadingLoans] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState('');
    
    const [penalties, setPenalties] = useState<PenaltySummary[]>([]);
    const [loadingPenalties, setLoadingPenalties] = useState(false);
    const [selectedPenaltyId, setSelectedPenaltyId] = useState('');

    const [products, setProducts] = useState<PaymentProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{ message?: string; [key: string]: unknown } | null>(null);

    const searchMembers = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!q.trim()) return;
        setSearching(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/members/search?q=${encodeURIComponent(q)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setMemberResults(await res.json());
        } catch {
            // Ignored network error for search
        } finally {
            setSearching(false);
        }
    };

    const selectMember = (m: MemberSearch) => {
        setMember(m);
        setMemberResults([]);
        setQ('');
        // Initialize dates to past 30 days
        const d = new Date();
        setTo(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() - 30);
        setFrom(d.toISOString().split('T')[0]);
    };

    const loadTransactions = async (mId: string) => {
        setLoading(true);
        setError(null);
        setLastResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/admin/historical-edit/savings/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ memberId: mId, from: from || null, to: to || null })
            });
            if (res.ok) {
                setTransactions(await res.json());
            } else {
                const err = await res.json();
                setError(err.message || 'Failed to load transactions');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLoans = async () => {
        if (!member) return;
        setLoadingLoans(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/loans/applications/member/${member.id}/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setActiveLoans(data);
                if (data.length > 0) setSelectedLoanId(data[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingLoans(false);
        }
    };

    const fetchPenalties = async () => {
        if (!member) return;
        setLoadingPenalties(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/penalties/member/${member.id}/open`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPenalties(data);
                if (data.length > 0) setSelectedPenaltyId(data[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPenalties(false);
        }
    };

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/payment-products/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data: PaymentProduct[] = await res.json();
                const filtered = data.filter(p => p.moduleType === 'SHARE_CAPITAL' || p.moduleType === 'DEPOSIT_SHARES' || p.moduleType === 'CUSTOM');
                setProducts(filtered);
                if (filtered.length > 0) setSelectedProductId(filtered[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const openEdit = (t: HistoricalTransaction) => {
        setEditing(t);
        setNewAmount(t.amount.toString());
        setNewReference(t.reference || '');
        setReason('');
        setDestination('SAVINGS');
        setError(null);
        setLastResult(null);
    };
    
    // Auto-fetch dropdowns when destination changes
    React.useEffect(() => {
        if (destination === 'LOAN' && activeLoans.length === 0) {
            fetchLoans();
        } else if (destination === 'PENALTY' && penalties.length === 0) {
            fetchPenalties();
        } else if (destination === 'PRODUCT' && products.length === 0) {
            fetchProducts();
        }
    }, [destination]);

    const saveEdit = async () => {
        if (!editing) return;
        if (!reason.trim()) {
            setError('Reason is required for the audit log.');
            return;
        }
        if (destination === 'LOAN' && !selectedLoanId) {
            setError('Please select an active loan.');
            return;
        }
        if (destination === 'PENALTY' && !selectedPenaltyId) {
            setError('Please select an open penalty.');
            return;
        }
        if (destination === 'PRODUCT' && !selectedProductId) {
            setError('Please select a custom or share product.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/admin/historical-edit/savings/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    transactionId: editing.transactionId,
                    newAmount: newAmount ? parseFloat(newAmount) : null,
                    newReference: newReference || null,
                    newPostedAt: null, // UI doesn't allow changing date yet
                    reason,
                    destination,
                    loanId: destination === 'LOAN' ? selectedLoanId : null,
                    penaltyId: destination === 'PENALTY' ? selectedPenaltyId : null,
                    productId: destination === 'PRODUCT' ? selectedProductId : null
                })
            });

            if (res.ok) {
                const result = await res.json();
                setLastResult(result);
                setEditing(null);
                if (member) loadTransactions(member.id);
            } else {
                const err = await res.json();
                setError(err.message || 'Edit failed');
            }
        } catch {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Historical Data Correction</h1>
                <p className="text-slate-500 text-sm mt-1">Careful — edits directly manipulate records and GL. Everything is strictly audited.</p>
            </div>

            {!member && (
                <div className="mb-6">
                    <form onSubmit={searchMembers} className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search member by name or number..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-800 transition-shadow outline-none"
                        />
                        {searching && <Loader2 className="absolute right-3 top-3 animate-spin text-slate-400" size={20} />}
                    </form>
                    {memberResults.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {memberResults.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => selectMember(m)}
                                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                                >
                                    <span className="text-sm font-medium text-slate-700">{m.firstName} {m.lastName}</span>
                                    <span className="text-xs text-slate-400 ml-2">{m.memberNumber}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {member && (
                <>
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-sm font-semibold text-slate-800">{member.firstName} {member.lastName}</span>
                        <span className="text-xs text-slate-400">{member.memberNumber}</span>
                        <button onClick={() => { setMember(null); setTransactions(null); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600">
                            Change
                        </button>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="p-2 rounded-lg border border-slate-200 text-sm" />
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="p-2 rounded-lg border border-slate-200 text-sm" />
                        <button
                            onClick={() => loadTransactions(member.id)}
                            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium"
                        >
                            Filter
                        </button>
                    </div>

                    {error && !editing && <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

                    {lastResult && (
                        <div className="mb-3 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm flex flex-col gap-1">
                            <div className="flex items-start gap-2 font-medium">
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                <span>Edit Saved</span>
                            </div>
                            <span className="ml-6 text-emerald-600">{lastResult.message}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-10 text-slate-400"><Loader2 className="animate-spin inline" /></div>
                    ) : transactions && transactions.length > 0 ? (
                        <div className="space-y-2">
                            {transactions.map(t => (
                                <div key={t.transactionId} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{t.type}</span>
                                            <span className="text-sm font-semibold text-slate-800">KES {fmt(t.amount)}</span>
                                            {!t.linkedToJournalEntry && (
                                                <span className="text-xs text-amber-600">no linked GL entry</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5">{t.reference} · {new Date(t.postedAt).toLocaleString('en-KE')}</p>
                                    </div>
                                    <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                                        <PencilLine size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : transactions ? (
                        <p className="text-center text-sm text-slate-400 py-10">No transactions in this range.</p>
                    ) : null}
                </>
            )}

            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800">Edit / Route Transaction</h3>
                            <button onClick={() => setEditing(null)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        
                        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

                        <div className="space-y-4">
                            {/* Destination Routing */}
                            <div>
                                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">Destination Module</label>
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-2">
                                    {(['SAVINGS', 'LOAN', 'PENALTY', 'PRODUCT'] as const).map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDestination(d)}
                                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${destination === d ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                                
                                {destination === 'LOAN' && (
                                    <div className="mt-2">
                                        {loadingLoans ? (
                                            <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Fetching loans...</div>
                                        ) : activeLoans.length > 0 ? (
                                            <select
                                                value={selectedLoanId}
                                                onChange={e => setSelectedLoanId(e.target.value)}
                                                className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                            >
                                                <option value="">Select a loan to repay...</option>
                                                {activeLoans.map(l => (
                                                    <option key={l.id} value={l.id}>
                                                        Loan {l.id.substring(0, 8)} (Bal: KES {fmt(l.principalAmount)})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs text-amber-600">This member has no active loans.</p>
                                        )}
                                    </div>
                                )}
                                
                                {destination === 'PENALTY' && (
                                    <div className="mt-2">
                                        {loadingPenalties ? (
                                            <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Fetching penalties...</div>
                                        ) : penalties.length > 0 ? (
                                            <select
                                                value={selectedPenaltyId}
                                                onChange={e => setSelectedPenaltyId(e.target.value)}
                                                className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                            >
                                                <option value="">Select a penalty to clear...</option>
                                                {penalties.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.ruleName} (Owes: KES {fmt(p.outstandingAmount)})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs text-amber-600">This member has no open penalties.</p>
                                        )}
                                    </div>
                                )}

                                {destination === 'PRODUCT' && (
                                    <div className="mt-2">
                                        {loadingProducts ? (
                                            <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Fetching products...</div>
                                        ) : products.length > 0 ? (
                                            <select
                                                value={selectedProductId}
                                                onChange={e => setSelectedProductId(e.target.value)}
                                                className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                            >
                                                <option value="">Select a custom/share product...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.moduleType.replace('_', ' ')})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs text-amber-600">No active custom or share products found.</p>
                                        )}
                                    </div>
                                )}
                                
                                {destination !== 'SAVINGS' && (
                                    <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <p>This will permanently delete the Savings Transaction and its Journal Entry, moving the funds into the chosen module with a fresh Journal Entry.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <label className="text-xs font-medium text-slate-500">Amount (KES)</label>
                                <input
                                    type="number"
                                    value={newAmount}
                                    onChange={e => setNewAmount(e.target.value)}
                                    className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Reference</label>
                                <input
                                    type="text"
                                    value={newReference}
                                    onChange={e => setNewReference(e.target.value)}
                                    className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Reason (required, goes to audit log)</label>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={2}
                                    className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm resize-none"
                                />
                            </div>

                            {!editing.linkedToJournalEntry && destination === 'SAVINGS' && (
                                <p className="text-xs text-amber-600">
                                    No linked GL entry was found for this transaction's reference — changing the amount here will NOT touch any journal entry.
                                </p>
                            )}

                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60 mt-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin inline" /> : 'Save & Route Edit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricalEditPage;
