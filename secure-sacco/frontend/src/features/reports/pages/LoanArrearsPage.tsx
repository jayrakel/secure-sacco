import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { reportApi, type LoanArrearsDTO, ARREARS_BUCKETS, type ArrearsBucket } from '../api/report-api';
import {
    AlertTriangle,
    Search,
    Download,
    ArrowLeft,
    ExternalLink,
    TrendingUp,
    Clock,
    ChevronUp,
    ChevronDown,
    Loader2,
} from 'lucide-react';

// ─── Bucket colour palette ────────────────────────────────────────────────────
const BUCKET_STYLES: Record<string, { badge: string; card: string; border: string; dot: string }> = {
    '1-7 Days':   { badge: 'bg-amber-100 text-amber-800',   card: 'bg-amber-50',   border: 'border-amber-400', dot: 'bg-amber-400'  },
    '8-30 Days':  { badge: 'bg-orange-100 text-orange-800', card: 'bg-orange-50',  border: 'border-orange-400',dot: 'bg-orange-400' },
    '31-60 Days': { badge: 'bg-red-100 text-red-800',       card: 'bg-red-50',     border: 'border-red-400',   dot: 'bg-red-400'    },
    '61-90 Days': { badge: 'bg-rose-100 text-rose-800',     card: 'bg-rose-50',    border: 'border-rose-500',  dot: 'bg-rose-500'   },
    '90+ Days':   { badge: 'bg-red-200 text-red-900',       card: 'bg-red-100',    border: 'border-red-700',   dot: 'bg-red-700'    },
};

type SortKey = 'daysOverdue' | 'amountOverdue' | 'memberNumber' | 'memberName';
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const totalFor = (rows: LoanArrearsDTO[]) =>
    rows.reduce((s, r) => s + r.amountOverdue, 0);

