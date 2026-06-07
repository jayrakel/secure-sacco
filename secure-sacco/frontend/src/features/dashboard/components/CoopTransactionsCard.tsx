import React, { useState, useCallback, useEffect } from 'react';
import {
    RefreshCw, AlertCircle, ArrowDownLeft, ArrowUpRight,
    ChevronDown, ChevronUp, Building2, Phone, UserCheck, UserX, Link,
} from 'lucide-react';
import apiClient from '../../../shared/api/api-client';

interface CoopTransaction {
    id:               string;
    mpesaRef:         string | null;
    source:           'IPN' | 'STK_CALLBACK' | 'MINI_STATEMENT';
    transactionType:  'CR' | 'DR';
    amount:           number;
    runningBalance:   number | null;
    currency:         string;
    valueDate:        string | null;
    senderPhone:      string | null;
    senderName:       string | null;    // member full name — null if not a member
    isMember:         boolean;
    displayNarration: string | null;
    accountReference: string | null;
    savingsCredited:  boolean;
}

interface FeedResponse {
    transactions:  CoopTransaction[];
    totalElements: number;
    totalPages:    number;
    currentPage:   number;
}

export const CoopTransactionsCard: React.FC = () => {
    const [data, setData]               = useState<FeedResponse | null>(null);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [expanded, setExpanded]       = useState(true);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);
    const [reEnriching, setReEnriching] = useState(false);
    const [reEnrichMsg, setReEnrichMsg] = useState<string | null>(null);

    const fmt = (val: number | null | undefined) => {
        if (val == null) return '0.00';
        return new Intl.NumberFormat('en-KE', {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        }).format(val);
    };

    const fmtDate = (dt: string | null) => {
        if (!dt) return '—';
        try {
            return new Date(dt).toLocaleDateString('en-KE', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return dt; }
    };

    const sourceLabel = (src: string) => {
        if (src === 'IPN')           return 'Paybill';
        if (src === 'STK_CALLBACK')  return 'STK';
        if (src === 'MINI_STATEMENT') return 'Bank';
        return src;
    };

    const fetchFeed = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get<FeedResponse>('/payments/coop/feed?size=20');
            setData(res.data);
            setLastFetched(new Date());
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Failed to load transactions';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleReEnrich = useCallback(async () => {
        setReEnriching(true);
        setReEnrichMsg(null);
        try {
            const res = await apiClient.post<{ message: string; matched: number }>(
                '/payments/coop/re-enrich'
            );
            setReEnrichMsg(res.data.message);
            // Refresh the feed so newly matched names appear immediately
            await fetchFeed();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Re-match failed';
            setReEnrichMsg(`Error: ${msg}`);
        } finally {
            setReEnriching(false);
            // Clear the status message after 4 seconds
            setTimeout(() => setReEnrichMsg(null), 4000);
        }
    }, [fetchFeed]);

    useEffect(() => { fetchFeed(); }, [fetchFeed]);

    const transactions = data?.transactions ?? [];
    const credits  = transactions.filter(t => t.transactionType === 'CR');
    const debits   = transactions.filter(t => t.transactionType === 'DR');
    const totalIn  = credits.reduce((s, t) => s + (t.amount || 0), 0);
    const totalOut = debits.reduce((s, t) => s + (t.amount || 0), 0);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Building2 size={15} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Co-op Transactions</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            IPN · STK · Mini-statement · {data?.totalElements ?? 0} total
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Re-match unmatched transactions */}
                    <button
                        onClick={handleReEnrich}
                        disabled={reEnriching || loading}
                        title="Re-match unmatched phone numbers to members"
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition text-slate-400 hover:text-blue-500 disabled:opacity-40"
                    >
                        <Link size={14} className={reEnriching ? 'animate-pulse' : ''} />
                    </button>
                    <button onClick={fetchFeed} disabled={loading} title="Refresh"
                            className="p-1.5 hover:bg-slate-50 rounded-lg transition text-slate-400 disabled:opacity-40">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setExpanded(e => !e)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg transition text-slate-400">
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Re-enrich status message */}
            {reEnrichMsg && (
                <div className={`flex items-center gap-2 px-5 py-2.5 border-b text-xs
                    ${reEnrichMsg.startsWith('Error')
                        ? 'bg-rose-50 border-rose-100 text-rose-600'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                    <Link size={11} className="flex-shrink-0" />
                    {reEnrichMsg}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 px-5 py-3 bg-rose-50 border-b border-rose-100">
                    <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                    <p className="text-xs text-rose-600 flex-1">{error}</p>
                    <button onClick={fetchFeed} className="text-xs text-rose-600 underline flex-shrink-0">Retry</button>
                </div>
            )}

            {/* Loading */}
            {loading && !data && (
                <div className="px-5 py-4 space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 bg-slate-100 rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-slate-100 rounded w-2/3" />
                                <div className="h-2 bg-slate-100 rounded w-1/3" />
                            </div>
                            <div className="h-3 bg-slate-100 rounded w-20" />
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            {data && expanded && !loading && (
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="px-4 py-3 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Transactions</p>
                        <p className="text-sm font-bold text-slate-800">{transactions.length}</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <p className="text-[10px] text-emerald-500 uppercase tracking-wide mb-0.5">Total In</p>
                        <p className="text-sm font-bold text-emerald-600">KES {fmt(totalIn)}</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <p className="text-[10px] text-rose-400 uppercase tracking-wide mb-0.5">Total Out</p>
                        <p className="text-sm font-bold text-rose-500">KES {fmt(totalOut)}</p>
                    </div>
                </div>
            )}

            {/* Transaction list */}
            {data && expanded && !loading && (
                <div className="divide-y divide-slate-50 max-h-[440px] overflow-y-auto">
                    {transactions.length === 0 ? (
                        <div className="py-10 text-center">
                            <Building2 size={28} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">No transactions yet.</p>
                        </div>
                    ) : (
                        transactions.map((t) => {
                            const isCr = t.transactionType === 'CR';
                            return (
                                <div key={t.id}
                                     className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition">

                                    {/* Direction icon */}
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                                        ${isCr ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                        {isCr
                                            ? <ArrowDownLeft size={14} className="text-emerald-500" />
                                            : <ArrowUpRight  size={14} className="text-rose-400"    />
                                        }
                                    </div>

                                    {/* Name + meta */}
                                    <div className="flex-1 min-w-0">
                                        {/* Name row */}
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {t.senderName || t.displayNarration || '—'}
                                            </p>
                                            {t.senderPhone && (
                                                t.isMember
                                                    ? <UserCheck size={11} className="text-emerald-500 flex-shrink-0" />
                                                    : <UserX     size={11} className="text-slate-300   flex-shrink-0" />
                                            )}
                                        </div>
                                        {/* Phone row */}
                                        {t.senderPhone && (
                                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                <Phone size={9} />
                                                {t.senderPhone}
                                                {!t.isMember && (
                                                    <span className="text-slate-300 italic"> · not a member</span>
                                                )}
                                            </p>
                                        )}
                                        {/* Date + ref + source */}
                                        <p className="text-[10px] text-slate-300 mt-0.5 font-mono">
                                            {fmtDate(t.valueDate)}
                                            {t.mpesaRef ? ` · ${t.mpesaRef}` : ''}
                                            {' · '}
                                            <span className="text-slate-400">{sourceLabel(t.source)}</span>
                                        </p>
                                    </div>

                                    {/* Amount + balance */}
                                    <div className="text-right flex-shrink-0">
                                        <p className={`text-sm font-bold ${isCr ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {isCr ? '+' : '-'}KES {fmt(t.amount)}
                                        </p>
                                        {t.runningBalance != null && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Bal: {fmt(t.runningBalance)}
                                            </p>
                                        )}
                                        {isCr && t.savingsCredited && (
                                            <p className="text-[10px] text-emerald-500 mt-0.5">✓ credited</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {lastFetched && (
                <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 text-center">
                        Updated {lastFetched.toLocaleTimeString('en-KE', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                    </p>
                </div>
            )}
        </div>
    );
};