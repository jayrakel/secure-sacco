import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheck, Plus, Play, AlertTriangle, CheckCircle2, Clock,
    ChevronLeft, ChevronRight, RefreshCw, Search, Loader2, Pencil,
} from 'lucide-react';
import {
    obligationsApi,
    type ObligationComplianceEntry,
    type ObligationResponse,
    type PagedResponse,
    type ObligationFrequency,
    type PeriodStatus,
} from '../api/obligation-api';
import { CreateObligationModal } from '../components/CreateObligationModal';
import { EditObligationModal } from '../components/EditObligationModal';

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: PeriodStatus }> = ({ status }) => {
    const map: Record<PeriodStatus, { cls: string; icon: React.ReactNode; label: string }> = {
        OVERDUE: { cls: 'bg-red-50 border-red-200 text-red-700',            icon: <AlertTriangle size={11} />, label: 'Overdue' },
        DUE:     { cls: 'bg-amber-50 border-amber-200 text-amber-700',      icon: <Clock size={11} />,         label: 'Due'     },
        COVERED: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-700',icon: <CheckCircle2 size={11} />,  label: 'Covered' },
    };
    const s = map[status];
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
            {s.icon} {s.label}
        </span>
    );
};

const FreqBadge: React.FC<{ freq: ObligationFrequency }> = ({ freq }) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full
        ${freq === 'WEEKLY' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
        {freq === 'WEEKLY' ? 'Weekly' : 'Monthly'}
    </span>
);