// ─── Component ────────────────────────────────────────────────────────────────
export const LoanArrearsPage: React.FC = () => {
    const [allRows, setAllRows]       = useState<LoanArrearsDTO[]>([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');

    const [activeBucket, setActiveBucket] = useState<ArrearsBucket | 'All'>('All');
    const [search, setSearch]             = useState('');
    const [sortKey, setSortKey]           = useState<SortKey>('daysOverdue');
    const [sortDir, setSortDir]           = useState<SortDir>('desc');

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true);
        reportApi.getLoanArrears()
            .then(setAllRows)
            .catch(() => setError('Failed to load arrears data. Please try again.'))
            .finally(() => setLoading(false));
    }, []);

    // ── Derived data ──────────────────────────────────────────────────────────
    const bucketSummaries = useMemo(() =>
            ARREARS_BUCKETS.map(b => ({
                bucket: b,
                count: allRows.filter(r => r.bucket === b).length,
                total: totalFor(allRows.filter(r => r.bucket === b)),
            })),
        [allRows]);

    const filteredRows = useMemo(() => {
        let rows = activeBucket === 'All' ? allRows : allRows.filter(r => r.bucket === activeBucket);

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            rows = rows.filter(r =>
                r.memberNumber.toLowerCase().includes(q) ||
                r.memberName.toLowerCase().includes(q)
            );
        }

        return [...rows].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'daysOverdue')   cmp = a.daysOverdue   - b.daysOverdue;
            else if (sortKey === 'amountOverdue') cmp = a.amountOverdue - b.amountOverdue;
            else if (sortKey === 'memberNumber')  cmp = a.memberNumber.localeCompare(b.memberNumber);
            else if (sortKey === 'memberName')    cmp = a.memberName.localeCompare(b.memberName);
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [allRows, activeBucket, search, sortKey, sortDir]);

    const grandTotal = useMemo(() => totalFor(filteredRows), [filteredRows]);

    // ── Sort handler ──────────────────────────────────────────────────────────
    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    // ── CSV export ────────────────────────────────────────────────────────────
    const handleExport = () => {
        const header = 'Member Number,Member Name,Loan ID,Product,Days Overdue,Bucket,Amount Overdue (KES)\n';
        const body = filteredRows
            .map(r => `${r.memberNumber},"${r.memberName}",${r.loanId},"${r.productName}",${r.daysOverdue},"${r.bucket}",${r.amountOverdue}`)
            .join('\n');
        const blob = new Blob([header + body], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `Loan_Arrears_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Sort icon ─────────────────────────────────────────────────────────────
    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ChevronUp size={13} className="text-slate-300 ml-1" />;
        return sortDir === 'asc'
            ? <ChevronUp   size={13} className="text-emerald-500 ml-1" />
            : <ChevronDown size={13} className="text-emerald-500 ml-1" />;
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
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
                            <AlertTriangle className="text-red-500" size={22} />
                            Loan Arrears Aging
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Non-performing loan installments categorised by overdue aging buckets.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    disabled={filteredRows.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
                >
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* ── Bucket summary cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {bucketSummaries.map(({ bucket, count, total }) => {
                    const styles = BUCKET_STYLES[bucket];
                    const isActive = activeBucket === bucket;
                    return (
                        <button
                            key={bucket}
                            onClick={() => setActiveBucket(isActive ? 'All' : bucket)}
                            className={`
                                text-left p-4 rounded-xl border-2 transition-all
                                ${isActive
                                ? `${styles.card} ${styles.border} shadow-md`
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}
                            `}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
                                <span className="text-xs font-semibold text-slate-600">{bucket}</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">{count}</div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium">
                                KES {fmt(total)}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Search + filter bar ──────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search member number or name…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>

                {/* Bucket filter pills */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveBucket('All')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                            activeBucket === 'All'
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All Buckets
                    </button>
                    {ARREARS_BUCKETS.map(b => (
                        <button
                            key={b}
                            onClick={() => setActiveBucket(activeBucket === b ? 'All' : b)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                                activeBucket === b
                                    ? BUCKET_STYLES[b].badge + ' ring-2 ring-offset-1 ring-current'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {b}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Results summary bar ──────────────────────────────────────── */}
            <div className="flex items-center justify-between text-sm text-slate-500 px-1">
                <span>
                    {loading ? 'Loading…' : (
                        <>
                            Showing <strong className="text-slate-800">{filteredRows.length}</strong> loan
                            {filteredRows.length !== 1 ? 's' : ''}
                            {activeBucket !== 'All' && <> in <span className={`font-semibold px-1.5 py-0.5 rounded ${BUCKET_STYLES[activeBucket]?.badge}`}>{activeBucket}</span></>}
                        </>
                    )}
                </span>
                {filteredRows.length > 0 && (
                    <span className="font-semibold text-slate-700">
                        Total Overdue: <span className="text-red-600">KES {fmt(grandTotal)}</span>
                    </span>
                )}
            </div>

            {/* ── Main table ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                        <tr>
                            {/* Member Number */}
                            <th
                                className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none"
                                onClick={() => handleSort('memberNumber')}
                            >
                                <div className="flex items-center">Member # <SortIcon col="memberNumber" /></div>
                            </th>

                            {/* Member Name */}
                            <th
                                className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none"
                                onClick={() => handleSort('memberName')}
                            >
                                <div className="flex items-center">Name <SortIcon col="memberName" /></div>
                            </th>

                            {/* Product */}
                            <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Loan Product
                            </th>

                            {/* Days Overdue */}
                            <th
                                className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none"
                                onClick={() => handleSort('daysOverdue')}
                            >
                                <div className="flex items-center justify-center">
                                    <Clock size={12} className="mr-1" /> Days <SortIcon col="daysOverdue" />
                                </div>
                            </th>

                            {/* Bucket */}
                            <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Bucket
                            </th>

                            {/* Amount Overdue */}
                            <th
                                className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none"
                                onClick={() => handleSort('amountOverdue')}
                            >
                                <div className="flex items-center justify-end">
                                    <TrendingUp size={12} className="mr-1" /> Amount Overdue <SortIcon col="amountOverdue" />
                                </div>
                            </th>

                            {/* Action */}
                            <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Action
                            </th>
                        </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <Loader2 className="animate-spin mx-auto text-emerald-600 mb-3" size={32} />
                                    <p className="text-slate-500 text-sm">Loading arrears data…</p>
                                </td>
                            </tr>
                        ) : filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <AlertTriangle className="text-emerald-500" size={24} />
                                        </div>
                                        <p className="text-slate-700 font-semibold">No arrears found</p>
                                        <p className="text-slate-400 text-sm">
                                            {search ? 'Try a different search term.' : 'All active loans are current — no overdue installments.'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row) => {
                                const bucketStyle = BUCKET_STYLES[row.bucket] ?? BUCKET_STYLES['90+ Days'];
                                return (
                                    <tr key={row.loanId} className="hover:bg-slate-50 transition-colors">

                                        {/* Member Number */}
                                        <td className="px-5 py-4 whitespace-nowrap text-sm font-mono font-semibold text-slate-700">
                                            {row.memberNumber}
                                        </td>

                                        {/* Member Name */}
                                        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                            {row.memberName}
                                        </td>

                                        {/* Product */}
                                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {row.productName}
                                        </td>

                                        {/* Days Overdue */}
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                                <span className={`
                                                    inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold
                                                    ${row.daysOverdue > 90
                                                    ? 'bg-red-100 text-red-800'
                                                    : row.daysOverdue > 30
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : 'bg-amber-100 text-amber-800'}
                                                `}>
                                                    <Clock size={11} />
                                                    {row.daysOverdue}d
                                                </span>
                                        </td>

                                        {/* Bucket */}
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${bucketStyle.badge}`}>
                                                    {row.bucket}
                                                </span>
                                        </td>

                                        {/* Amount Overdue */}
                                        <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-bold text-red-600">
                                                    KES {fmt(row.amountOverdue)}
                                                </span>
                                        </td>

                                        {/* Action: link to loan management page */}
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                            <Link
                                                to="/loans"
                                                state={{ highlightLoanId: row.loanId }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white transition-colors"
                                                title={`Open loan ${row.loanId} in Loan Management`}
                                            >
                                                <ExternalLink size={12} /> View Loan
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>

                        {/* ── Totals footer ─────────────────────────────────── */}
                        {!loading && filteredRows.length > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                                <td colSpan={5} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Total ({filteredRows.length} loan{filteredRows.length !== 1 ? 's' : ''})
                                </td>
                                <td className="px-5 py-3 text-right text-sm font-bold text-red-700">
                                    KES {fmt(grandTotal)}
                                </td>
                                <td />
                            </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};