import React, { useState, useEffect, useMemo } from 'react';
import { accountingApi, type TrialBalanceLine, type TrialBalanceResponse } from '../api/accounting-api';
import { Scale, Download, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

const TYPE_STYLES: Record<string, { badge: string; header: string }> = {
    ASSET:    { badge: 'bg-blue-100 text-blue-800',    header: 'bg-blue-50 border-blue-200' },
    LIABILITY:{ badge: 'bg-orange-100 text-orange-800',header: 'bg-orange-50 border-orange-200' },
    EQUITY:   { badge: 'bg-purple-100 text-purple-800',header: 'bg-purple-50 border-purple-200' },
    REVENUE:  { badge: 'bg-emerald-100 text-emerald-800', header: 'bg-emerald-50 border-emerald-200' },
    EXPENSE:  { badge: 'bg-red-100 text-red-800',      header: 'bg-red-50 border-red-200' },
};

const groupByType = (lines: TrialBalanceLine[]) => {
    const groups: Record<string, TrialBalanceLine[]> = {};
    for (const t of TYPE_ORDER) groups[t] = [];
    lines.forEach(l => { if (groups[l.accountType]) groups[l.accountType].push(l); });
    return groups;
};

const downloadCsv = (data: TrialBalanceResponse) => {
    const header = 'Account Code,Account Name,Type,Total Debits,Total Credits,Net Balance';
    const rows = data.lines.map(l =>
        [l.accountCode, `"${l.accountName}"`, l.accountType,
            l.totalDebits.toFixed(2), l.totalCredits.toFixed(2), l.netBalance.toFixed(2)].join(',')
    );
    const footer = `,,GRAND TOTAL,${data.grandTotalDebits.toFixed(2)},${data.grandTotalCredits.toFixed(2)},`;
    const blob = new Blob([[header, ...rows, footer].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${data.asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Component ────────────────────────────────────────────────────────────────

const TrialBalancePage: React.FC = () => {
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [asOfDate, setAsOfDate]   = useState(today);
    const [data, setData]           = useState<TrialBalanceResponse | null>(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');

    const fetchData = async (date: string) => {
        setLoading(true);
        setError('');
        try {
            const rawResult = await accountingApi.getTrialBalance(date);
            const dataObj = rawResult as unknown;

            console.log("Raw Trial Balance Response:", dataObj);

            let parsedResponse: TrialBalanceResponse | null = null;

            if (dataObj && typeof dataObj === 'object') {
                const record = dataObj as Record<string, unknown>;

                // Scenario 1: Standard Response { asOfDate: ..., lines: [...] }
                if ('lines' in record && Array.isArray(record.lines)) {
                    parsedResponse = record as unknown as TrialBalanceResponse;
                }
                // Scenario 2: Nested wrapper { data: { asOfDate: ..., lines: [...] } }
                else if ('data' in record && typeof record.data === 'object' && record.data !== null) {
                    const nested = record.data as Record<string, unknown>;
                    if ('lines' in nested && Array.isArray(nested.lines)) {
                        parsedResponse = nested as unknown as TrialBalanceResponse;
                    }
                }
            }

            if (parsedResponse && Array.isArray(parsedResponse.lines)) {
                setData(parsedResponse);
            } else {
                console.error("Trial Balance data is missing or malformed.", dataObj);
                setError('Received an invalid response format from the server.');
                setData(null);
            }

        } catch (err) {
            console.error(err);
            setError('Failed to load Trial Balance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(today); }, [today]);

    // FIX: Safely fallback to an empty array if data.lines is somehow still undefined
    const groups = data && Array.isArray(data.lines) ? groupByType(data.lines) : {};

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Scale className="text-emerald-600" size={24} />
                        GL Trial Balance
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        All debit and credit totals from posted journal entries, grouped by account type.
                    </p>
                </div>
                <button
                    onClick={() => data && downloadCsv(data)}
                    disabled={!data || loading}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition"
                >
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* ── Date picker ────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-slate-700">As of date:</label>
                <input
                    type="date"
                    value={asOfDate}
                    max={today}
                    onChange={e => setAsOfDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                    onClick={() => fetchData(asOfDate)}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* ── Out-of-balance alert ───────────────────────────────────── */}
            {data && !data.balanced && (
                <div className="flex items-center gap-3 bg-red-50 border-2 border-red-500 text-red-800 px-5 py-4 rounded-xl font-semibold">
                    <AlertTriangle size={20} className="shrink-0 text-red-600" />
                    ⚠️ TRIAL BALANCE IS OUT OF BALANCE — contact system administrator immediately
                </div>
            )}

            {/* ── Balanced banner ────────────────────────────────────────── */}
            {data && data.balanced && data.lines.length > 0 && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-xl text-sm font-medium">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    Trial balance is balanced as of {data.asOfDate}
                </div>
            )}

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {/* ── Loading ────────────────────────────────────────────────── */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-emerald-500" />
                </div>
            )}

            {/* ── Grouped table ──────────────────────────────────────────── */}
            {!loading && data && (
                <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3">Code</th>
                                <th className="px-5 py-3">Account Name</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3 text-right">Total Debits (KES)</th>
                                <th className="px-5 py-3 text-right">Total Credits (KES)</th>
                                <th className="px-5 py-3 text-right">Net Balance (KES)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {TYPE_ORDER.map(type => {
                                const rows = groups[type] ?? [];
                                if (rows.length === 0) return null;
                                const styles = TYPE_STYLES[type];
                                const subtotalDr  = rows.reduce((s, r) => s + r.totalDebits,  0);
                                const subtotalCr  = rows.reduce((s, r) => s + r.totalCredits, 0);
                                const subtotalNet = rows.reduce((s, r) => s + r.netBalance,   0);
                                return (
                                    <React.Fragment key={type}>
                                        {/* Group header */}
                                        <tr className={`border-t border-b ${styles.header}`}>
                                            <td colSpan={6} className="px-5 py-2">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                                                        {type}
                                                    </span>
                                            </td>
                                        </tr>
                                        {/* Account rows */}
                                        {rows.map(row => (
                                            <tr key={row.accountCode} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{row.accountCode}</td>
                                                <td className="px-5 py-2.5 text-slate-800">{row.accountName}</td>
                                                <td className="px-5 py-2.5">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>{row.accountType}</span>
                                                </td>
                                                <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                                                    {row.totalDebits > 0 ? fmt(row.totalDebits) : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                                                    {row.totalCredits > 0 ? fmt(row.totalCredits) : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className={`px-5 py-2.5 text-right font-mono font-semibold ${row.netBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {fmt(Math.abs(row.netBalance))}{row.netBalance < 0 ? ' Cr' : ''}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Subtotal row */}
                                        <tr className={`border-b ${styles.header} font-semibold`}>
                                            <td colSpan={3} className="px-5 py-2 text-xs text-slate-500 uppercase tracking-wide">
                                                {type} Subtotal
                                            </td>
                                            <td className="px-5 py-2 text-right font-mono text-slate-800">{fmt(subtotalDr)}</td>
                                            <td className="px-5 py-2 text-right font-mono text-slate-800">{fmt(subtotalCr)}</td>
                                            <td className={`px-5 py-2 text-right font-mono ${subtotalNet < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                {fmt(Math.abs(subtotalNet))}{subtotalNet < 0 ? ' Cr' : ''}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            </tbody>

                            {/* ── Grand Total footer ── */}
                            <tfoot>
                            <tr className={`border-t-2 font-bold text-base ${data.balanced ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-400'}`}>
                                <td colSpan={3} className="px-5 py-3 text-slate-800 uppercase tracking-wide text-xs">
                                    Grand Total
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-slate-900">{fmt(data.grandTotalDebits)}</td>
                                <td className="px-5 py-3 text-right font-mono text-slate-900">{fmt(data.grandTotalCredits)}</td>
                                <td className="px-5 py-3 text-right">
                                    {data.balanced ? (
                                        <span className="flex items-center justify-end gap-1.5 text-emerald-700">
                                                <CheckCircle2 size={16} /> BALANCED
                                            </span>
                                    ) : (
                                        <span className="flex items-center justify-end gap-1.5 text-red-700">
                                                <AlertTriangle size={16} /> OUT OF BALANCE
                                            </span>
                                    )}
                                </td>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrialBalancePage;