import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, History, RefreshCw } from 'lucide-react';
import {
    obligationsApi,
    type ObligationResponse,
    type ObligationPeriodResponse,
    type PagedResponse,
} from '../api/obligation-api';
import { ObligationStatusCard } from './ObligationStatusCard';
import { ObligationHistoryTable } from './ObligationHistoryTable';

export const MemberObligationsSection: React.FC = () => {
    const [obligations, setObligations] = useState<ObligationResponse[]>([]);
    const [history,     setHistory]     = useState<PagedResponse<ObligationPeriodResponse> | null>(null);
    const [histPage,    setHistPage]    = useState(0);
    const [loadingObl,  setLoadingObl]  = useState(true);
    const [loadingHist, setLoadingHist] = useState(true);
    const [error,       setError]       = useState<string | null>(null);

    const fetchObligations = useCallback(async () => {
        setLoadingObl(true);
        try {
            setObligations(await obligationsApi.getMyObligations());
        } catch {
            setError('Failed to load obligations.');
        } finally {
            setLoadingObl(false);
        }
    }, []);

    const fetchHistory = useCallback(async (p: number) => {
        setLoadingHist(true);
        try {
            setHistory(await obligationsApi.getMyHistory(p, 10));
        } catch {
            // history section shows empty state
        } finally {
            setLoadingHist(false);
        }
    }, []);

    useEffect(() => { fetchObligations(); }, [fetchObligations]);
    useEffect(() => { fetchHistory(histPage); }, [fetchHistory, histPage]);

    // Called when a penalty payment succeeds — refresh both panels
    const handlePaid = () => {
        fetchObligations();
        fetchHistory(histPage);
    };

    return (
        <div className="space-y-6">
            {/* ── Current obligations ─────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-600" />
                        <h2 className="text-base font-semibold text-slate-800">My Savings Obligations</h2>
                    </div>
                    <button onClick={fetchObligations}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
                        <RefreshCw size={13} className={loadingObl ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                {loadingObl ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(i => <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />)}
                    </div>
                ) : obligations.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
                        <ShieldCheck size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">
                            No savings obligation has been set for your account.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {obligations.map(o => (
                            <ObligationStatusCard key={o.id} obligation={o} onPaid={handlePaid} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Period history ───────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <History size={18} className="text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-800">Obligation History</h2>
                </div>
                <ObligationHistoryTable
                    data={history}
                    loading={loadingHist}
                    page={histPage}
                    onPageChange={setHistPage}
                    onPaid={handlePaid}
                />
            </div>
        </div>
    );
};