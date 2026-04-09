import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Database, UserPlus, PiggyBank, ArrowDownLeft, Banknote,
    RotateCcw, AlertTriangle, Clock, ChevronDown,
    ChevronUp, Trash2, Copy, Loader2, Play, X,
    TrendingUp, Zap, GitMerge, FileSpreadsheet, Upload,
    CheckCircle2, RefreshCw,
} from 'lucide-react';
import { migrationApi } from '../api/migration-api';
import type { LoanRefinanceRequest } from '../api/migration-api';
import { loanApi } from '../../loans/api/loan-api';
import { memberApi } from '../../members/api/member-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import type { LoanProduct } from '../../loans/api/loan-api';
import type { Member } from '../../members/api/member-api';

// ─── Log entry ────────────────────────────────────────────────────────────────

type LogLevel = 'success' | 'error' | 'info';

interface LogEntry {
    id: string;
    level: LogLevel;
    timestamp: string;
    action: string;
    detail: string;
}

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabId = 'member' | 'savings' | 'withdrawal' | 'loan-disburse' | 'loan-repay' | 'loan-refinance' | 'penalty' | 'cron' | 'excel';

const TABS: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'member',         label: 'Member',          icon: <UserPlus size={15} />,       desc: 'Register historical member'   },
    { id: 'savings',        label: 'Savings',          icon: <PiggyBank size={15} />,      desc: 'Post savings deposit'         },
    { id: 'withdrawal',     label: 'Withdrawal',       icon: <ArrowDownLeft size={15} />,  desc: 'Post savings withdrawal'      },
    { id: 'loan-disburse',  label: 'Loan Disburse',    icon: <Banknote size={15} />,       desc: 'Disburse historical loan'     },
    { id: 'loan-repay',     label: 'Loan Repayment',   icon: <RotateCcw size={15} />,     desc: 'Post weekly repayment'        },
    { id: 'loan-refinance', label: 'Refinance',        icon: <GitMerge size={15} />,       desc: 'Refinance / restructure loan' },
    { id: 'penalty',        label: 'Penalty',          icon: <AlertTriangle size={15} />,  desc: 'Apply historical penalty'     },
    { id: 'cron',           label: 'Evaluate',         icon: <Zap size={15} />,            desc: 'Run penalty evaluation'       },
    { id: 'excel',          label: 'Excel Import',     icon: <FileSpreadsheet size={15} />,desc: 'Bulk import from spreadsheet' },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
    'w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-zinc-100 ' +
    'placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all';

const labelCls = 'block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div>
        <label className={labelCls}>{label}</label>
        {children}
        {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
    </div>
);

const RunButton: React.FC<{ loading: boolean; label?: string }> = ({ loading, label = 'Execute' }) => (
    <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg
                   bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-sm
                   transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg
                   shadow-amber-400/20 active:scale-[0.98]"
    >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
        {loading ? 'Running…' : label}
    </button>
);

// ─── Member Select — preloads all members, filters client-side ────────────────
// With only 10 members in the SACCO, loading all upfront is the correct
// approach: instant filtering, no debounce, no empty-dropdown bugs.

interface MemberSelectProps {
    value: string;                          // the selected memberNumber
    onChange: (memberNumber: string) => void;
    allMembers: Member[];                   // pre-loaded from parent
    label?: string;
}

