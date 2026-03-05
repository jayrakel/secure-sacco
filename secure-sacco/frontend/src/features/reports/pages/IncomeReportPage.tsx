import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, TrendingUp, Download, RefreshCw,
    Loader2, AlertCircle, Banknote, Percent, ShieldAlert, LayoutGrid,
    ChevronUp, ChevronDown,
} from 'lucide-react';
import { reportApi, type IncomeLineDTO, type IncomeReportDTO } from '../api/report-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const monthStartStr = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
};

const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateLong = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

// ─── Category visual config ────────────────────────────────────────────────────
interface CatStyle {
    label:     string;
    icon:      React.ElementType;
    gradient:  string;
    badgeBg:   string;
    badgeText: string;
    dotColor:  string;
}

const CAT_CONFIG: Record<string, CatStyle> = {
    FEES:      { label: 'Fees',      icon: Banknote,    gradient: 'from-sky-500 to-sky-600',     badgeBg: 'bg-sky-100',     badgeText: 'text-sky-800',     dotColor: 'bg-sky-500'     },
    INTEREST:  { label: 'Interest',  icon: Percent,     gradient: 'from-emerald-500 to-emerald-600', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800', dotColor: 'bg-emerald-500' },
    PENALTIES: { label: 'Penalties', icon: ShieldAlert, gradient: 'from-rose-500 to-rose-600',   badgeBg: 'bg-rose-100',    badgeText: 'text-rose-800',    dotColor: 'bg-rose-500'    },
    OTHER:     { label: 'Other',     icon: LayoutGrid,  gradient: 'from-slate-400 to-slate-500', badgeBg: 'bg-slate-100',   badgeText: 'text-slate-700',   dotColor: 'bg-slate-400'   },
};
const getCat = (key: string): CatStyle => CAT_CONFIG[key] ?? CAT_CONFIG.OTHER;
const CAT_ORDER = ['FEES', 'INTEREST', 'PENALTIES'];

// ─── Sort helpers ──────────────────────────────────────────────────────────────
type SortKey = 'accountCode' | 'accountName' | 'totalCredit' | 'totalDebit' | 'netIncome';
type SortDir = 'asc' | 'desc';

// ─── CSV export ────────────────────────────────────────────────────────────────
const exportCsv = (data: IncomeReportDTO) => {
    const header = 'Category,Account Code,Account Name,Credits (KES),Debits (KES),Net Income (KES)\n';
    const rows = data.lines.map(l =>
        `${l.category},${l.accountCode},"${l.accountName}",${l.totalCredit},${l.totalDebit},${l.netIncome}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IncomeReport_${data.periodFrom}_${data.periodTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export const IncomeReportPage: React.FC = () => {
    const [from, setFrom]   = useState(monthStartStr());
    const [to,   setTo]     = useState(todayStr());
    const [data, setData]   = useState<IncomeReportDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');
    const [ran, setRan]         = useState(false);

    // Table sort
    const [sortKey, setSortKey] = useState<SortKey>('netIncome');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        setData(null);
        try {
            const result = await reportApi.getIncomeReport(from, to);
            setData(result);
            setRan(true);
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Failed to load income report. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    // ── Derived: grouped + sorted ──────────────────────────────────────────────
    const grouped = useMemo(() => {
        if (!data) return {} as Record<string, IncomeLineDTO[]>;
        const map: Record<string, IncomeLineDTO[]> = {};
        for (const line of data.lines) (map[line.category] ??= []).push(line);
        return Object.fromEntries(
            [...CAT_ORDER.filter(k => k in map), ...Object.keys(map).filter(k => !CAT_ORDER.includes(k))]
                .map(k => [k, map[k]])
        );
    }, [data]);

    const sortedLines = useMemo(() => {
        if (!data) return [];
        return [...data.lines].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'accountCode')  cmp = a.accountCode.localeCompare(b.accountCode);
            else if (sortKey === 'accountName') cmp = a.accountName.localeCompare(b.accountName);
            else if (sortKey === 'totalCredit') cmp = a.totalCredit - b.totalCredit;
            else if (sortKey === 'totalDebit')  cmp = a.totalDebit  - b.totalDebit;
            else                                cmp = a.netIncome   - b.netIncome;
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const SortIcon: React.FC<{ col: SortKey }> = ({ col }) => {
        if (sortKey !== col) return <ChevronUp size={12} className="text-slate-300" />;
        return sortDir === 'asc'
            ? <ChevronUp   size={12} className="text-slate-600" />
            : <ChevronDown size={12} className="text-slate-600" />;
    };

    const grandTotal = data?.grandTotalIncome ?? 0;
    const totalCredits = data?.lines.reduce((s, l) => s + l.totalCredit, 0) ?? 0;
    const totalDebits  = data?.lines.reduce((s, l) => s + l.totalDebit,  0) ?? 0;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* ── Page header ── */}
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
                            <TrendingUp className="text-violet-600" size={22} />
                            Income Report
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            P&L proxy — aggregate General Ledger income accounts (Fees, Interest, Penalties).
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => data && exportCsv(data)}
                    disabled={!data}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors self-start sm:self-auto"
                >
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* ── Date range + run ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</label>
                    <input
                        type="date"
                        value={from}
                        max={to}
                        onChange={e => setFrom(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</label>
                    <input
                        type="date"
                        value={to}
                        min={from}
                        max={todayStr()}
                        onChange={e => setTo(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                    />
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
                >
                    {loading
                        ? <Loader2 size={15} className="animate-spin" />
                        : <RefreshCw size={15} />}
                    {loading ? 'Running…' : 'Run Report'}
                </button>

                {data && (
                    <span className="ml-auto text-sm text-slate-500 self-center">
                        {fmtDateLong(data.periodFrom)} — {fmtDateLong(data.periodTo)}
                    </span>
                )}
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
            )}

            {/* ── Loading ── */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="animate-spin mb-3 text-violet-600" size={36} />
                    <p className="text-sm">Generating income report…</p>
                </div>
            )}

            {/* ── Empty state (before first run) ── */}
            {!ran && !loading && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <TrendingUp size={40} className="mb-3 text-slate-200" />
                    <p className="text-sm">Select a date range and click <strong className="text-slate-600">Run Report</strong>.</p>
                </div>
            )}

            {/* ── Results ── */}
            {data && !loading && (
                <>
                    {/* ── Summary cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Grand total */}
                        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 text-white shadow-md">
                            <div className="flex items-center gap-2 mb-3 opacity-80">
                                <TrendingUp size={16} />
                                <span className="text-sm font-semibold uppercase tracking-wider">Total Net Income</span>
                            </div>
                            <div className="text-3xl font-bold tracking-tight">
                                KES {fmt(grandTotal)}
                            </div>
                            <div className="text-sm opacity-70 mt-1">
                                {data.lines.length} GL account{data.lines.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Per-category breakdown cards */}
                        {Object.entries(grouped).map(([cat, lines]) => {
                            const s = getCat(cat);
                            const Icon = s.icon;
                            const total = lines.reduce((acc, l) => acc + l.netIncome, 0);
                            const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                            return (
                                <div key={cat} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex items-center gap-2 mb-3 text-slate-500">
                                        <Icon size={16} />
                                        <span className="text-sm font-bold uppercase tracking-wider">{s.label}</span>
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800 tracking-tight">
                                        KES {fmt(total)}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${s.gradient}`}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 tabular-nums">{pct.toFixed(1)}%</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {lines.length} account{lines.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Line-item table ── */}
                    {data.lines.length > 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                            {/* Table toolbar */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Income Breakdown</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        All General Ledger income accounts for the selected period
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th
                                            className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => toggleSort('accountCode')}
                                        >
                                            <span className="flex items-center gap-1">Account Code <SortIcon col="accountCode" /></span>
                                        </th>
                                        <th
                                            className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => toggleSort('accountName')}
                                        >
                                            <span className="flex items-center gap-1">Account Name <SortIcon col="accountName" /></span>
                                        </th>
                                        <th
                                            className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => toggleSort('totalCredit')}
                                        >
                                            <span className="flex items-center gap-1 justify-end">Credits (KES) <SortIcon col="totalCredit" /></span>
                                        </th>
                                        <th
                                            className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => toggleSort('totalDebit')}
                                        >
                                            <span className="flex items-center gap-1 justify-end">Debits (KES) <SortIcon col="totalDebit" /></span>
                                        </th>
                                        <th
                                            className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => toggleSort('netIncome')}
                                        >
                                            <span className="flex items-center gap-1 justify-end">Net Income (KES) <SortIcon col="netIncome" /></span>
                                        </th>
                                    </tr>
                                    </thead>

                                    <tbody className="bg-white divide-y divide-slate-50">
                                    {sortedLines.map((line) => {
                                        const s = getCat(line.category);
                                        return (
                                            <tr key={line.accountCode} className="hover:bg-slate-50 transition-colors">
                                                {/* Category badge */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.badgeBg} ${s.badgeText}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dotColor}`} />
                                                            {s.label}
                                                        </span>
                                                </td>
                                                {/* Account code */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="text-xs font-mono font-semibold text-slate-600">
                                                            {line.accountCode}
                                                        </span>
                                                </td>
                                                {/* Account name */}
                                                <td className="px-5 py-3.5">
                                                        <span className="text-sm font-medium text-slate-800">
                                                            {line.accountName}
                                                        </span>
                                                </td>
                                                {/* Credits */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                        <span className="text-sm font-semibold text-emerald-700">
                                                            {fmt(line.totalCredit)}
                                                        </span>
                                                </td>
                                                {/* Debits */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                        <span className="text-sm font-semibold text-rose-600">
                                                            {fmt(line.totalDebit)}
                                                        </span>
                                                </td>
                                                {/* Net */}
                                                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                        <span className="text-sm font-bold text-slate-800">
                                                            {fmt(line.netIncome)}
                                                        </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>

                                    {/* Grand total footer */}
                                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                    <tr>
                                        <td colSpan={3} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Totals ({data.lines.length} account{data.lines.length !== 1 ? 's' : ''})
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-emerald-700">
                                            {fmt(totalCredits)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-rose-600">
                                            {fmt(totalDebits)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">
                                            {fmt(grandTotal)}
                                        </td>
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <TrendingUp size={36} className="mb-3 text-slate-200" />
                            <p className="text-sm font-semibold text-slate-500">No income data</p>
                            <p className="text-xs text-slate-400 mt-1">No GL income entries found for this period.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};