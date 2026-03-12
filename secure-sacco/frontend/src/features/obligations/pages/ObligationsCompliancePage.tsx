import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Play, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight, RefreshCw, Search, Loader2, X } from 'lucide-react';
// import { format } from 'date-fns';
import { obligationsApi, type ObligationComplianceEntry, type PagedResponse, type ObligationFrequency, type PeriodStatus } from '../api/obligation-api';
import { CreateObligationModal } from '../components/CreateObligationModal';

// ── Tiny sub-components ────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: PeriodStatus; count?: number }> = ({ status, count }) => {
    const map: Record<PeriodStatus, { cls: string; icon: React.ReactNode; label: string }> = {
        OVERDUE: { cls: 'bg-red-50 border-red-200 text-red-700',       icon: <AlertTriangle size={11} />, label: 'Overdue' },
        DUE:     { cls: 'bg-amber-50 border-amber-200 text-amber-700', icon: <Clock size={11} />,         label: 'Due'     },
        COVERED: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <CheckCircle2 size={11} />, label: 'Covered' },
    };
    const s = map[status];
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
            {s.icon} {s.label}{count !== undefined ? ` (${count})` : ''}
        </span>
    );
};

const FreqBadge: React.FC<{ freq: ObligationFrequency }> = ({ freq }) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${freq === 'WEEKLY' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
        {freq === 'WEEKLY' ? 'Weekly' : 'Monthly'}
    </span>
);

// ── Main page ──────────────────────────────────────────────────────────────────

const ObligationsCompliancePage: React.FC = () => {
    const [data, setData]               = useState<PagedResponse<ObligationComplianceEntry> | null>(null);
    const [page, setPage]               = useState(0);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [evalLoading, setEvalLoading] = useState(false);
    const [evalMsg, setEvalMsg]         = useState<string | null>(null);
    const [confirmEval, setConfirmEval] = useState(false);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await obligationsApi.getComplianceReport(p, 20);
            setData(res);
        } catch {
            // show error state handled by empty data
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page); }, [load, page]);

    const handleEvaluate = async () => {
        setEvalLoading(true);
        setConfirmEval(false);
        setEvalMsg(null);
        try {
            await obligationsApi.triggerEvaluation();
            setEvalMsg('✓ Evaluation triggered successfully. Refresh to see updated periods.');
            load(page);
        } catch {
            setEvalMsg('Failed to trigger evaluation. Please try again.');
        } finally {
            setEvalLoading(false);
        }
    };

    // Client-side search filter on the current page
    const filtered = (data?.content ?? []).filter(entry => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            entry.memberName.toLowerCase().includes(q) ||
            entry.memberNumber.toLowerCase().includes(q)
        );
    });

    const totalOverdue   = data?.content.reduce((s, e) => s + e.totalOverduePeriods, 0) ?? 0;
    const totalShortfall = data?.content.reduce((s, e) => s + e.totalShortfall, 0) ?? 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" size={24} />
                        Savings Compliance
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Members behind on their required savings obligations.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setConfirmEval(true)}
                        disabled={evalLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                    >
                        {evalLoading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                        Run Evaluation
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Plus size={15} /> Assign Obligation
                    </button>
                </div>
            </div>

            {/* Eval feedback */}
            {evalMsg && (
                <div className={`text-sm rounded-lg px-4 py-3 border ${evalMsg.startsWith('✓') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {evalMsg}
                    <button onClick={() => setEvalMsg(null)} className="float-right opacity-60 hover:opacity-100"><X size={14} /></button>
                </div>
            )}

            {/* Summary row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                    label="Total Members Tracked"
                    value={data?.totalElements?.toString() ?? '—'}
                    color="slate"
                />
                <SummaryCard
                    label="Total Overdue Periods"
                    value={totalOverdue.toString()}
                    color="red"
                />
                <SummaryCard
                    label="Total Shortfall"
                    value={`KES ${totalShortfall.toLocaleString()}`}
                    color="amber"
                />
            </div>

            {/* Search + table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search member name or number…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <button onClick={() => load(page)} className="text-slate-500 hover:text-slate-700 transition-colors p-1.5">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

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
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {filtered.map(entry => (
                                <tr key={entry.memberId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-800">{entry.memberName}</p>
                                        <p className="text-xs text-slate-500">{entry.memberNumber}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <FreqBadge freq={entry.frequency} />
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                                        KES {entry.amountDue.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {entry.totalOverduePeriods > 0 ? (
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                    {entry.totalOverduePeriods}
                                                </span>
                                        ) : (
                                            <span className="text-slate-300 text-xs">0</span>
                                        )}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-semibold ${entry.totalShortfall > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                        {entry.totalShortfall > 0 ? `KES ${entry.totalShortfall.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={entry.worstStatus} />
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
                        <span>
                            {page * 20 + 1}–{Math.min((page + 1) * 20, data!.totalElements)} of {data!.totalElements}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={data!.first}
                                onClick={() => setPage(p => p - 1)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <span className="text-xs">{page + 1} / {data!.totalPages}</span>
                            <button
                                disabled={data!.last}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
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
                            This will evaluate all active obligations right now — marking overdue periods and creating penalties for any missed contributions.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmEval(false)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button onClick={handleEvaluate} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2">
                                <Play size={14} /> Run Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreateObligationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => { setIsModalOpen(false); load(0); setPage(0); }}
            />
        </div>
    );
};

// ── Summary card helper ────────────────────────────────────────────────────────

const SummaryCard: React.FC<{ label: string; value: string; color: 'slate' | 'red' | 'amber' }> = ({ label, value, color }) => {
    const colors = {
        slate: 'border-slate-200 bg-white',
        red:   'border-red-200 bg-red-50',
        amber: 'border-amber-200 bg-amber-50',
    };
    const textColors = {
        slate: 'text-slate-800',
        red:   'text-red-800',
        amber: 'text-amber-800',
    };
    return (
        <div className={`rounded-xl border p-5 ${colors[color]}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
        </div>
    );
};


export default ObligationsCompliancePage;