const MemberSelect: React.FC<MemberSelectProps> = ({
                                                       value, onChange, allMembers, label = 'Member Number',
                                                   }) => {
    const [query, setQuery]   = useState('');
    const [open, setOpen]     = useState(false);
    const ref                 = useRef<HTMLDivElement>(null);

    // Selected member object (for display)
    const selected = allMembers.find(m => m.memberNumber === value) ?? null;

    // Filtered list: match member number OR name
    const filtered = query.trim()
        ? allMembers.filter(m => {
            const q = query.toLowerCase();
            return (
                m.memberNumber.toLowerCase().includes(q) ||
                `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
            );
        })
        : allMembers;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (m: Member) => {
        onChange(m.memberNumber);
        setOpen(false);
        setQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
    };

    return (
        <div ref={ref} className="relative">
            <label className={labelCls}>{label}</label>

            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border
                    text-left transition-all
                    ${open
                    ? 'border-amber-400 ring-2 ring-amber-400/30 bg-zinc-800'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'}`}
            >
                {selected ? (
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-amber-400 shrink-0">
                            {selected.memberNumber}
                        </span>
                        <span className="text-xs text-zinc-400 truncate">
                            {selected.firstName} {selected.lastName}
                        </span>
                    </div>
                ) : (
                    <span className="text-sm text-zinc-500">Select a member…</span>
                )}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {selected && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={e => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                            className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 rounded"
                        >
                            <X size={12} />
                        </span>
                    )}
                    <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1.5
                                bg-zinc-800 border border-zinc-700 rounded-xl
                                shadow-2xl shadow-black/40 overflow-hidden">

                    {/* Search input inside dropdown */}
                    <div className="p-2 border-b border-zinc-700">
                        <div className="relative">
                            <input
                                autoFocus
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search by number or name…"
                                className="w-full pl-3 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700
                                           text-sm text-zinc-200 placeholder-zinc-600
                                           focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                            />
                        </div>
                    </div>

                    {/* Member list */}
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-zinc-600">
                                No members match &ldquo;{query}&rdquo;
                            </div>
                        ) : (
                            filtered.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelect(m)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left
                                        hover:bg-zinc-700 transition-colors
                                        ${m.memberNumber === value ? 'bg-amber-400/10' : ''}`}
                                >
                                    {/* Avatar initial */}
                                    <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center
                                                    text-[11px] font-bold text-zinc-400 shrink-0">
                                        {m.firstName[0]}{m.lastName[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-amber-400">
                                                {m.memberNumber}
                                            </span>
                                            {m.memberNumber === value && (
                                                <span className="text-[9px] bg-amber-400/20 text-amber-300
                                                                 px-1.5 py-0.5 rounded font-semibold">
                                                    selected
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-zinc-300 truncate">
                                            {m.firstName} {m.lastName}
                                        </div>
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0
                                        ${m.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                                         title={m.status}
                                    />
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer count */}
                    <div className="px-3 py-1.5 border-t border-zinc-700/50 text-[10px] text-zinc-600">
                        {filtered.length} of {allMembers.length} members
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Log display ──────────────────────────────────────────────────────────────

const LogPanel: React.FC<{ entries: LogEntry[] }> = ({ entries }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [entries]);

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-2">
                <Clock size={28} className="opacity-30" />
                <p className="text-sm">Activity log will appear here</p>
            </div>
        );
    }

    return (
        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1 font-mono text-xs">
            {entries.map(e => (
                <div key={e.id} className={`flex gap-3 items-start p-2 rounded-md
                    ${e.level === 'success' ? 'bg-emerald-950/60 border border-emerald-800/40' :
                    e.level === 'error'   ? 'bg-red-950/60 border border-red-800/40' :
                        'bg-zinc-800/60 border border-zinc-700/40'}`}>
                    <span className={`shrink-0 mt-0.5
                        ${e.level === 'success' ? 'text-emerald-400' :
                        e.level === 'error'   ? 'text-red-400' :
                            'text-zinc-500'}`}>
                        {e.level === 'success' ? '✓' : e.level === 'error' ? '✗' : '·'}
                    </span>
                    <div className="flex-1 min-w-0">
                        <span className="text-zinc-500">[{e.timestamp}] </span>
                        <span className={`font-semibold
                            ${e.level === 'success' ? 'text-emerald-300' :
                            e.level === 'error'   ? 'text-red-300' :
                                'text-zinc-300'}`}>
                            {e.action}
                        </span>
                        <span className="text-zinc-400 ml-2 break-all">{e.detail}</span>
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
};

// ─── Individual form panels ───────────────────────────────────────────────────

const MemberForm: React.FC<{ onLog: (l: LogLevel, action: string, detail: string) => void }> = ({ onLog }) => {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', plainTextPassword: 'Sacco@2024Pass1', registrationDate: '' });
    const [loading, setLoading] = useState(false);
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            const res = await migrationApi.migrateMember(form);
            onLog('success', 'MEMBER MIGRATED', `${res.memberNumber} — ${form.firstName} ${form.lastName}`);
            setForm(f => ({ ...f, firstName: '', lastName: '', email: '', phoneNumber: '', registrationDate: '' }));
        } catch (err) { onLog('error', 'MEMBER FAILED', getApiErrorMessage(err, 'Unknown error')); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <Field label="First Name"><input required value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputCls} placeholder="John" /></Field>
                <Field label="Last Name"><input required value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputCls} placeholder="Doe" /></Field>
            </div>
            <Field label="Email"><input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="john@example.com" /></Field>
            <Field label="Phone Number" hint="+254XXXXXXXXX format"><input required value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} className={inputCls} placeholder="+254712345678" /></Field>
            <Field label="Temporary Password"><input required value={form.plainTextPassword} onChange={e => set('plainTextPassword', e.target.value)} className={inputCls} /></Field>
            <Field label="Registration Date" hint="Original date member joined the SACCO"><input required type="date" value={form.registrationDate} onChange={e => set('registrationDate', e.target.value)} className={inputCls} /></Field>
            <RunButton loading={loading} label="Register Member" />
        </form>
    );
};

const SavingsForm: React.FC<{ onLog: (l: LogLevel, action: string, detail: string) => void; type: 'savings' | 'withdrawal'; allMembers: Member[] }> = ({ onLog, type, allMembers }) => {
    const [memberNumber, setMemberNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [ref, setRef] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const label = type === 'savings' ? 'Deposit' : 'Withdrawal';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            const payload = { memberNumber, amount: parseFloat(amount), referenceNumber: ref, transactionDate: date };
            const res = type === 'savings'
                ? await migrationApi.migrateSavings(payload)
                : await migrationApi.migrateWithdrawal(payload);
            onLog('success', `${label.toUpperCase()} MIGRATED`, `${memberNumber} · KES ${amount} · Ref: ${res.transactionReference}`);
            setAmount(''); setRef(''); setDate('');
        } catch (err) { onLog('error', `${label.toUpperCase()} FAILED`, getApiErrorMessage(err, 'Unknown error')); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <MemberSelect value={memberNumber} onChange={setMemberNumber} allMembers={allMembers} />
            <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (KES)"><input required type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} placeholder="1000.00" /></Field>
                <Field label="Reference Number"><input required value={ref} onChange={e => setRef(e.target.value)} className={inputCls} placeholder={`${type === 'savings' ? 'DEP' : 'WDR'}-001`} /></Field>
            </div>
            <Field label="Transaction Date"><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
            <RunButton loading={loading} label={`Post ${label}`} />
        </form>
    );
};

const LoanDisburseForm: React.FC<{ onLog: (l: LogLevel, action: string, detail: string) => void; products: LoanProduct[]; allMembers: Member[] }> = ({ onLog, products, allMembers }) => {
    const [memberNumber, setMemberNumber] = useState('');
    const [form, setForm] = useState({ loanProductCode: '', principal: '', interest: '', weeklyScheduled: '', firstPaymentDate: '', termWeeks: '104', referenceNumber: '' });
    const [loading, setLoading] = useState(false);
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            const res = await migrationApi.migrateLoanDisbursement({
                memberNumber,
                loanProductCode: form.loanProductCode,
                principal: parseFloat(form.principal),
                interest: parseFloat(form.interest),
                weeklyScheduled: parseFloat(form.weeklyScheduled),
                firstPaymentDate: form.firstPaymentDate,
                termWeeks: parseInt(form.termWeeks),
                referenceNumber: form.referenceNumber,
            });
            onLog('success', 'LOAN DISBURSED', `${memberNumber} · KES ${form.principal} · LoanID: ${res.id}`);
            setForm({ loanProductCode: form.loanProductCode, principal: '', interest: '', weeklyScheduled: '', firstPaymentDate: '', termWeeks: '104', referenceNumber: '' });
        } catch (err) { onLog('error', 'LOAN DISBURSE FAILED', getApiErrorMessage(err, 'Unknown error')); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <MemberSelect value={memberNumber} onChange={setMemberNumber} allMembers={allMembers} />
            <Field label="Loan Product">
                <select required value={form.loanProductCode} onChange={e => set('loanProductCode', e.target.value)} className={inputCls}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Principal (KES)"><input required type="number" step="0.01" value={form.principal} onChange={e => set('principal', e.target.value)} className={inputCls} placeholder="155752.00" /></Field>
                <Field label="Total Interest (KES)"><input required type="number" step="0.01" value={form.interest} onChange={e => set('interest', e.target.value)} className={inputCls} placeholder="15575.20" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Weekly Installment (KES)"><input required type="number" step="0.01" value={form.weeklyScheduled} onChange={e => set('weeklyScheduled', e.target.value)} className={inputCls} placeholder="1642.07" /></Field>
                <Field label="Term (weeks)"><input required type="number" value={form.termWeeks} onChange={e => set('termWeeks', e.target.value)} className={inputCls} placeholder="104" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Field label="First Payment Date"><input required type="date" value={form.firstPaymentDate} onChange={e => set('firstPaymentDate', e.target.value)} className={inputCls} /></Field>
                <Field label="Reference Number"><input required value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)} className={inputCls} placeholder="MIG-CHA-L1-DISB" /></Field>
            </div>
            <RunButton loading={loading} label="Disburse Loan" />
        </form>
    );
};

const LoanRepayForm: React.FC<{ onLog: (l: LogLevel, action: string, detail: string) => void; allMembers: Member[] }> = ({ onLog, allMembers }) => {
    const [memberNumber, setMemberNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [ref, setRef] = useState('');
    const [loading, setLoading] = useState(false);

    // Batch repayment state
    const [batchMode, setBatchMode] = useState(false);
    const [batchRows, setBatchRows] = useState([{ amount: '', date: '', ref: '' }]);
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchCurrent, setBatchCurrent] = useState(0);

    const handleSingle = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await migrationApi.migrateLoanRepayment({ memberNumber, amount: parseFloat(amount), transactionDate: date, referenceNumber: ref });
            onLog('success', 'REPAYMENT POSTED', `${memberNumber} · KES ${amount} · ${date} · Ref: ${ref}`);
            setAmount(''); setDate(''); setRef('');
        } catch (err) { onLog('error', 'REPAYMENT FAILED', getApiErrorMessage(err, 'Unknown error')); }
        finally { setLoading(false); }
    };

    const addBatchRow = () => setBatchRows(r => [...r, { amount: '', date: '', ref: '' }]);
    const removeBatchRow = (i: number) => setBatchRows(r => r.filter((_, idx) => idx !== i));
    const updateBatchRow = (i: number, k: string, v: string) => setBatchRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

    const handleBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setBatchLoading(true);
        setBatchCurrent(0);
        for (let i = 0; i < batchRows.length; i++) {
            const row = batchRows[i];
            setBatchCurrent(i + 1);
            try {
                await migrationApi.migrateLoanRepayment({ memberNumber, amount: parseFloat(row.amount), transactionDate: row.date, referenceNumber: row.ref });
                onLog('success', `REPAYMENT ${i + 1}/${batchRows.length}`, `KES ${row.amount} · ${row.date} · ${row.ref}`);
            } catch (err) {
                onLog('error', `REPAYMENT ${i + 1}/${batchRows.length} FAILED`, getApiErrorMessage(err, 'Unknown error'));
            }
            // Small delay to avoid hammering the backend
            await new Promise(r => setTimeout(r, 250));
        }
        setBatchLoading(false);
    };

    return (
        <div className="space-y-4">
            <MemberSelect value={memberNumber} onChange={setMemberNumber} allMembers={allMembers} />

            {/* Mode toggle */}
            <div className="flex gap-2">
                <button type="button" onClick={() => setBatchMode(false)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all
                        ${!batchMode ? 'bg-amber-400 text-zinc-900 border-amber-400' : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
                    Single
                </button>
                <button type="button" onClick={() => setBatchMode(true)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all
                        ${batchMode ? 'bg-amber-400 text-zinc-900 border-amber-400' : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
                    Batch (week by week)
                </button>
            </div>

            {!batchMode ? (
                <form onSubmit={handleSingle} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Amount (KES)"><input required type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} placeholder="1000.00" /></Field>
                        <Field label="Reference"><input required value={ref} onChange={e => setRef(e.target.value)} className={inputCls} placeholder="CHA-L-REP-001" /></Field>
                    </div>
                    <Field label="Transaction Date"><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
                    <RunButton loading={loading} label="Post Repayment" />
                </form>
            ) : (
                <form onSubmit={handleBatch} className="space-y-3">
                    {/* Batch table header */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">
                        <span>Amount (KES)</span><span>Date</span><span>Reference</span><span />
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {batchRows.map((row, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
                                <input type="number" step="0.01" min="1" required value={row.amount}
                                       onChange={e => updateBatchRow(i, 'amount', e.target.value)}
                                       className={inputCls} placeholder="1000.00" />
                                <input type="date" required value={row.date}
                                       onChange={e => updateBatchRow(i, 'date', e.target.value)}
                                       className={inputCls} />
                                <input type="text" required value={row.ref}
                                       onChange={e => updateBatchRow(i, 'ref', e.target.value)}
                                       className={inputCls} placeholder={`CHA-L-REP-${String(i + 1).padStart(3, '0')}`} />
                                <button type="button" onClick={() => removeBatchRow(i)}
                                        disabled={batchRows.length === 1}
                                        className="text-zinc-600 hover:text-red-400 disabled:opacity-30 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addBatchRow}
                            className="w-full py-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all">
                        + Add Week
                    </button>
                    {batchLoading && (
                        <div className="flex items-center gap-2 text-xs text-amber-400">
                            <Loader2 size={12} className="animate-spin" />
                            Processing {batchCurrent} / {batchRows.length}…
                        </div>
                    )}
                    <RunButton loading={batchLoading} label={`Run ${batchRows.length} Repayment${batchRows.length > 1 ? 's' : ''}`} />
                </form>
            )}
        </div>
    );
};

const PenaltyForm: React.FC<{ onLog: (l: LogLevel, action: string, detail: string) => void; allMembers: Member[] }> = ({ onLog, allMembers }) => {
    const [memberNumber, setMemberNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [ref, setRef] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await migrationApi.migrateHistoricalPenalty({ memberNumber, amount: parseFloat(amount), penaltyDate: date, referenceNumber: ref });
            onLog('success', 'PENALTY APPLIED', `${memberNumber} · KES ${amount} · ${date}`);
            setAmount(''); setDate(''); setRef('');
        } catch (err) { onLog('error', 'PENALTY FAILED', getApiErrorMessage(err, 'Unknown error')); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <MemberSelect value={memberNumber} onChange={setMemberNumber} allMembers={allMembers} />
            <div className="grid grid-cols-2 gap-3">
                <Field label="Penalty Amount (KES)"><input required type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} placeholder="500.00" /></Field>
                <Field label="Reference"><input required value={ref} onChange={e => setRef(e.target.value)} className={inputCls} placeholder="CHA-P-REP-001" /></Field>
            </div>
            <Field label="Penalty Date"><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
            <RunButton loading={loading} label="Apply Penalty" />
        </form>
    );
};

const CronForm: React.FC<{ onLog: (l: LogLevel, action: string, detail: string) => void }> = ({ onLog }) => {
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setResult(null);
        try {
            const res = await migrationApi.runCronEvaluation({ evaluationDate: date });
            setResult(res);
            onLog('success', 'CRON EVALUATED', `Up to ${date} — ${JSON.stringify(res)}`);
        } catch (err) { onLog('error', 'CRON FAILED', getApiErrorMessage(err, 'Unknown error')); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Evaluation Date" hint="The system will evaluate all overdue installments up to this date and apply penalties.">
                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </Field>
            <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/30">
                <p className="text-xs text-amber-300 font-semibold mb-1">⚠ This triggers the penalty cron</p>
                <p className="text-xs text-zinc-400">It will mark all unpaid installments as OVERDUE and generate penalty records for each. Run this after posting all repayments for a period.</p>
            </div>
            <RunButton loading={loading} label="Run Evaluation" />
            {result && (
                <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                    <p className="text-xs font-semibold text-zinc-400 mb-1">Result</p>
                    <pre className="text-xs text-emerald-300 whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </form>
    );
};

// ─── Loan Refinance / Restructure Form ───────────────────────────────────────

const LoanRefinanceForm: React.FC<{
    onLog: (l: LogLevel, action: string, detail: string) => void;
    allMembers: Member[];
    products: LoanProduct[];
}> = ({ onLog, allMembers, products }) => {
    const [memberNumber, setMemberNumber] = useState('');
    const [loanId, setLoanId]             = useState('');
    const [lookingUp, setLookingUp]       = useState(false);
    const [loanLookupDone, setLoanLookupDone] = useState(false);
    const [form, setForm] = useState({
        loanProductCode: '',
        topUpAmount: '0',
        interestOverride: '',
        newTermWeeks: '',
        referenceNumber: '',
        historicalDateOverride: '',
    });
    const [loading, setLoading] = useState(false);
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleLookup = async () => {
        if (!memberNumber) return;
        setLookingUp(true);
        setLoanId('');
        setLoanLookupDone(false);
        try {
            const res = await migrationApi.getActiveLoanId(memberNumber);
            setLoanId(res.id);
            setLoanLookupDone(true);
            onLog('info', 'LOAN FOUND', `Member ${memberNumber} → Loan ID: ${res.id}`);
        } catch (err) {
            onLog('error', 'LOAN LOOKUP FAILED', getApiErrorMessage(err, 'No active loan found for member'));
        } finally {
            setLookingUp(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loanId) return;
        setLoading(true);
        try {
            const payload: LoanRefinanceRequest = {
                oldLoanId: loanId,
                loanProductCode: form.loanProductCode,
                topUpAmount: parseFloat(form.topUpAmount) || 0,
                newTermWeeks: parseInt(form.newTermWeeks),
                referenceNumber: form.referenceNumber,
            };
            if (form.interestOverride) payload.interestOverride = parseFloat(form.interestOverride);
            if (form.historicalDateOverride) payload.historicalDateOverride = form.historicalDateOverride;

            const res = await migrationApi.refinanceLoan(payload);
            onLog('success', 'LOAN REFINANCED', `Member ${memberNumber} · Old: ${loanId.slice(0,8)}… · New ID: ${res.id}`);
            setLoanId(''); setLoanLookupDone(false);
            setForm({ loanProductCode: form.loanProductCode, topUpAmount: '0', interestOverride: '', newTermWeeks: '', referenceNumber: '', historicalDateOverride: '' });
        } catch (err) {
            onLog('error', 'REFINANCE FAILED', getApiErrorMessage(err, 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Step 1: Identify the member and their active loan */}
            <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/30">
                <p className="text-xs text-amber-300 font-semibold mb-2">Step 1 — Find the member's active loan</p>
                <MemberSelect value={memberNumber} onChange={v => { setMemberNumber(v); setLoanId(''); setLoanLookupDone(false); }} allMembers={allMembers} />
                <button type="button" onClick={handleLookup} disabled={!memberNumber || lookingUp}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg
                               bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-semibold
                               transition-colors disabled:opacity-40">
                    {lookingUp ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {lookingUp ? 'Looking up…' : 'Get Active Loan'}
                </button>
                {loanLookupDone && loanId && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
                        <CheckCircle2 size={13} />
                        <span>Loan ID: <code className="font-mono">{loanId}</code></span>
                    </div>
                )}
            </div>

            {/* Step 2: Enter new loan terms */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className={`space-y-4 transition-opacity ${loanLookupDone ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <Field label="Loan Product">
                        <select required value={form.loanProductCode} onChange={e => set('loanProductCode', e.target.value)} className={inputCls}>
                            <option value="">— Select product —</option>
                            {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Top-Up Amount (KES)" hint="0 = pure restructure, no extra cash">
                            <input type="number" step="0.01" min="0" value={form.topUpAmount} onChange={e => set('topUpAmount', e.target.value)} className={inputCls} placeholder="0.00" />
                        </Field>
                        <Field label="Interest Rate Override (%)" hint="Leave blank to use product default">
                            <input type="number" step="0.01" min="0" value={form.interestOverride} onChange={e => set('interestOverride', e.target.value)} className={inputCls} placeholder="e.g. 10.00" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="New Term (weeks)">
                            <input required type="number" min="1" value={form.newTermWeeks} onChange={e => set('newTermWeeks', e.target.value)} className={inputCls} placeholder="52" />
                        </Field>
                        <Field label="Reference Number">
                            <input required value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)} className={inputCls} placeholder="REF-REFIN-001" />
                        </Field>
                    </div>

                    <Field label="Historical Date Override" hint="Backdates the refinance to this date (leave blank for today)">
                        <input type="date" value={form.historicalDateOverride} onChange={e => set('historicalDateOverride', e.target.value)} className={inputCls} />
                    </Field>
                </div>

                <RunButton loading={loading} label="Execute Refinance" />
            </form>
        </div>
    );
};

// ─── Excel Import Form ────────────────────────────────────────────────────────

interface ExcelRow { [key: string]: string | number; }

type ExcelSheetType = 'savings' | 'withdrawal' | 'repayment' | 'penalty' | 'skip';

const SHEET_TYPES: { value: ExcelSheetType; label: string }[] = [
    { value: 'savings',    label: 'Savings Deposits'    },
    { value: 'withdrawal', label: 'Savings Withdrawals' },
    { value: 'repayment',  label: 'Loan Repayments'     },
    { value: 'penalty',    label: 'Penalties'            },
    { value: 'skip',       label: '— Skip this sheet —' },
];

const ExcelImportForm: React.FC<{
    onLog: (l: LogLevel, action: string, detail: string) => void;
}> = ({ onLog }) => {
    const [sheets, setSheets]               = useState<{ name: string; rows: ExcelRow[]; type: ExcelSheetType }[]>([]);
    const [importing, setImporting]         = useState(false);
    const [progress, setProgress]           = useState<{ current: number; total: number } | null>(null);
    const [fileName, setFileName]           = useState('');
    const fileRef                           = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const XLSX = (await import('xlsx')) as typeof import('xlsx');
                const data = new Uint8Array(ev.target!.result as ArrayBuffer);
                const workbook: XLSX.WorkBook = XLSX.read(data, { type: 'array', cellDates: true });

                const parsed = workbook.SheetNames.map((name: string) => {
                    const ws: XLSX.WorkSheet = workbook.Sheets[name];
                    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

                    const rows: ExcelRow[] = rawRows.map((row) => {
                        const result: ExcelRow = {};
                        for (const key in row) {
                            const value = row[key];
                            result[key] = typeof value === 'string'
                                ? value
                                : (typeof value === 'number' ? value : String(value ?? ''));
                        }
                        return result;
                    });

                    // Auto-detect type from sheet name
                    const lower = name.toLowerCase();
                    let type: ExcelSheetType = 'skip';
                    if (lower.includes('saving') || lower.includes('deposit')) type = 'savings';
                    else if (lower.includes('withdraw')) type = 'withdrawal';
                    else if (lower.includes('repay') || lower.includes('payment')) type = 'repayment';
                    else if (lower.includes('penalt') || lower.includes('fine')) type = 'penalty';

                    return { name, rows, type };
                });

                setSheets(parsed);
            } catch {
                onLog('error', 'EXCEL PARSE FAILED', 'Could not read file. Ensure it is a valid .xlsx file and the xlsx package is installed.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const setSheetType = (idx: number, type: ExcelSheetType) => {
        setSheets(prev => prev.map((s, i) => i === idx ? { ...s, type } : s));
    };

    const totalImportable = sheets.filter(s => s.type !== 'skip').reduce((acc, s) => acc + s.rows.length, 0);

    const handleImport = async () => {
        setImporting(true);
        let total = 0;
        let done = 0;

        // Count total
        for (const sheet of sheets) if (sheet.type !== 'skip') total += sheet.rows.length;
        setProgress({ current: 0, total });

        for (const sheet of sheets) {
            if (sheet.type === 'skip') continue;
            for (const row of sheet.rows) {
                done++;
                setProgress({ current: done, total });
                try {
                    const memberNumber = String(row['Member Number'] || row['memberNumber'] || row['member_number'] || '');
                    const amount = parseFloat(String(row['Amount'] || row['amount'] || '0'));
                    const date = String(row['Date'] || row['date'] || row['Transaction Date'] || '');
                    const ref = String(row['Reference'] || row['reference'] || row['Ref'] || `EXCEL-${done}`);

                    if (!memberNumber || !amount || !date) {
                        onLog('error', `SKIP ROW ${done}`, `Sheet "${sheet.name}" row ${done}: missing memberNumber/amount/date`);
                        continue;
                    }

                    if (sheet.type === 'savings') {
                        const res = await migrationApi.migrateSavings({ memberNumber, amount, referenceNumber: ref, transactionDate: date });
                        onLog('success', `SAVINGS ${done}/${total}`, `${memberNumber} · KES ${amount} · ${res.transactionReference}`);
                    } else if (sheet.type === 'withdrawal') {
                        const res = await migrationApi.migrateWithdrawal({ memberNumber, amount, referenceNumber: ref, transactionDate: date });
                        onLog('success', `WITHDRAWAL ${done}/${total}`, `${memberNumber} · KES ${amount} · ${res.transactionReference}`);
                    } else if (sheet.type === 'repayment') {
                        await migrationApi.migrateLoanRepayment({ memberNumber, amount, transactionDate: date, referenceNumber: ref });
                        onLog('success', `REPAYMENT ${done}/${total}`, `${memberNumber} · KES ${amount} · ${date}`);
                    } else if (sheet.type === 'penalty') {
                        await migrationApi.migrateHistoricalPenalty({ memberNumber, amount, penaltyDate: date, referenceNumber: ref });
                        onLog('success', `PENALTY ${done}/${total}`, `${memberNumber} · KES ${amount} · ${date}`);
                    }
                } catch (err) {
                    onLog('error', `ROW ${done} FAILED`, getApiErrorMessage(err, 'Unknown error'));
                }
                await new Promise(r => setTimeout(r, 200));
            }
        }

        setProgress(null);
        setImporting(false);
        onLog('info', 'EXCEL IMPORT COMPLETE', `Processed ${done} rows across ${sheets.filter(s => s.type !== 'skip').length} sheets`);
    };

    return (
        <div className="space-y-5">
            {/* Upload zone */}
            <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-amber-400 rounded-xl p-8
                           flex flex-col items-center gap-3 cursor-pointer transition-colors group">
                <Upload size={28} className="text-zinc-600 group-hover:text-amber-400 transition-colors" />
                <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-300">
                        {fileName || 'Click to upload Excel file'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                        .xlsx format · Sheets: Savings, Withdrawals, Repayments, Penalties
                    </p>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            </div>

            {/* Column format guide */}
            <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Expected Columns</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                    {[
                        ['Member Number', 'e.g. BVL-2022-000001'],
                        ['Amount',        'e.g. 1500.00'],
                        ['Date',          'e.g. 2022-01-15'],
                        ['Reference',     'e.g. DEP-001 (optional)'],
                    ].map(([col, ex]) => (
                        <div key={col} className="flex gap-2">
                            <span className="text-amber-400 shrink-0">{col}</span>
                            <span className="text-zinc-500">{ex}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sheet configuration */}
            {sheets.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Configure Sheets ({sheets.length} detected)
                    </p>
                    {sheets.map((sheet, idx) => (
                        <div key={sheet.name} className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                            <FileSpreadsheet size={15} className="text-emerald-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-200 truncate">{sheet.name}</p>
                                <p className="text-[10px] text-zinc-500">{sheet.rows.length} rows</p>
                            </div>
                            <select value={sheet.type} onChange={e => setSheetType(idx, e.target.value as ExcelSheetType)}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-400">
                                {SHEET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                    ))}

                    {/* Progress */}
                    {progress && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-zinc-400">
                                <span>Importing…</span>
                                <span>{progress.current} / {progress.total}</span>
                            </div>
                            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={importing || totalImportable === 0}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg
                                   bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-sm
                                   transition-all disabled:opacity-50 disabled:cursor-not-allowed
                                   shadow-lg shadow-amber-400/20 active:scale-[0.98]">
                        {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                        {importing ? `Importing ${progress?.current}/${progress?.total}…` : `Import ${totalImportable} rows`}
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MigrationPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('member');
    const [log, setLog] = useState<LogEntry[]>([]);
    const [products, setProducts] = useState<LoanProduct[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [logCollapsed, setLogCollapsed] = useState(false);

    useEffect(() => {
        // Load loan products
        loanApi.getProducts().then(setProducts).catch(() => {});

        // Load ALL members once — with 10 members this is the right approach:
        // instant client-side filtering, no debounce, no empty-dropdown issues
        memberApi.getMembers(undefined, undefined, 0, 100)
            .then(page => {
                setAllMembers(page.content ?? []);
                setMembersLoading(false);
            })
            .catch(() => {
                setMembersLoading(false);
            });
    }, []);

    const addLog = useCallback((level: LogLevel, action: string, detail: string) => {
        setLog(prev => [...prev, {
            id: `${Date.now()}-${Math.random()}`,
            level,
            action,
            detail,
            timestamp: new Date().toLocaleTimeString(),
        }]);
    }, []);

    const copyLog = () => {
        const text = log.map(e => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.action} — ${e.detail}`).join('\n');
        navigator.clipboard.writeText(text).catch(() => {});
    };

    const successCount = log.filter(e => e.level === 'success').length;
    const errorCount   = log.filter(e => e.level === 'error').length;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">

            {/* Page header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
                        <Database size={20} className="text-zinc-900" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Historical Data Migration</h1>
                        <p className="text-xs text-zinc-500">Manually migrate historical SACCO records. All entries are backdated to the original dates.</p>
                    </div>
                </div>

                {/* Stats bar */}
                {log.length > 0 && (
                    <div className="flex items-center gap-4 mt-4 pl-1">
                        <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-zinc-400">{successCount} success</span>
                        </div>
                        {errorCount > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                <span className="text-zinc-400">{errorCount} failed</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                            <TrendingUp size={11} />
                            <span>{log.length} total operations</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">

                {/* Left: Operation selector */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-1 mb-3">
                        Operation Type
                    </p>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left
                                ${activeTab === tab.id
                                    ? 'bg-amber-400/10 border-amber-400/50 text-amber-300'
                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700 hover:text-zinc-300'}`}>
                            <span className={activeTab === tab.id ? 'text-amber-400' : 'text-zinc-600'}>{tab.icon}</span>
                            <div>
                                <div className="text-xs font-semibold">{tab.label}</div>
                                <div className="text-[10px] opacity-60 mt-0.5">{tab.desc}</div>
                            </div>
                            {activeTab === tab.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Right: Form + Log */}
                <div className="space-y-5">

                    {/* Form card */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
                            <span className="text-amber-400">
                                {TABS.find(t => t.id === activeTab)?.icon}
                            </span>
                            <div>
                                <h2 className="text-sm font-bold text-zinc-100">
                                    {TABS.find(t => t.id === activeTab)?.label}
                                </h2>
                                <p className="text-xs text-zinc-500">
                                    {TABS.find(t => t.id === activeTab)?.desc}
                                </p>
                            </div>
                            {membersLoading && (
                                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-600">
                                    <Loader2 size={11} className="animate-spin" />
                                    Loading members…
                                </div>
                            )}
                            {!membersLoading && allMembers.length > 0 && (
                                <div className="ml-auto text-[10px] text-zinc-600">
                                    {allMembers.length} members loaded
                                </div>
                            )}
                        </div>
                        <div className="p-6">
                            {activeTab === 'member'         && <MemberForm onLog={addLog} />}
                            {activeTab === 'savings'        && <SavingsForm onLog={addLog} type="savings"    allMembers={allMembers} />}
                            {activeTab === 'withdrawal'     && <SavingsForm onLog={addLog} type="withdrawal" allMembers={allMembers} />}
                            {activeTab === 'loan-disburse'  && <LoanDisburseForm onLog={addLog} products={products} allMembers={allMembers} />}
                            {activeTab === 'loan-repay'     && <LoanRepayForm onLog={addLog} allMembers={allMembers} />}
                            {activeTab === 'loan-refinance' && <LoanRefinanceForm onLog={addLog} allMembers={allMembers} products={products} />}
                            {activeTab === 'penalty'        && <PenaltyForm onLog={addLog} allMembers={allMembers} />}
                            {activeTab === 'cron'           && <CronForm onLog={addLog} />}
                            {activeTab === 'excel'          && <ExcelImportForm onLog={addLog} />}
                        </div>
                    </div>

                    {/* Activity log */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${log.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-zinc-700'}`} />
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Activity Log
                                </span>
                                {log.length > 0 && (
                                    <span className="text-[10px] text-zinc-600">{log.length} entries</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {log.length > 0 && (
                                    <>
                                        <button onClick={copyLog} className="text-zinc-600 hover:text-zinc-400 transition-colors p-1" title="Copy log">
                                            <Copy size={13} />
                                        </button>
                                        <button onClick={() => setLog([])} className="text-zinc-600 hover:text-red-400 transition-colors p-1" title="Clear log">
                                            <Trash2 size={13} />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setLogCollapsed(c => !c)} className="text-zinc-600 hover:text-zinc-400 transition-colors p-1">
                                    {logCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </button>
                            </div>
                        </div>
                        {!logCollapsed && (
                            <div className="p-4">
                                <LogPanel entries={log} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MigrationPage;