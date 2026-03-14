import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, TrendingUp, Download, RefreshCw,
    Loader2, AlertCircle, ChevronUp, ChevronDown,
} from 'lucide-react';
import { reportApi, type IncomeCategoryDTO, type IncomeReportDTO } from '../api/report-api';
import {getApiErrorMessage} from "../../../shared/utils/getApiErrorMessage.ts";

const todayStr = () => new Date().toISOString().split('T')[0];
const monthStartStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDateLong = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

const BAR_COLORS = [
    'bg-violet-500','bg-emerald-500','bg-sky-500',
    'bg-amber-500','bg-rose-500','bg-indigo-500','bg-teal-500','bg-orange-500',
];

const exportCsv = (data: IncomeReportDTO) => {
    const header = 'Account Name,Net Income (KES)\n';
    const rows   = data.categories.map(c => `"${c.category}",${c.amount}`).join('\n');
    const footer = `\nTotal,${data.totalIncome}`;
    const blob   = new Blob([header + rows + footer], { type: 'text/csv' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = `IncomeReport_${data.fromDate}_${data.toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
};

type SortDir = 'asc' | 'desc';

export const IncomeReportPage: React.FC = () => {
    const [from,    setFrom]    = useState(monthStartStr());
    const [to,      setTo]      = useState(todayStr());
    const [data,    setData]    = useState<IncomeReportDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');
    const [ran,     setRan]     = useState(false);
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const fetchData = useCallback(async () => {
        setLoading(true); setError(''); setData(null);
        try {
            const result = await reportApi.getIncomeReport(from, to);
            setData(result);
            setRan(true);
        } catch (error: unknown) {
            setError(getApiErrorMessage(error, 'Failed to load income report. Please try again.'));
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    // Sort by amount — uses actual backend fields: category.category, category.amount
    const sortedCategories: IncomeCategoryDTO[] = data
        ? [...data.categories].sort((a, b) => sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount)
        : [];

    const grandTotal = data?.totalIncome ?? 0;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={16} /> Reports
                    </Link>
                    <span className="text-slate-300">/</span>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="text-violet-600" size={22} />
                            Income Report
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Net income per General Ledger account for the selected period.</p>
                    </div>
                </div>
                <button onClick={() => data && exportCsv(data)} disabled={!data}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors self-start sm:self-auto">
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Date picker */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</label>
                    <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                           className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</label>
                    <input type="date" value={to} min={from} max={todayStr()} onChange={e => setTo(e.target.value)}
                           className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
                <button onClick={fetchData} disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    {loading ? 'Running…' : 'Run Report'}
                </button>
                {data && (
                    <span className="ml-auto text-sm text-slate-500 self-center">
                        {fmtDateLong(data.fromDate)} — {fmtDateLong(data.toDate)}
                    </span>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="animate-spin mb-3 text-violet-600" size={36} />
                    <p className="text-sm">Generating income report…</p>
                </div>
            )}

            {!ran && !loading && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <TrendingUp size={40} className="mb-3 text-slate-200" />
                    <p className="text-sm">Select a date range and click <strong className="text-slate-600">Run Report</strong>.</p>
                </div>
            )}

            {data && !loading && (
                <>
                    {/* Grand total */}
                    <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-6 text-white shadow-md">
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Total Net Income</p>
                        <p className="text-4xl font-bold mt-1 tracking-tight">KES {fmt(grandTotal)}</p>
                        <p className="text-sm opacity-70 mt-1.5">
                            {data.categories.length} GL account{data.categories.length !== 1 ? 's' : ''}
                            &nbsp;·&nbsp;{fmtDateLong(data.fromDate)} — {fmtDateLong(data.toDate)}
                        </p>
                    </div>

                    {data.categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm gap-2">
                            <TrendingUp size={36} className="text-slate-200" />
                            <p className="text-sm font-semibold text-slate-500">No income entries</p>
                            <p className="text-xs text-slate-400">No posted GL income journal entries found for this period.</p>
                        </div>
                    ) : (
                        <>
                            {/* Horizontal bar chart */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Income Breakdown</p>
                                {sortedCategories.map((cat, i) => {
                                    const pct = grandTotal > 0 ? (cat.amount / grandTotal) * 100 : 0;
                                    const bar = BAR_COLORS[i % BAR_COLORS.length];
                                    return (
                                        <div key={cat.category} className="flex items-center gap-4">
                                            <p className="text-sm font-medium text-slate-700 w-48 shrink-0 truncate" title={cat.category}>
                                                {cat.category}
                                            </p>
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${bar} transition-all duration-500`}
                                                     style={{ width: `${Math.max(pct, 0.5)}%` }} />
                                            </div>
                                            <div className="text-right shrink-0 w-40">
                                                <span className="text-sm font-bold text-slate-800">KES {fmt(cat.amount)}</span>
                                                <span className="text-xs text-slate-400 ml-2">{pct.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Detail table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <h2 className="text-sm font-bold text-slate-800">GL Account Detail</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Net income (Credits − Debits) per posted journal account
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Account Name</th>
                                            <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                                onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                                                    <span className="flex items-center justify-end gap-1">
                                                        Net Income (KES)
                                                        {sortDir === 'desc'
                                                            ? <ChevronDown size={12} className="text-slate-600" />
                                                            : <ChevronUp   size={12} className="text-slate-600" />}
                                                    </span>
                                            </th>
                                            <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">% of Total</th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-50">
                                        {sortedCategories.map((cat, i) => {
                                            const pct = grandTotal > 0 ? (cat.amount / grandTotal) * 100 : 0;
                                            const dot = BAR_COLORS[i % BAR_COLORS.length];
                                            return (
                                                <tr key={cat.category} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${dot}`} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{cat.category}</td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold text-slate-800">{fmt(cat.amount)}</td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-semibold text-slate-500 tabular-nums">{pct.toFixed(1)}%</td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                        <tr>
                                            <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Total ({data.categories.length} account{data.categories.length !== 1 ? 's' : ''})
                                            </td>
                                            <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">{fmt(grandTotal)}</td>
                                            <td className="px-5 py-3 text-right text-xs font-bold text-slate-500">100%</td>
                                        </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};