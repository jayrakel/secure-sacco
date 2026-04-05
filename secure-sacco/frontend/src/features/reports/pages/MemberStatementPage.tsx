import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSettings } from '../../settings/context/useSettings';
import { reportApi, type StatementItemDTO, type StatementResponseDTO } from '../api/report-api';
import { memberApi, type Member } from '../../members/api/member-api';
import {
    ArrowLeft, FileText, Download, Printer, Search,
    Loader2, X, Minus, CalendarDays,
    PiggyBank, Coins, AlertTriangle, TrendingUp, TrendingDown,
    Building2, BadgeCheck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = 'SAVINGS' | 'LOANS' | 'PENALTIES';

interface SelectedMember {
    id: string;
    memberNumber: string;
    fullName: string;
}

interface EnrichedRow extends StatementItemDTO {
    runningBalance: number;
    isCredit: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

const CREDIT_TYPES = new Set(['DEPOSIT', 'REPAYMENT', 'WAIVER']);

const QUICK_RANGES = [
    { label: 'This month',    getDates: () => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: TODAY }; } },
    { label: 'Last month',    getDates: () => { const d = new Date(); d.setMonth(d.getMonth()-1); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}` }; } },
    { label: 'Last 3 months', getDates: () => { const d = new Date(); d.setMonth(d.getMonth()-3); return { from: d.toISOString().split('T')[0], to: TODAY }; } },
    { label: 'This year',     getDates: () => ({ from: `${new Date().getFullYear()}-01-01`, to: TODAY }) },
    { label: 'All time',      getDates: () => ({ from: '', to: '' }) },
];

const MODULE_BADGE: Record<Module, { bg: string; text: string; dot: string }> = {
    SAVINGS:   { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500'  },
    LOANS:     { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-500'      },
    PENALTIES: { bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'      },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

const toIsoDateTime = (date: string, isEnd = false) =>
    date ? `${date}T${isEnd ? '23:59:59' : '00:00:00'}` : undefined;

const statementRef = () => {
    const now = new Date();
    return `STMT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const MemberStatementPage: React.FC = () => {
    const { user }     = useAuth();
    const { settings } = useSettings();
    const isStaff      = user?.permissions?.includes('REPORTS_READ') ?? false;
    const saccoName    = settings?.saccoName ?? 'Secure SACCO';

    // Member search
    const [memberSearch, setMemberSearch]               = useState('');
    const [memberResults, setMemberResults]             = useState<Member[]>([]);
    const [memberSearchOpen, setMemberSearchOpen]       = useState(false);
    const [memberSearchLoading, setMemberSearchLoading] = useState(false);
    const [selectedMember, setSelectedMember]           = useState<SelectedMember | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Dates
    const [fromDate, setFromDate] = useState('');
    const [toDate,   setToDate]   = useState(TODAY);

    // Statement
    const [statement,  setStatement]  = useState<StatementItemDTO[]>([]);
    const [response,   setResponse]   = useState<StatementResponseDTO | null>(null);
    const [loading,    setLoading]    = useState(false);
    const [error,      setError]      = useState('');
    const [hasFetched, setHasFetched] = useState(false);
    const [stmtRef]                   = useState(statementRef);
    const generatedAt                 = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' });

    // Close member dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node))
                setMemberSearchOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // Debounced member search
    useEffect(() => {
        if (!isStaff || !memberSearch.trim()) { setMemberResults([]); return; }
        const t = setTimeout(async () => {
            setMemberSearchLoading(true);
            try   { const res = await memberApi.getMembers(memberSearch, undefined, 0, 8); setMemberResults(res.content); }
            catch { setMemberResults([]); }
            finally { setMemberSearchLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [memberSearch, isStaff]);

    const activeMemberId     = isStaff ? (selectedMember?.id ?? null)       : (user?.memberId ?? null);
    const activeMemberName   = isStaff ? (selectedMember?.fullName ?? '')   : (user ? `${user.firstName} ${user.lastName}` : '');
    const activeMemberNumber = isStaff ? selectedMember?.memberNumber       : user?.memberNumber;

    const fetchStatement = useCallback(async () => {
        if (!activeMemberId) { setError('Please select a member first.'); return; }
        setError(''); setLoading(true); setHasFetched(false);
        try {
            const data = await reportApi.getMemberStatement(
                activeMemberId,
                toIsoDateTime(fromDate, false),
                toIsoDateTime(toDate, true),
            );
            // Backend already returns in correct chronological order with proper transaction sequencing
            // Just ensure it's in ascending order (earliest first)
            data.items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setStatement(data.items);
            setResponse(data);
            setHasFetched(true);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg || 'Failed to load statement. Please try again.');
        } finally { setLoading(false); }
    }, [activeMemberId, fromDate, toDate]);

    // Members auto-fetch on load
    useEffect(() => {
        if (!isStaff && activeMemberId) fetchStatement();
    }, [isStaff, activeMemberId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Derived data ──────────────────────────────────────────────────────────

    const { rows, openingBalance, closingBalance, stats } = useMemo(() => {
        let balance = 0;
        const enriched: EnrichedRow[] = statement.map(item => {
            const isCredit = CREDIT_TYPES.has(item.type);
            // Running balance only tracks savings
            if (item.module === 'SAVINGS') {
                balance = isCredit ? balance + item.amount : balance - item.amount;
            }
            return { ...item, runningBalance: balance, isCredit };
        });

        // Use the summary from the response if available, otherwise calculate from statement
        const statsObj = response?.summary ? {
            savingsDeposits: response.summary.savingsDeposited,
            savingsWithdrawals: response.summary.savingsWithdrawn,
            savingsNet: response.summary.savingsDeposited - response.summary.savingsWithdrawn,
            loanDisbursed: response.summary.loanDisbursed,
            loanRepaid: response.summary.loanRepaid,
            loanOutstanding: response.summary.loanOutstanding,  // ✅ This is now correct!
            penaltiesCharged: response.summary.penaltiesCharged,
            penaltiesPaid: response.summary.penaltiesPaid,
        } : {
            savingsDeposits: 0,
            savingsWithdrawals: 0,
            savingsNet: 0,
            loanDisbursed: 0,
            loanRepaid: 0,
            loanOutstanding: 0,
            penaltiesCharged: 0,
            penaltiesPaid: 0,
        };

        return {
            rows: enriched,
            openingBalance: 0,
            closingBalance: balance,
            stats: statsObj,
        };
    }, [statement, response]);

    const handleExportCSV = () => {
        const header = 'Date,Module,Type,Reference,Description,Debit,Credit,Balance\n';
        const rowsCsv = rows.map(r =>
            [fmtDate(r.date), r.module, r.type, r.reference ?? '',
                `"${r.description}"`,
                r.isCredit ? '' : r.amount.toFixed(2),
                r.isCredit ? r.amount.toFixed(2) : '',
                r.module === 'SAVINGS' ? r.runningBalance.toFixed(2) : ''
            ].join(',')
        ).join('\n');
        const blob = new Blob([header + rowsCsv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `Statement_${activeMemberNumber ?? 'member'}_${fromDate || 'all'}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Print stylesheet ─────────────────────────────────────── */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #statement-printable, #statement-printable * { visibility: visible !important; }
                    #statement-printable { position: fixed; top: 0; left: 0; right: 0; width: 100%; padding: 24px 32px; background: white; }
                    .no-print { display: none !important; }
                    @page { size: A4; margin: 0; }
                }
            `}</style>

            <div className="space-y-5 max-w-5xl mx-auto pb-16">

                {/* ── Page header (screen only) ───────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
                    <div className="flex items-center gap-4">
                        <Link to="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                            <ArrowLeft size={16} /> Reports
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="text-blue-600" size={22} />
                                Member Statement
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">Savings · Loans · Penalties</p>
                        </div>
                    </div>
                    {hasFetched && statement.length > 0 && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <Download size={14} /> CSV
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <Printer size={14} /> Print / PDF
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Controls (screen only) ──────────────────────────── */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5 no-print">

                    {/* Staff: member search */}
                    {isStaff && (
                        <div ref={searchRef} className="relative">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Member</label>
                            {selectedMember ? (
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                        {selectedMember.fullName[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-800 truncate">{selectedMember.fullName}</div>
                                        <div className="text-xs text-slate-400 font-mono">{selectedMember.memberNumber}</div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedMember(null); setStatement([]); setHasFetched(false); setMemberSearch(''); }}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white transition-colors"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or member number…"
                                        value={memberSearch}
                                        onChange={e => { setMemberSearch(e.target.value); setMemberSearchOpen(true); }}
                                        onFocus={() => memberSearch && setMemberSearchOpen(true)}
                                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                                    />
                                    {memberSearchLoading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                                </div>
                            )}
                            {memberSearchOpen && memberResults.length > 0 && !selectedMember && (
                                <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                                    {memberResults.map(m => (
                                        <button
                                            key={m.id}
                                            onMouseDown={() => { setSelectedMember({ id: m.id, memberNumber: m.memberNumber, fullName: `${m.firstName} ${m.lastName}` }); setMemberSearch(''); setMemberSearchOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
                                                {m.firstName[0]}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-slate-800">{m.firstName} {m.lastName}</div>
                                                <div className="text-xs text-slate-400 font-mono">{m.memberNumber}</div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {m.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date range */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            <CalendarDays size={13} className="inline mr-1.5" />
                            Date Range
                        </label>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex items-center gap-2">
                                <div>
                                    <div className="text-xs text-slate-400 mb-1">From</div>
                                    <input type="date" max={toDate || TODAY} value={fromDate} onChange={e => setFromDate(e.target.value)}
                                           className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400" />
                                </div>
                                <Minus size={13} className="text-slate-300 mt-4" />
                                <div>
                                    <div className="text-xs text-slate-400 mb-1">To</div>
                                    <input type="date" min={fromDate} max={TODAY} value={toDate} onChange={e => setToDate(e.target.value)}
                                           className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_RANGES.map(r => (
                                    <button key={r.label}
                                            onClick={() => { const d = r.getDates(); setFromDate(d.from); setToDate(d.to); }}
                                            className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-colors"
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-4">
                        <button
                            onClick={fetchStatement}
                            disabled={loading || (isStaff && !selectedMember)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
                        >
                            {loading
                                ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                                : <><FileText size={14} /> Generate Statement</>
                            }
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm no-print">
                        {error}
                    </div>
                )}

                {/* ── Loading ─────────────────────────────────────────── */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 no-print">
                        <Loader2 className="animate-spin mb-3 text-slate-600" size={32} />
                        <p className="text-sm font-medium">Generating statement…</p>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════
                    PRINTABLE STATEMENT DOCUMENT
                ════════════════════════════════════════════════════════ */}
                {!loading && hasFetched && (
                    <div id="statement-printable" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* ── Letterhead ───────────────────────────────── */}
                        <div className="bg-slate-900 px-8 py-6">
                            <div className="flex items-start justify-between gap-6">
                                {/* Left: SACCO identity */}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                                        <Building2 size={22} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-xl tracking-tight leading-none">{saccoName}</div>
                                        <div className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Account Statement</div>
                                    </div>
                                </div>
                                {/* Right: Statement meta */}
                                <div className="text-right text-xs text-slate-400 space-y-1">
                                    <div className="text-slate-300 font-mono font-semibold text-sm">{stmtRef}</div>
                                    <div>Generated: <span className="text-slate-300">{generatedAt}</span></div>
                                    <div>
                                        Period:&nbsp;
                                        <span className="text-slate-300">
                                            {fromDate ? fmtDate(fromDate + 'T00:00:00') : 'All time'}
                                            {toDate ? ` — ${fmtDate(toDate + 'T00:00:00')}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Member info bar ───────────────────────────── */}
                        <div className="border-b border-slate-100 bg-slate-50 px-8 py-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center text-base font-bold shrink-0">
                                    {activeMemberName?.[0] ?? '?'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-base leading-tight">{activeMemberName}</div>
                                    {activeMemberNumber && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <BadgeCheck size={12} className="text-emerald-600" />
                                            <span className="text-xs font-mono text-slate-500">{activeMemberNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <div className="text-center">
                                    <div className="text-xs text-slate-400 uppercase tracking-wide">Transactions</div>
                                    <div className="font-bold text-slate-800 text-lg leading-none mt-0.5">{statement.length}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-slate-400 uppercase tracking-wide">Closing Balance</div>
                                    <div className={`font-bold text-lg leading-none mt-0.5 ${closingBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {fmt(closingBalance)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {statement.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <FileText size={40} className="mb-3 text-slate-200" />
                                <p className="font-semibold text-slate-500">No transactions found</p>
                                <p className="text-sm mt-1">
                                    {fromDate || toDate
                                        ? 'No activity recorded in this date range.'
                                        : 'This member has no recorded transactions yet.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* ── Summary cards ─────────────────────── */}
                                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                                    {/* Savings */}
                                    <div className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <PiggyBank size={13} className="text-emerald-600" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Savings</span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Deposits</span>
                                                <span className="font-semibold text-emerald-700 font-mono">+{fmt(stats.savingsDeposits)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Withdrawals</span>
                                                <span className="font-semibold text-red-600 font-mono">−{fmt(stats.savingsWithdrawals)}</span>
                                            </div>
                                            <div className="flex justify-between pt-1.5 border-t border-slate-100">
                                                <span className="font-bold text-slate-700">Net</span>
                                                <span className={`font-bold font-mono ${stats.savingsNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                    {stats.savingsNet >= 0 ? '+' : ''}{fmt(stats.savingsNet)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Loans */}
                                    <div className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <Coins size={13} className="text-sky-600" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Loans</span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Disbursed</span>
                                                <span className="font-semibold text-sky-700 font-mono">{fmt(stats.loanDisbursed)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Repaid</span>
                                                <span className="font-semibold text-emerald-700 font-mono">+{fmt(stats.loanRepaid)}</span>
                                            </div>
                                            <div className="flex justify-between pt-1.5 border-t border-slate-100">
                                                <span className="font-bold text-slate-700">Outstanding</span>
                                                <span className={`font-bold font-mono ${stats.loanOutstanding > 0 ? 'text-sky-700' : 'text-emerald-700'}`}>
                                                    {fmt(Math.max(0, stats.loanOutstanding))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Penalties */}
                                    <div className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <AlertTriangle size={13} className="text-red-500" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Penalties</span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Charged</span>
                                                <span className="font-semibold text-red-600 font-mono">−{fmt(stats.penaltiesCharged)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Paid / Waived</span>
                                                <span className="font-semibold text-emerald-700 font-mono">+{fmt(stats.penaltiesPaid)}</span>
                                            </div>
                                            <div className="flex justify-between pt-1.5 border-t border-slate-100">
                                                <span className="font-bold text-slate-700">Outstanding</span>
                                                <span className={`font-bold font-mono ${response?.summary?.penaltiesOutstanding > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                    {fmt(Math.max(0, response?.summary?.penaltiesOutstanding ?? 0))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Transaction table ──────────────────── */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="px-5 py-3 text-left w-28">Date</th>
                                            <th className="px-5 py-3 text-left w-36">Reference</th>
                                            <th className="px-5 py-3 text-left">Description</th>
                                            <th className="px-5 py-3 text-right w-32">Debit (KES)</th>
                                            <th className="px-5 py-3 text-right w-32">Credit (KES)</th>
                                            <th className="px-5 py-3 text-right w-36 bg-slate-100">Balance (KES)</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {/* Opening balance row */}
                                        <tr className="bg-slate-900/3 border-b border-slate-100">
                                            <td colSpan={5} className="px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                Opening Balance
                                                {fromDate && <span className="ml-2 font-normal text-slate-400">{fmtDate(fromDate + 'T00:00:00')}</span>}
                                            </td>
                                            <td className="px-5 py-2.5 text-right font-bold font-mono text-slate-700 bg-slate-50">
                                                {fmt(openingBalance)}
                                            </td>
                                        </tr>

                                        {/* Transaction rows */}
                                        {rows.map((row, idx) => {
                                            const badge = MODULE_BADGE[row.module as Module] ?? MODULE_BADGE.SAVINGS;
                                            const showBalance = row.module === 'SAVINGS';
                                            return (
                                                <tr
                                                    key={idx}
                                                    className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                                                >
                                                    {/* Date */}
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <div className="text-xs font-semibold text-slate-700">{fmtDate(row.date)}</div>
                                                    </td>

                                                    {/* Reference */}
                                                    <td className="px-5 py-3">
                                                        <div className="text-xs font-mono text-slate-500 truncate max-w-32.5" title={row.reference}>
                                                            {row.reference || '—'}
                                                        </div>
                                                    </td>

                                                    {/* Description */}
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                                    {row.type}
                                                                </span>
                                                            <span className="text-slate-700 text-xs">{row.description}</span>
                                                        </div>
                                                    </td>

                                                    {/* Debit */}
                                                    <td className="px-5 py-3 text-right">
                                                        {!row.isCredit ? (
                                                            <div className="flex items-center justify-end gap-1 text-red-600 font-mono font-semibold text-xs">
                                                                <TrendingDown size={11} />
                                                                {fmt(row.amount)}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-200 text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Credit */}
                                                    <td className="px-5 py-3 text-right">
                                                        {row.isCredit ? (
                                                            <div className="flex items-center justify-end gap-1 text-emerald-600 font-mono font-semibold text-xs">
                                                                <TrendingUp size={11} />
                                                                {fmt(row.amount)}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-200 text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Running balance (savings only) */}
                                                    <td className="px-5 py-3 text-right bg-slate-50/50">
                                                        {showBalance ? (
                                                            <span className={`font-mono font-bold text-xs ${row.runningBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                                    {fmt(row.runningBalance)}
                                                                </span>
                                                        ) : (
                                                            <span className="text-slate-200 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {/* Closing balance row */}
                                        <tr className="bg-slate-900 text-white">
                                            <td colSpan={5} className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-300">
                                                Closing Balance
                                                {toDate && <span className="ml-2 font-normal text-slate-500">{fmtDate(toDate + 'T00:00:00')}</span>}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                    <span className={`font-mono font-bold text-sm ${closingBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {fmt(closingBalance)}
                                                    </span>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── Statement footer ───────────────────── */}
                                <div className="px-8 py-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-lg">
                                        This statement is computer generated and does not require a signature. For queries,
                                        please contact <span className="text-slate-600 font-medium">{saccoName}</span> quoting reference <span className="font-mono text-slate-600">{stmtRef}</span>.
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <BadgeCheck size={12} className="text-emerald-500" />
                                        Verified statement
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Empty state for staff before selecting member */}
                {!loading && !hasFetched && isStaff && !error && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 no-print">
                        <FileText size={36} className="mb-3 text-slate-200" />
                        <p className="text-sm">Select a member and click Generate to produce their statement.</p>
                    </div>
                )}
            </div>
        </>
    );
};