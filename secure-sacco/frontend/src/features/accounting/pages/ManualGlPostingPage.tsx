import React, { useEffect, useState } from 'react';
import { accountingApi, type Account, type CreateManualJournalRequest } from '../api/accounting-api';
import {
    PenLine, Plus, Trash2, AlertTriangle, CheckCircle2,
    Loader2, Info, ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineRow {
    id: number;
    accountCode: string;
    side: 'debit' | 'credit';
    amount: string;
    description: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().slice(0, 10);

const TYPE_COLORS: Record<string, string> = {
    ASSET:     'bg-blue-100 text-blue-700',
    LIABILITY: 'bg-orange-100 text-orange-700',
    EQUITY:    'bg-purple-100 text-purple-700',
    REVENUE:   'bg-emerald-100 text-emerald-700',
    EXPENSE:   'bg-red-100 text-red-700',
};

let nextId = 1;
const mkRow = (): LineRow => ({ id: nextId++, accountCode: '', side: 'debit', amount: '', description: '' });

// ─── Account selector ────────────────────────────────────────────────────────

interface AccountSelectProps {
    value: string;
    accounts: Account[];
    onChange: (code: string) => void;
}

const AccountSelect: React.FC<AccountSelectProps> = ({ value, accounts, onChange }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = React.useRef<HTMLDivElement>(null);

    const selected = accounts.find(a => a.accountCode === value);

    const filtered = accounts.filter(a =>
        a.isActive &&
        (a.accountCode.includes(query) ||
            a.accountName.toLowerCase().includes(query.toLowerCase()))
    );

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => { setOpen(o => !o); setQuery(''); }}
                className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
                {selected ? (
                    <span className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-slate-500 shrink-0">{selected.accountCode}</span>
                        <span className="text-slate-800 truncate">{selected.accountName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${TYPE_COLORS[selected.accountType] ?? ''}`}>
                            {selected.accountType}
                        </span>
                    </span>
                ) : (
                    <span className="text-slate-400">Select account…</span>
                )}
                <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by code or name…"
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <ul className="max-h-52 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-slate-400 text-center">No accounts found</li>
                        ) : filtered.map(a => (
                            <li key={a.accountCode}>
                                <button
                                    type="button"
                                    onClick={() => { onChange(a.accountCode); setOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-sm transition"
                                >
                                    <span className="font-mono text-slate-500 w-12 shrink-0">{a.accountCode}</span>
                                    <span className="text-slate-800 flex-1 truncate">{a.accountName}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${TYPE_COLORS[a.accountType] ?? ''}`}>
                                        {a.accountType}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ManualGlPostingPage: React.FC = () => {
    const [accounts, setAccounts]     = useState<Account[]>([]);
    const [acctLoading, setAcctLoading] = useState(true);

    // Form fields
    const [txDate, setTxDate]         = useState(today());
    const [refNo, setRefNo]           = useState('');
    const [description, setDescription] = useState('');
    const [lines, setLines]           = useState<LineRow[]>([mkRow(), mkRow()]);

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]           = useState('');
    const [success, setSuccess]       = useState('');

    useEffect(() => {
        accountingApi.getAccounts()
            .then(data => setAccounts(data.sort((a, b) => a.accountCode.localeCompare(b.accountCode))))
            .catch(() => setError('Failed to load accounts.'))
            .finally(() => setAcctLoading(false));
    }, []);

    // ── Line helpers ──────────────────────────────────────────────────────────

    const updateLine = (id: number, patch: Partial<LineRow>) =>
        setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));

    const addLine = () => setLines(prev => [...prev, mkRow()]);

    const removeLine = (id: number) =>
        setLines(prev => prev.length > 2 ? prev.filter(l => l.id !== id) : prev);

    // ── Totals & balance ──────────────────────────────────────────────────────

    const totalDebits  = lines.filter(l => l.side === 'debit') .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const totalCredits = lines.filter(l => l.side === 'credit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const difference   = Math.abs(totalDebits - totalCredits);
    const isBalanced   = difference < 0.01;

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!txDate)        return setError('Transaction date is required.');
        if (!refNo.trim())  return setError('Reference number is required.');
        if (!description.trim()) return setError('Description is required.');
        if (!isBalanced)    return setError(`Entry is out of balance by KES ${fmt(difference)}. Debits must equal Credits.`);
        if (lines.some(l => !l.accountCode)) return setError('All lines must have an account selected.');
        if (lines.some(l => !(parseFloat(l.amount) > 0))) return setError('All line amounts must be greater than zero.');

        const payload: CreateManualJournalRequest = {
            transactionDate: txDate,
            referenceNumber: refNo.trim(),
            description: description.trim(),
            lines: lines.map(l => ({
                accountCode:   l.accountCode,
                debitAmount:   l.side === 'debit'  ? parseFloat(l.amount) : 0,
                creditAmount:  l.side === 'credit' ? parseFloat(l.amount) : 0,
                description:   l.description.trim(),
            })),
        };

        setSubmitting(true);
        try {
            const result = await accountingApi.postManualJournalEntry(payload);
            setSuccess(`Journal entry posted successfully! Reference: ${result.referenceNumber}`);
            // Reset form
            setRefNo('');
            setDescription('');
            setLines([mkRow(), mkRow()]);
            setTxDate(today());
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg || 'Failed to post journal entry. Please check your inputs and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <PenLine className="text-violet-600" size={24} />
                    Manual GL Posting
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Post a correcting or adjusting journal entry directly to the General Ledger.
                    Debits must equal Credits (double-entry rule enforced).
                </p>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                    Use this only for corrections and adjustments. All entries are permanently posted and audited.
                    Every entry must balance — total debits must equal total credits.
                </span>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <AlertTriangle size={16} className="shrink-0" /> {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> {success}
                </div>
            )}

            {acctLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-violet-500" />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── Header fields ── */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Entry Header</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                    Transaction Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={txDate}
                                    onChange={e => setTxDate(e.target.value)}
                                    max={today()}
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                                />
                            </div>

                            {/* Reference */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                    Reference Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={refNo}
                                    onChange={e => setRefNo(e.target.value)}
                                    placeholder="e.g. ADJ-2024-001"
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition font-mono"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5 sm:col-span-1">
                                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="e.g. Correction for savings migration"
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Journal lines ── */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Journal Lines</h2>
                            <span className="text-xs text-slate-400">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Column headers */}
                        <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-3 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Account</span>
                            <span>Side</span>
                            <span>Amount (KES)</span>
                            <span>Line Description</span>
                            <span />
                        </div>

                        <div className="divide-y divide-slate-50">
                            {lines.map((line, idx) => (
                                <div key={line.id} className="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-3 items-center px-6 py-3">

                                    {/* Account */}
                                    <AccountSelect
                                        value={line.accountCode}
                                        accounts={accounts}
                                        onChange={code => updateLine(line.id, { accountCode: code })}
                                    />

                                    {/* Debit / Credit toggle */}
                                    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                                        <button
                                            type="button"
                                            onClick={() => updateLine(line.id, { side: 'debit' })}
                                            className={`flex-1 py-2 transition ${line.side === 'debit' ? 'bg-sky-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            DR
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateLine(line.id, { side: 'credit' })}
                                            className={`flex-1 py-2 transition ${line.side === 'credit' ? 'bg-violet-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            CR
                                        </button>
                                    </div>

                                    {/* Amount */}
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={line.amount}
                                        onChange={e => updateLine(line.id, { amount: e.target.value })}
                                        placeholder="0.00"
                                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 transition w-full"
                                    />

                                    {/* Line description */}
                                    <input
                                        type="text"
                                        value={line.description}
                                        onChange={e => updateLine(line.id, { description: e.target.value })}
                                        placeholder={`Line ${idx + 1} note (optional)`}
                                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition w-full"
                                    />

                                    {/* Remove */}
                                    <button
                                        type="button"
                                        onClick={() => removeLine(line.id)}
                                        disabled={lines.length <= 2}
                                        title="Remove line"
                                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add line */}
                        <div className="px-6 py-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={addLine}
                                className="flex items-center gap-2 text-sm text-violet-600 font-medium hover:text-violet-700 transition"
                            >
                                <Plus size={15} /> Add line
                            </button>
                        </div>
                    </div>

                    {/* ── Balance summary ── */}
                    <div className={`rounded-xl border-2 px-6 py-4 flex flex-wrap items-center justify-between gap-4 ${isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-4 text-sm font-mono">
                            <span className="text-slate-700">
                                Total <span className="text-sky-700 font-bold">DR</span>:&nbsp;
                                <span className="font-semibold">{fmt(totalDebits)}</span>
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-700">
                                Total <span className="text-violet-700 font-bold">CR</span>:&nbsp;
                                <span className="font-semibold">{fmt(totalCredits)}</span>
                            </span>
                            {!isBalanced && (
                                <>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-red-700 font-semibold">
                                        Difference: {fmt(difference)}
                                    </span>
                                </>
                            )}
                        </div>

                        {isBalanced ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 text-sm font-semibold">
                                <CheckCircle2 size={16} /> BALANCED
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-red-700 text-sm font-semibold">
                                <AlertTriangle size={16} /> OUT OF BALANCE
                            </span>
                        )}
                    </div>

                    {/* ── Submit ── */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !isBalanced}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm shadow-sm"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                            {submitting ? 'Posting…' : 'Post Journal Entry'}
                        </button>
                    </div>

                </form>
            )}
        </div>
    );
};

export default ManualGlPostingPage;