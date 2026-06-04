import React, { useState, useCallback, useEffect } from 'react';
import {
    RefreshCw, AlertCircle, ArrowDownLeft, ArrowUpRight,
    ChevronDown, ChevronUp, Building2, Phone
} from 'lucide-react';
import apiClient from '../../../shared/api/api-client';

interface TransactionEntry {
    transactionId:   string;
    transactionDate: string;
    valueDate:       string;
    narration:       string;    // parsed display name (e.g. "BETTER LINK VENTURES SACCO")
    rawNarration:    string;    // full original narration from Co-op
    transactionType: 'CR' | 'DR';
    amount:          string;
    runningBalance:  string | null;
    reference:       string | null;
    senderPhone:     string | null;
}

interface MiniStatementData {
    messageCode:        string;
    messageDescription: string;
    accountNumber:      string;
    accountName:        string;
    currency:           string;
    transactions:       TransactionEntry[];
}

export const CoopTransactionsCard: React.FC = () => {
    const [data, setData]           = useState<MiniStatementData | null>(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [expanded, setExpanded]   = useState(true);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const fmt = (val: string | null | undefined) => {
        if (!val) return '0.00';
        const n = parseFloat(val);
        return isNaN(n) ? val : new Intl.NumberFormat('en-KE', {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        }).format(n);
    };

    const fetchStatement = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get<MiniStatementData>('/payments/coop/mini-statement');
            setData(res.data);
            setLastFetched(new Date());
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Failed to fetch from Co-op Bank';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStatement(); }, [fetchStatement]);

    const transactions = data?.transactions ?? [];
    const credits  = transactions.filter(t => t.transactionType === 'CR');
    const debits   = transactions.filter(t => t.transactionType === 'DR');
    const totalIn  = credits.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalOut = debits.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const fmtDate = (dt: string) => {
        try {
            return new Date(dt).toLocaleDateString('en-KE', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dt; }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                        <Building2 size={14} className="text-blue-600" />
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-slate-800">
                            Co-op Mini Statement
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            Last 10 transactions · Live from Co-op Bank
                            {data?.accountNumber && ` · Acct ${data.accountNumber}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchStatement} disabled={loading} title="Refresh"
                            className="p-1.5 hover:bg-slate-50 rounded-lg transition text-slate-400 disabled:opacity-40">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setExpanded(e => !e)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg transition text-slate-400">
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 px-5 py-3 bg-red-50">
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 flex-1">{error}</p>
                    <button onClick={fetchStatement} className="text-xs text-red-600 underline shrink-0">
                        Retry
                    </button>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && !data && (
                <div className="px-5 py-4 space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-slate-100 rounded w-2/3" />
                                <div className="h-2 bg-slate-100 rounded w-1/3" />
                            </div>
                            <div className="space-y-1.5 text-right">
                                <div className="h-3 bg-slate-100 rounded w-20" />
                                <div className="h-2 bg-slate-100 rounded w-16" />
                            </div>
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
                        <p className="text-sm font-bold text-emerald-600">KES {fmt(totalIn.toFixed(2))}</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <p className="text-[10px] text-red-400 uppercase tracking-wide mb-0.5">Total Out</p>
                        <p className="text-sm font-bold text-red-500">KES {fmt(totalOut.toFixed(2))}</p>
                    </div>
                </div>
            )}

            {/* Transaction list */}
            {data && expanded && !loading && (
                <div className="divide-y divide-slate-50 max-h-[440px] overflow-y-auto">
                    {transactions.length === 0 ? (
                        <div className="py-10 text-center">
                            <Building2 size={28} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">No recent transactions.</p>
                        </div>
                    ) : (
                        transactions.map((t, i) => {
                            const isCr = t.transactionType === 'CR';
                            return (
                                <div key={t.transactionId ?? i}
                                     className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition">

                                    {/* Icon */}
                                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                        isCr ? 'bg-emerald-50' : 'bg-red-50'
                                    }`}>
                                        {isCr
                                            ? <ArrowDownLeft size={13} className="text-emerald-500" />
                                            : <ArrowUpRight size={13} className="text-red-400" />
                                        }
                                    </div>

                                    {/* Narration + meta */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-800 truncate">
                                            {t.narration || '—'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {fmtDate(t.valueDate || t.transactionDate)}
                                        </p>
                                        {t.senderPhone && (
                                            <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                                <Phone size={9} />
                                                {t.senderPhone}
                                            </p>
                                        )}
                                        {t.reference && (
                                            <p className="text-[10px] text-slate-300 mt-0.5 font-mono">
                                                {t.reference}
                                            </p>
                                        )}
                                    </div>

                                    {/* Amount + running balance */}
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-bold ${
                                            isCr ? 'text-emerald-600' : 'text-red-500'
                                        }`}>
                                            {isCr ? '+' : '-'}KES {fmt(t.amount)}
                                        </p>
                                        {t.runningBalance && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Bal: {fmt(t.runningBalance)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Footer */}
            {lastFetched && (
                <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 text-center">
                        Updated {lastFetched.toLocaleTimeString('en-KE', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                    </p>
                </div>
            )}
        </div>
    );
};