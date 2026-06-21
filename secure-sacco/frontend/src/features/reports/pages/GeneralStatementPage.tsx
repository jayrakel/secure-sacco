import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, Download, RefreshCw,
    Loader2, AlertCircle, Search,
} from 'lucide-react';
import { reportApi, type GeneralStatementDTO } from '../api/report-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const todayStr = () => new Date().toISOString().split('T')[0];
const monthStartStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDateLong = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    ASSET: 'bg-blue-100 text-blue-700',
    LIABILITY: 'bg-amber-100 text-amber-700',
    REVENUE: 'bg-emerald-100 text-emerald-700',
    EXPENSE: 'bg-rose-100 text-rose-700',
    EQUITY: 'bg-purple-100 text-purple-700',
};

export const GeneralStatementPage: React.FC = () => {
    const [from, setFrom]       = useState(monthStartStr());
    const [to, setTo]           = useState(todayStr());
    const [accountCode, setAccountCode] = useState('');
    const [search, setSearch]   = useState(''); // client-side filter over reference/description
    const [data, setData]       = useState<GeneralStatementDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError]     = useState('');
    const [ran, setRan]         = useState(false);

    const runReport = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await reportApi.getGeneralStatement(from, to, accountCode || undefined);
            setData(result);
            setRan(true);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not load the general statement.'));
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await reportApi.downloadGeneralStatement(from, to, accountCode || undefined);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not download the statement.'));
        } finally {
            setDownloading(false);
        }
    };

    const filteredLines = data?.lines.filter(line => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            line.reference?.toLowerCase().includes(q) ||
            line.description?.toLowerCase().includes(q) ||
            line.accountName?.toLowerCase().includes(q) ||
            line.accountCode?.toLowerCase().includes(q)
        );
    }) ?? [];

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link to="/reports" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                    <ArrowLeft size={18} />
                </Link>
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                    <BookOpen size={22} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">General Statement</h1>
                    <p className="text-sm text-slate-500">
                        Every posted GL movement, chronologically — the SACCO's true financial position.
                    </p>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-end gap-3 mb-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                    <label className="text-xs font-medium text-slate-500">From</label>
                    <input
                        type="date" value={from} onChange={e => setFrom(e.target.value)}
                        className="mt-1 p-2 rounded-lg border border-slate-200 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500">To</label>
                    <input
                        type="date" value={to} onChange={e => setTo(e.target.value)}
                        className="mt-1 p-2 rounded-lg border border-slate-200 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500">Account Code (optional)</label>
                    <input
                        type="text" value={accountCode} onChange={e => setAccountCode(e.target.value)}
                        placeholder="e.g. 1001"
                        className="mt-1 p-2 rounded-lg border border-slate-200 text-sm w-32"
                    />
                </div>
                <button
                    onClick={runReport}
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Run Statement
                </button>
                {data && (
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                    >
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Download CSV
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {!ran && !loading && (
                <div className="text-center py-16 text-slate-400">
                    Select a date range and click "Run Statement" to see every transaction the SACCO has posted.
                </div>
            )}

            {data && (
                <>
                    {/* ── Summary ── */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                            <p className="text-xs text-blue-600 font-medium">Total Debits</p>
                            <p className="text-2xl font-bold text-blue-800 mt-1">KES {fmt(data.totalDebits)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                            <p className="text-xs text-emerald-600 font-medium">Total Credits</p>
                            <p className="text-2xl font-bold text-emerald-800 mt-1">KES {fmt(data.totalCredits)}</p>
                        </div>
                    </div>

                    {data.fromDate && data.toDate && (
                        <p className="text-sm text-slate-500 mb-3">
                            {fmtDateLong(data.fromDate)} — {fmtDateLong(data.toDate)} · {data.lines.length} line{data.lines.length === 1 ? '' : 's'}
                        </p>
                    )}

                    {/* ── Search ── */}
                    <div className="relative mb-3">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by M-Pesa reference, description, or account…"
                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                        />
                    </div>

                    {/* ── Table ── */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-400 bg-slate-50 border-b border-slate-200">
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3">Reference</th>
                                    <th className="py-2.5 px-3">Description</th>
                                    <th className="py-2.5 px-3">Account</th>
                                    <th className="py-2.5 px-3">Type</th>
                                    <th className="py-2.5 px-3 text-right">Debit</th>
                                    <th className="py-2.5 px-3 text-right">Credit</th>
                                    <th className="py-2.5 px-3 text-right">Running Bal.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLines.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                            No matching transactions.
                                        </td>
                                    </tr>
                                ) : filteredLines.map((line, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                                            {new Date(line.transactionDate + 'T00:00:00').toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-xs text-slate-600">{line.reference}</td>
                                        <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{line.description}</td>
                                        <td className="py-2 px-3 text-slate-700">
                                            <span className="font-mono text-xs text-slate-400">{line.accountCode}</span> {line.accountName}
                                        </td>
                                        <td className="py-2 px-3">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ACCOUNT_TYPE_COLORS[line.accountType] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {line.accountType}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                                            {line.debitAmount > 0 ? `KES ${fmt(line.debitAmount)}` : ''}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                                            {line.creditAmount > 0 ? `KES ${fmt(line.creditAmount)}` : ''}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-500">
                                            KES {fmt(line.runningBalance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default GeneralStatementPage;