const SummaryCard: React.FC<{ label: string; value: string; color: 'slate' | 'red' | 'amber' }> = ({ label, value, color }) => {
    const s = {
        slate: { card: 'border-slate-200 bg-white',    text: 'text-slate-800' },
        red:   { card: 'border-red-200 bg-red-50',     text: 'text-red-800'   },
        amber: { card: 'border-amber-200 bg-amber-50', text: 'text-amber-800' },
    }[color];
    return (
        <div className={`rounded-xl border p-5 ${s.card}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${s.text}`}>{value}</p>
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ObligationsCompliancePage: React.FC = () => {
    const [data, setData]               = useState<PagedResponse<ObligationComplianceEntry> | null>(null);
    const [page, setPage]               = useState(0);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [evalLoading, setEvalLoading] = useState(false);
    const [evalMsg, setEvalMsg]         = useState<string | null>(null);
    const [confirmEval, setConfirmEval] = useState(false);

    // ── Edit state ────────────────────────────────────────────────────────────
    const [editTarget, setEditTarget]       = useState<ObligationResponse | null>(null);
    const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        try   { setData(await obligationsApi.getComplianceReport(p, 20)); }
        catch { /* empty state shown */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page); }, [load, page]);

    const handleEvaluate = async () => {
        setEvalLoading(true);
        setConfirmEval(false);
        setEvalMsg(null);
        try {
            await obligationsApi.triggerEvaluation();
            setEvalMsg('✓ Evaluation triggered. Refresh to see updated periods.');
            load(page);
        } catch {
            setEvalMsg('Failed to trigger evaluation. Please try again.');
        } finally {
            setEvalLoading(false);
        }
    };

    const handleEditClick = async (entry: ObligationComplianceEntry) => {
        setLoadingEditId(entry.memberId);
        try {
            const obligations = await obligationsApi.getObligationsByMemberId(entry.memberId);
            const active = obligations.find(o => o.status === 'ACTIVE') ?? obligations[0];
            if (active) setEditTarget(active);
        } catch { /* no-op */ }
        finally { setLoadingEditId(null); }
    };

    const handleEditSuccess = (updated: ObligationResponse) => {
        setEditTarget(null);
        // Optimistically update the row's amount
        setData(prev => prev ? {
            ...prev,
            content: prev.content.map(e =>
                e.memberId === updated.memberId ? { ...e, amountDue: updated.amountDue } : e
            ),
        } : prev);
    };

    const filtered = (data?.content ?? []).filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return e.memberName.toLowerCase().includes(q) || e.memberNumber.toLowerCase().includes(q);
    });

    const totalOverdue   = (data?.content ?? []).reduce((s, e) => s + e.totalOverduePeriods, 0);
    const totalShortfall = (data?.content ?? []).reduce((s, e) => s + e.totalShortfall, 0);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" size={24} /> Savings Compliance
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Members behind on their required savings obligations.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setConfirmEval(true)} disabled={evalLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                        {evalLoading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                        Run Evaluation
                    </button>
                    <button onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Plus size={15} /> New Obligation
                    </button>
                </div>
            </div>

            {/* Eval feedback */}
            {evalMsg && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm border
                    ${evalMsg.startsWith('✓') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {evalMsg}
                </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard label="Total Members"   value={String(data?.totalElements ?? 0)} color="slate" />
                <SummaryCard label="Overdue Periods" value={String(totalOverdue)}              color={totalOverdue > 0 ? 'red' : 'slate'} />
                <SummaryCard label="Total Shortfall" value={`KES ${totalShortfall.toLocaleString()}`} color={totalShortfall > 0 ? 'amber' : 'slate'} />
            </div>

            {/* Table card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                {/* Search */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search member name or number…" value={search}
                               onChange={e => setSearch(e.target.value)}
                               className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>
                    <button onClick={() => load(page)} className="text-slate-500 hover:text-slate-700 p-1.5 transition-colors">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Body */}
                {loading ? (
                    <div className="space-y-2 p-4 animate-pulse">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <ShieldCheck size={36} className="text-slate-200 mx-auto mb-3" />
                        <p className="font-medium">No obligations found</p>
                        <p className="text-xs text-slate-400 mt-1">Assign an obligation to a member to track compliance here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-left">Member</th>
                                <th className="px-4 py-3 text-left">Frequency</th>
                                <th className="px-4 py-3 text-right">Required / Period</th>
                                <th className="px-4 py-3 text-center">Overdue Periods</th>
                                <th className="px-4 py-3 text-right">Total Shortfall</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">Edit</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {filtered.map(entry => (
                                <tr key={entry.memberId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-800">{entry.memberName}</p>
                                        <p className="text-xs text-slate-500">{entry.memberNumber}</p>
                                    </td>
                                    <td className="px-4 py-3"><FreqBadge freq={entry.frequency} /></td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                                        KES {entry.amountDue.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {entry.totalOverduePeriods > 0 ? (
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                    {entry.totalOverduePeriods}
                                                </span>
                                        ) : <span className="text-slate-300 text-xs">0</span>}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-semibold ${entry.totalShortfall > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                        {entry.totalShortfall > 0 ? `KES ${entry.totalShortfall.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={entry.worstStatus} />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleEditClick(entry)}
                                            disabled={loadingEditId === entry.memberId}
                                            title="Edit obligation"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200
                                                           bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300
                                                           transition-all disabled:opacity-40"
                                        >
                                            {loadingEditId === entry.memberId
                                                ? <Loader2 size={13} className="animate-spin" />
                                                : <Pencil size={13} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {(data?.totalPages ?? 0) > 1 && (
                    <div className="flex justify-between items-center px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
                        <span>{page * 20 + 1}–{Math.min((page + 1) * 20, data!.totalElements)} of {data!.totalElements}</span>
                        <div className="flex items-center gap-2">
                            <button disabled={data!.first} onClick={() => setPage(p => p - 1)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronLeft size={15} />
                            </button>
                            <span className="text-xs">{page + 1} / {data!.totalPages}</span>
                            <button disabled={data!.last} onClick={() => setPage(p => p + 1)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm evaluate modal */}
            {confirmEval && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <h3 className="font-semibold text-slate-900">Run Evaluation Now?</h3>
                        <p className="text-sm text-slate-500">
                            This will evaluate all active obligations right now — marking overdue periods and
                            creating penalties for any missed contributions.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmEval(false)}
                                    className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button onClick={handleEvaluate}
                                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2">
                                <Play size={14} /> Run Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CreateObligationModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => { setIsCreateOpen(false); load(0); setPage(0); }}
            />

            <EditObligationModal
                obligation={editTarget}
                isOpen={editTarget !== null}
                onClose={() => setEditTarget(null)}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default ObligationsCompliancePage;