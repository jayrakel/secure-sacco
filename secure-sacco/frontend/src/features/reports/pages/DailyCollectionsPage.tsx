import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    reportApi,
    type DailyCollectionDTO,
    type PaymentLineDTO,
} from '../api/report-api';
import {
    ArrowLeft,
    Calendar,
    Download,
    RefreshCw,
    Loader2,
    Wallet,
    Smartphone,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toLocalDateStr = (d: Date) => d.toISOString().split('T')[0]; // YYYY-MM-DD

const fmtTime = (iso: string) => {
    try {
        return new Date(iso).toLocaleTimeString('en-KE', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch { return iso; }
};

const fmtDateLong = (iso: string) =>
    new Date(iso).toLocaleDateString('en-KE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

// ─── Channel / type visual config ────────────────────────────────────────────
const METHOD_STYLE: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    MPESA:         { bg: 'bg-green-50',  text: 'text-green-700',  icon: Smartphone  },
    BANK_TRANSFER: { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: CreditCard  },
};
const DEFAULT_METHOD = { bg: 'bg-slate-50', text: 'text-slate-600', icon: Wallet };

const TYPE_BADGE: Record<string, string> = {
    STK_PUSH: 'bg-green-100 text-green-800',
    C2B:      'bg-teal-100  text-teal-800',
    B2C:      'bg-indigo-100 text-indigo-800',
};
const DEFAULT_TYPE_BADGE = 'bg-slate-100 text-slate-600';

// ─── Component ────────────────────────────────────────────────────────────────
export const DailyCollectionsPage: React.FC = () => {
    const today = toLocalDateStr(new Date());

    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [summary, setSummary]           = useState<DailyCollectionDTO | null>(null);
    const [lines, setLines]               = useState<PaymentLineDTO[]>([]);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');

    // Drilldown filters
    const [channelFilter, setChannelFilter] = useState<string | null>(null);
    const [typeFilter, setTypeFilter]       = useState<string | null>(null);
    const [search, setSearch]               = useState('');

    // ── Fetch both summary + lines in parallel ────────────────────────────────
    const fetchData = useCallback(async (date: string) => {
        setLoading(true);
        setError('');
        setSummary(null);
        setLines([]);
        setChannelFilter(null);
        setTypeFilter(null);
        setSearch('');
        try {
            const [s, l] = await Promise.all([
                reportApi.getDailyCollections(date),
                reportApi.getDailyCollectionLines(date),
            ]);
            setSummary(s);
            setLines(l);
        } catch {
            setError('Failed to load collections data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(selectedDate); }, [selectedDate, fetchData]);

    // ── Date navigation helpers ───────────────────────────────────────────────
    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(toLocalDateStr(d));
    };

    // ── Filtered drilldown rows ───────────────────────────────────────────────
    const filteredLines = useMemo(() => {
        let rows = lines;
        if (channelFilter) rows = rows.filter(r => r.paymentMethod === channelFilter);
        if (typeFilter)    rows = rows.filter(r => r.paymentType    === typeFilter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            rows = rows.filter(r =>
                r.transactionRef?.toLowerCase().includes(q)   ||
                r.accountReference?.toLowerCase().includes(q) ||
                r.senderName?.toLowerCase().includes(q)       ||
                r.senderPhoneNumber?.toLowerCase().includes(q)
            );
        }
        return rows;
    }, [lines, channelFilter, typeFilter, search]);

    const filteredTotal = useMemo(
        () => filteredLines.reduce((s, r) => s + r.amount, 0),
        [filteredLines],
    );

    // ── CSV export ────────────────────────────────────────────────────────────
    const handleExport = () => {
        const header = 'Time,Transaction Ref,Account Ref,Sender Name,Phone,Channel,Type,Amount (KES)\n';
        const body = filteredLines.map(r =>
            `${fmtTime(r.createdAt)},${r.transactionRef ?? ''},${r.accountReference ?? ''},"${r.senderName ?? ''}",${r.senderPhoneNumber ?? ''},${r.paymentMethod},${r.paymentType},${r.amount}`
        ).join('\n');
        const blob = new Blob([header + body], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `Collections_${selectedDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/reports"
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={16} /> Reports
                    </Link>
                    <span className="text-slate-300">/</span>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Wallet className="text-emerald-600" size={22} />
                            Daily Collections
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            All completed incoming payments for a single calendar day.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    disabled={filteredLines.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors self-start sm:self-auto"
                >
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* ── Date picker row ──────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
                {/* Prev day */}
                <button
                    onClick={() => shiftDate(-1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                    title="Previous day"
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Date input */}
                <div className="relative flex items-center">
                    <Calendar size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                        type="date"
                        max={today}
                        value={selectedDate}
                        onChange={e => e.target.value && setSelectedDate(e.target.value)}
                        className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    />
                </div>

                {/* Next day */}
                <button
                    onClick={() => shiftDate(1)}
                    disabled={selectedDate >= today}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-30"
                    title="Next day"
                >
                    <ChevronRight size={18} />
                </button>

                {/* Today shortcut */}
                {selectedDate !== today && (
                    <button
                        onClick={() => setSelectedDate(today)}
                        className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                    >
                        Today
                    </button>
                )}

                {/* Date label */}
                {summary && (
                    <span className="text-sm text-slate-500 ml-1">
                        {fmtDateLong(selectedDate + 'T00:00:00')}
                    </span>
                )}

                {/* Refresh */}
                <button
                    onClick={() => fetchData(selectedDate)}
                    className="ml-auto p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500"
                    title="Refresh"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* ── Summary cards ────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="animate-spin mb-3 text-emerald-600" size={36} />
                    <p className="text-sm">Loading collections…</p>
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* Grand total card */}
                        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-md">
                            <div className="flex items-center gap-2 mb-3 opacity-80">
                                <Wallet size={16} />
                                <span className="text-sm font-semibold uppercase tracking-wider">Total Collected</span>
                            </div>
                            <div className="text-3xl font-bold tracking-tight">
                                KES {fmt(summary.totalCollected)}
                            </div>
                            <div className="text-sm opacity-70 mt-1">
                                {lines.length} transaction{lines.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* By Channel card — each channel is a clickable filter row */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4 text-slate-500">
                                <Smartphone size={16} />
                                <span className="text-sm font-bold uppercase tracking-wider">By Channel</span>
                            </div>
                            {Object.keys(summary.byChannel).length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No data</p>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(summary.byChannel).map(([ch, amt]) => {
                                        const style = METHOD_STYLE[ch] ?? DEFAULT_METHOD;
                                        const Icon  = style.icon;
                                        const isActive = channelFilter === ch;
                                        return (
                                            <button
                                                key={ch}
                                                onClick={() => setChannelFilter(isActive ? null : ch)}
                                                className={`
                                                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                                                    ${isActive
                                                    ? `${style.bg} ${style.text} ring-2 ring-current`
                                                    : 'hover:bg-slate-50 text-slate-700'}
                                                `}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon size={15} />
                                                    <span className="font-medium">{ch}</span>
                                                </div>
                                                <span className="font-bold tabular-nums">KES {fmt(amt)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* By Purpose/Type card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4 text-slate-500">
                                <CreditCard size={16} />
                                <span className="text-sm font-bold uppercase tracking-wider">By Purpose</span>
                            </div>
                            {Object.keys(summary.byType).length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No data</p>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(summary.byType).map(([tp, amt]) => {
                                        const badgeClass = TYPE_BADGE[tp] ?? DEFAULT_TYPE_BADGE;
                                        const isActive = typeFilter === tp;
                                        return (
                                            <button
                                                key={tp}
                                                onClick={() => setTypeFilter(isActive ? null : tp)}
                                                className={`
                                                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                                                    ${isActive ? 'bg-slate-100 ring-2 ring-slate-400' : 'hover:bg-slate-50'}
                                                `}
                                            >
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>
                                                    {tp}
                                                </span>
                                                <span className="font-bold text-slate-700 tabular-nums">KES {fmt(amt)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Active filter chips ────────────────────────────────── */}
                    {(channelFilter || typeFilter) && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-slate-500 font-medium">Filtering by:</span>
                            {channelFilter && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                    {channelFilter}
                                    <button onClick={() => setChannelFilter(null)} className="hover:opacity-70"><X size={12} /></button>
                                </span>
                            )}
                            {typeFilter && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full">
                                    {typeFilter}
                                    <button onClick={() => setTypeFilter(null)} className="hover:opacity-70"><X size={12} /></button>
                                </span>
                            )}
                            <button
                                onClick={() => { setChannelFilter(null); setTypeFilter(null); }}
                                className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                                Clear all
                            </button>
                        </div>
                    )}

                    {/* ── Drilldown table ────────────────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* Table toolbar */}
                        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Transaction Log</h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {filteredLines.length} of {lines.length} transactions
                                    {(channelFilter || typeFilter) && ' (filtered)'}
                                </p>
                            </div>
                            <div className="relative max-w-xs w-full sm:w-auto">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search ref, account, sender…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Ref</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Account Ref</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sender</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Channel</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (KES)</th>
                                </tr>
                                </thead>

                                <tbody className="bg-white divide-y divide-slate-50">
                                {filteredLines.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center">
                                                    <Wallet className="text-slate-300" size={26} />
                                                </div>
                                                <p className="text-slate-500 font-semibold text-sm">No transactions found</p>
                                                <p className="text-slate-400 text-xs">
                                                    {lines.length === 0
                                                        ? 'No completed payments were recorded for this date.'
                                                        : 'Try adjusting your filters.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLines.map((row) => {
                                        const methodStyle = METHOD_STYLE[row.paymentMethod] ?? DEFAULT_METHOD;
                                        const MethodIcon  = methodStyle.icon;
                                        const typeBadge   = TYPE_BADGE[row.paymentType] ?? DEFAULT_TYPE_BADGE;

                                        return (
                                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">

                                                {/* Time */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500">
                                                    {fmtTime(row.createdAt)}
                                                </td>

                                                {/* Transaction ref */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="text-xs font-mono font-semibold text-slate-700">
                                                            {row.transactionRef ?? <span className="text-slate-300 italic">pending</span>}
                                                        </span>
                                                </td>

                                                {/* Account ref */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-600">
                                                    {row.accountReference ?? '—'}
                                                </td>

                                                {/* Sender */}
                                                <td className="px-5 py-3.5">
                                                    <div className="text-xs font-medium text-slate-700">{row.senderName ?? '—'}</div>
                                                    {row.senderPhoneNumber && (
                                                        <div className="text-xs text-slate-400 font-mono">{row.senderPhoneNumber}</div>
                                                    )}
                                                </td>

                                                {/* Channel */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${methodStyle.bg} ${methodStyle.text}`}>
                                                            <MethodIcon size={11} />
                                                            {row.paymentMethod}
                                                        </span>
                                                </td>

                                                {/* Type */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${typeBadge}`}>
                                                            {row.paymentType}
                                                        </span>
                                                </td>

                                                {/* Amount */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                        <span className="text-sm font-bold text-emerald-700">
                                                            {fmt(row.amount)}
                                                        </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>

                                {/* Footer total */}
                                {filteredLines.length > 0 && (
                                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                    <tr>
                                        <td colSpan={6} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Subtotal ({filteredLines.length} transaction{filteredLines.length !== 1 ? 's' : ''})
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-emerald-700">
                                            {fmt(filteredTotal)}
                                        </td>
                                    </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </>
            ) : !error && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Wallet size={40} className="mb-3 text-slate-200" />
                    <p className="text-sm">Select a date above to load collections.</p>
                </div>
            )}
        </div>
    );
};