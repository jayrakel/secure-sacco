import React, { useState, useCallback } from 'react';
import { RefreshCw, AlertCircle, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '../../../shared/api/api-client';
import { format, subDays } from 'date-fns';

interface Transaction {
    transactionId: string;
    transactionDate: string;
    narration: string;
    transactionType: string; // CR = credit (in), DR = debit (out)
    amount: string;
    currency: string;
    senderName: string;
    senderPhone: string;
    paymentMethod: string;
    paymentRef: string;
}

interface TransactionResponse {
    messageCode: string;
    messageDescription: string;
    source: string;
    totalElements: number;
    totalPages: number;
    currentPage: number;
    transactions: Transaction[];
}

/**
 * Co-op Bank account transaction history card.
 * Shows recent transactions with date range picker.
 * Place in UnifiedStaffDashboard below CoopAccountBalanceCard.
 */
export const CoopTransactionsCard: React.FC = () => {
    const [data, setData]           = useState<TransactionResponse | null>(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [expanded, setExpanded]   = useState(false);
    const [fromDate, setFromDate]   = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [toDate, setToDate]       = useState(format(new Date(), 'yyyy-MM-dd'));
    const [fetched, setFetched]     = useState(false);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get<TransactionResponse>(
                `/payments/coop/transactions?fromDate=${fromDate}&toDate=${toDate}`
            );
            setData(res.data);
            setFetched(true);
            setExpanded(true);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Failed to fetch transactions';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    const fmt = (val: string) => {
        const n = parseFloat(val);
        return isNaN(n) ? val : new Intl.NumberFormat('en-KE', {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        }).format(n);
    };

    const transactions = data?.transactions ?? [];
    const credits  = transactions.filter(t => t.transactionType === 'CR');
    const debits   = transactions.filter(t => t.transactionType === 'DR');
    const totalIn  = credits.reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0);
    const totalOut = debits.reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                        <ArrowDownLeft size={14} className="text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Co-op Account Transactions</span>
                </div>
                <button onClick={() => setExpanded(e => !e)}
                        className="p-1.5 hover:bg-slate-50 rounded-lg transition text-slate-400">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {/* Date range picker + fetch button */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">From</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                           className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">To</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                           max={format(new Date(), 'yyyy-MM-dd')}
                           className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <button onClick={fetchTransactions} disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Fetching…' : fetched ? 'Refresh' : 'Fetch'}
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{error}</p>
                </div>
            )}

            {/* Summary strip */}
            {fetched && !error && expanded && (
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
            {expanded && fetched && !error && (
                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                    {transactions.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-slate-400">No payments received in this period.</p>
                        </div>
                    ) : (
                        transactions.map((t, i) => {
                            const isCr = t.transactionType === 'CR';
                            return (
                                <div key={t.transactionId ?? i}
                                     className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                                    {/* Icon */}
                                    <div className={`p-1.5 rounded-lg shrink-0 ${isCr ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                        {isCr
                                            ? <ArrowDownLeft size={13} className="text-emerald-500" />
                                            : <ArrowUpRight size={13} className="text-red-400" />
                                        }
                                    </div>

                                    {/* Narration + date */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-800 truncate">{t.narration}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {t.transactionDate} {t.paymentRef ? `· Ref: ${t.paymentRef}` : ''}
                                        </p>
                                    </div>

                                    {/* Amount + balance */}
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-bold ${isCr ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {isCr ? '+' : '-'}KES {fmt(t.amount)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {t.senderName ?? t.paymentMethod ?? ''}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Not yet fetched state */}
            {!fetched && !loading && !error && (
                <div className="py-8 text-center px-5">
                    <p className="text-sm text-slate-400">Select a date range and click Fetch to load payment history.</p>
                </div>
            )}
        </div>
    );
};