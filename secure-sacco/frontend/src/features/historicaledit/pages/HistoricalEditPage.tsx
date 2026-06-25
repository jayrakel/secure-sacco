// SAC-269: TEMPORARY — for migration verification only. Delete this whole
// page (and the matching backend module) before go-live. See V92 migration
// comment for the full rationale.
import React, { useState } from 'react';
import {
    Search, AlertTriangle, Loader2, PencilLine, X, CheckCircle2,
} from 'lucide-react';
import { memberApi } from '../../members/api/member-api';
import type { Member } from '../../members/api/member-api';
import { historicalEditApi } from '../api/historical-edit-api';
import type { HistoricalTransactionItem, EditTransactionResponse } from '../api/historical-edit-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export const HistoricalEditPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [memberResults, setMemberResults] = useState<Member[]>([]);
    const [member, setMember] = useState<Member | null>(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [transactions, setTransactions] = useState<HistoricalTransactionItem[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [editing, setEditing] = useState<HistoricalTransactionItem | null>(null);
    const [newAmount, setNewAmount] = useState('');
    const [newReference, setNewReference] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [lastResult, setLastResult] = useState<EditTransactionResponse | null>(null);

    const searchMembers = async (q: string) => {
        setSearch(q);
        if (q.trim().length < 2) { setMemberResults([]); return; }
        try {
            const page = await memberApi.getMembers(q.trim(), undefined, 0, 8);
            setMemberResults(page.content);
        } catch {
            setMemberResults([]);
        }
    };

    const selectMember = async (m: Member) => {
        setMember(m);
        setMemberResults([]);
        setSearch('');
        await loadTransactions(m.id);
    };

    const loadTransactions = async (memberId: string) => {
        setLoading(true);
        setError('');
        try {
            const txns = await historicalEditApi.search(memberId, from || undefined, to || undefined);
            setTransactions(txns);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not load transactions.'));
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (t: HistoricalTransactionItem) => {
        setEditing(t);
        setNewAmount(String(t.amount));
        setNewReference(t.reference);
        setReason('');
        setLastResult(null);
    };

    const saveEdit = async () => {
        if (!editing) return;
        if (!reason.trim()) { setError('A reason is required.'); return; }
        setSaving(true);
        setError('');
        try {
            const res = await historicalEditApi.edit({
                transactionId: editing.transactionId,
                newAmount: parseFloat(newAmount) !== editing.amount ? parseFloat(newAmount) : null,
                newReference: newReference !== editing.reference ? newReference : null,
                reason,
            });
            setLastResult(res);
            setEditing(null);
            if (member) await loadTransactions(member.id);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not save this edit.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-amber-800">Temporary Tool — Migration Verification Only</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                        Every edit here is written to the security audit log and requires a reason. This tool will be
                        removed entirely once historical data is fully verified and the system goes live.
                    </p>
                </div>
            </div>

            <h1 className="text-xl font-bold text-slate-800 mb-1">Historical Transaction Editor</h1>
            <p className="text-sm text-slate-500 mb-5">Find and correct a specific savings transaction from migration or any past period.</p>

            {!member && (
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => searchMembers(e.target.value)}
                        placeholder="Search member by name or number…"
                        className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm"
                    />
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

                    {error && <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

                    {lastResult && (
                        <div className="mb-3 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm flex items-start gap-2">
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                            <span>{lastResult.message}</span>
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800">Edit Transaction</h3>
                            <button onClick={() => setEditing(null)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
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

                            {!editing.linkedToJournalEntry && (
                                <p className="text-xs text-amber-600">
                                    No linked GL entry was found for this transaction's reference — changing the amount here will NOT touch any journal entry.
                                </p>
                            )}

                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin inline" /> : 'Save Edit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricalEditPage;