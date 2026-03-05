import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { reportApi, type StatementItemDTO } from '../api/report-api';
import { memberApi, type Member } from '../../members/api/member-api';
import {
    ArrowLeft,
    FileText,
    Download,
    Printer,
    Search,
    Loader2,
    PiggyBank,
    Coins,
    AlertTriangle,
    CalendarDays,
    X,
    Minus,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Module = 'SAVINGS' | 'LOANS' | 'PENALTIES';

interface SelectedMember {
    id: string;
    memberNumber: string;
    fullName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

const QUICK_RANGES = [
    { label: 'This month',    getDates: () => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: TODAY }; } },
    { label: 'Last month',    getDates: () => { const d = new Date(); d.setMonth(d.getMonth()-1); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()}` }; } },
    { label: 'Last 3 months', getDates: () => { const to = TODAY; const d = new Date(); d.setMonth(d.getMonth()-3); return { from: d.toISOString().split('T')[0], to }; } },
    { label: 'This year',     getDates: () => ({ from: `${new Date().getFullYear()}-01-01`, to: TODAY }) },
    { label: 'All time',      getDates: () => ({ from: '', to: '' }) },
];

// ─── Visual config per module ─────────────────────────────────────────────────
const MODULE_CONFIG: Record<Module, {
    label: string;
    icon: React.ElementType;
    timelineDot: string;
    timelineLine: string;
    sectionBg: string;
    sectionBorder: string;
    headerBg: string;
    headerText: string;
    badgeBg: string;
    badgeText: string;
}> = {
    SAVINGS: {
        label: 'Savings',
        icon: PiggyBank,
        timelineDot: 'bg-emerald-500',
        timelineLine: 'border-emerald-200',
        sectionBg: 'bg-emerald-50/30',
        sectionBorder: 'border-emerald-200',
        headerBg: 'bg-emerald-600',
        headerText: 'text-white',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-800',
    },
    LOANS: {
        label: 'Loans',
        icon: Coins,
        timelineDot: 'bg-blue-500',
        timelineLine: 'border-blue-200',
        sectionBg: 'bg-blue-50/30',
        sectionBorder: 'border-blue-200',
        headerBg: 'bg-blue-600',
        headerText: 'text-white',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-800',
    },
    PENALTIES: {
        label: 'Penalties',
        icon: AlertTriangle,
        timelineDot: 'bg-red-500',
        timelineLine: 'border-red-200',
        sectionBg: 'bg-red-50/30',
        sectionBorder: 'border-red-200',
        headerBg: 'bg-red-600',
        headerText: 'text-white',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-800',
    },
};

// Types that represent incoming value (credit)
const CREDIT_TYPES = new Set(['DEPOSIT', 'REPAYMENT', 'WAIVER']);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

const toIsoDateTime = (date: string, isEnd = false) =>
    date ? `${date}T${isEnd ? '23:59:59' : '00:00:00'}` : undefined;

// ─── ModuleSection ────────────────────────────────────────────────────────────
const ModuleSection: React.FC<{
    module: Module;
    items: StatementItemDTO[];
    runningNet?: number;
}> = ({ module, items, runningNet }) => {
    const cfg  = MODULE_CONFIG[module];
    const Icon = cfg.icon;

    const sectionTotal = items.reduce((sum, i) =>
        CREDIT_TYPES.has(i.type) ? sum + i.amount : sum - i.amount, 0);

    return (
        <div className={`rounded-xl border ${cfg.sectionBorder} overflow-hidden`}>
            <div className={`${cfg.headerBg} ${cfg.headerText} px-5 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                    <Icon size={16} />
                    <span className="font-bold text-sm uppercase tracking-wider">{cfg.label}</span>
                    <span className="opacity-70 text-xs">— {items.length} transaction{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-right">
                    <div className="text-xs opacity-70">Section Net</div>
                    <div className={`text-sm font-bold ${sectionTotal >= 0 ? 'text-white' : 'text-red-200'}`}>
                        {sectionTotal >= 0 ? '+' : ''}{fmt(Math.abs(sectionTotal))}
                    </div>
                </div>
            </div>

            <div className={`${cfg.sectionBg} divide-y divide-slate-100`}>
                {items.map((item, idx) => {
                    const isCredit = CREDIT_TYPES.has(item.type);
                    return (
                        <div key={idx} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/70 transition-colors">
                            <div className="flex flex-col items-center shrink-0 w-6">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.timelineDot}`} />
                                {idx < items.length - 1 && (
                                    <div className={`w-px flex-1 min-h-4.5 border-l-2 border-dashed ${cfg.timelineLine} mt-1`} />
                                )}
                            </div>

                            <div className="shrink-0 w-28 text-right">
                                <div className="text-xs font-semibold text-slate-700">{fmtDate(item.date)}</div>
                                <div className="text-xs text-slate-400">{fmtTime(item.date)}</div>
                            </div>

                            <div className="shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
                                    {item.type}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-slate-800 font-medium truncate">{item.description}</div>
                                {item.reference && (
                                    <div className="text-xs text-slate-400 font-mono truncate">Ref: {item.reference}</div>
                                )}
                            </div>

                            <div className="shrink-0 text-right">
                                <div className={`text-sm font-bold flex items-center justify-end gap-1 ${isCredit ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {isCredit ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                    {isCredit ? '+' : '−'} {fmt(item.amount)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {module === 'SAVINGS' && runningNet !== undefined && (
                <div className="bg-emerald-700 px-5 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-emerald-200 font-medium">Period savings net</span>
                    <span className="text-sm font-bold text-white">{fmt(runningNet)}</span>
                </div>
            )}
        </div>
    );
};

// ─── PrintHeader (only visible on print) ─────────────────────────────────────
const PrintHeader: React.FC<{
    memberName: string;
    memberNumber?: string;
    fromDate: string;
    toDate: string;
}> = ({ memberName, memberNumber, fromDate, toDate }) => (
    <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-800">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold">Secure SACCO</h1>
                <p className="text-sm text-slate-500 mt-1">Member Account Statement</p>
            </div>
            <div className="text-right text-sm space-y-0.5">
                <div><strong>Member:</strong> {memberName}</div>
                {memberNumber && <div><strong>Member #:</strong> {memberNumber}</div>}
                <div><strong>Period:</strong> {fromDate || 'All time'}{toDate ? ` → ${toDate}` : ''}</div>
                <div><strong>Printed:</strong> {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
        </div>
    </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export const MemberStatementPage: React.FC = () => {
    const { user } = useAuth();
    const isStaff = user?.permissions?.includes('REPORTS_READ') ?? false;

    // Member search (staff)
    const [memberSearch, setMemberSearch]         = useState('');
    const [memberResults, setMemberResults]       = useState<Member[]>([]);
    const [memberSearchOpen, setMemberSearchOpen] = useState(false);
    const [memberSearchLoading, setMemberSearchLoading] = useState(false);
    const [selectedMember, setSelectedMember]     = useState<SelectedMember | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Dates
    const [fromDate, setFromDate] = useState('');
    const [toDate,   setToDate]   = useState('');

    // Statement
    const [statement,  setStatement]  = useState<StatementItemDTO[]>([]);
    const [loading,    setLoading]    = useState(false);
    const [error,      setError]      = useState('');
    const [hasFetched, setHasFetched] = useState(false);

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
            try {
                const res = await memberApi.getMembers(memberSearch, undefined, 0, 8);
                setMemberResults(res.content);
            } catch { setMemberResults([]); }
            finally  { setMemberSearchLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [memberSearch, isStaff]);

    const activeMemberId     = isStaff ? (selectedMember?.id ?? null)           : (user?.memberId ?? null);
    const activeMemberName   = isStaff ? (selectedMember?.fullName ?? null)     : (user ? `${user.firstName} ${user.lastName}` : null);
    const activeMemberNumber = isStaff ? selectedMember?.memberNumber           : user?.memberNumber;

    const fetchStatement = useCallback(async () => {
        if (!activeMemberId) { setError('Please select a member first.'); return; }
        setError('');
        setLoading(true);
        setHasFetched(false);
        try {
            const data = await reportApi.getMemberStatement(
                activeMemberId,
                toIsoDateTime(fromDate, false),
                toIsoDateTime(toDate, true),
            );
            setStatement(data);
            setHasFetched(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load statement. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [activeMemberId, fromDate, toDate]);

    // Members auto-fetch their own statement on load
    useEffect(() => {
        if (!isStaff && activeMemberId) fetchStatement();
    }, [isStaff, activeMemberId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Derived sections
    const { savings, loans, penalties } = useMemo(() => ({
        savings:   statement.filter(i => i.module === 'SAVINGS'),
        loans:     statement.filter(i => i.module === 'LOANS'),
        penalties: statement.filter(i => i.module === 'PENALTIES'),
    }), [statement]);

    const stats = useMemo(() => {
        const savingsDeposits    = savings.filter(i => i.type === 'DEPOSIT').reduce((s,i) => s + i.amount, 0);
        const savingsWithdrawals = savings.filter(i => i.type === 'WITHDRAWAL').reduce((s,i) => s + i.amount, 0);
        const loanDisbursed      = loans.filter(i => i.type === 'DISBURSEMENT').reduce((s,i) => s + i.amount, 0);
        const loanRepaid         = loans.filter(i => i.type === 'REPAYMENT').reduce((s,i) => s + i.amount, 0);
        const penaltiesCharged   = penalties.filter(i => i.type === 'ACCRUAL').reduce((s,i) => s + i.amount, 0);
        const penaltiesPaid      = penalties.filter(i => ['REPAYMENT','WAIVER'].includes(i.type)).reduce((s,i) => s + i.amount, 0);
        return { savingsDeposits, savingsWithdrawals, savingsNet: savingsDeposits - savingsWithdrawals, loanDisbursed, loanRepaid, penaltiesCharged, penaltiesPaid };
    }, [savings, loans, penalties]);

    const handleExportCSV = () => {
        const header = 'Date,Module,Type,Description,Reference,Amount\n';
        const rows   = statement.map(i => `${fmtDate(i.date)},${i.module},${i.type},"${i.description}",${i.reference ?? ''},${i.amount}`).join('\n');
        const blob   = new Blob([header + rows], { type: 'text/csv' });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement('a'); a.href = url; a.download = `Statement_${activeMemberNumber ?? 'member'}_${fromDate || 'all'}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
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
                        <p className="text-sm text-slate-500 mt-0.5">Unified ledger — Savings, Loans &amp; Penalties</p>
                    </div>
                </div>
                {hasFetched && statement.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                            <Printer size={15} /> Print
                        </button>
                        <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors">
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5 print:hidden">

                {/* Staff: member search */}
                {isStaff && (
                    <div ref={searchRef} className="relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Member</label>
                        {selectedMember ? (
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                    {selectedMember.fullName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 truncate">{selectedMember.fullName}</div>
                                    <div className="text-xs text-slate-400 font-mono">{selectedMember.memberNumber}</div>
                                </div>
                                <button onClick={() => { setSelectedMember(null); setStatement([]); setHasFetched(false); setMemberSearch(''); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search by name or member number…"
                                    value={memberSearch}
                                    onChange={e => { setMemberSearch(e.target.value); setMemberSearchOpen(true); }}
                                    onFocus={() => memberSearch && setMemberSearchOpen(true)}
                                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {memberSearchLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                            </div>
                        )}
                        {memberSearchOpen && memberResults.length > 0 && !selectedMember && (
                            <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                                {memberResults.map(m => (
                                    <button
                                        key={m.id}
                                        onMouseDown={() => { setSelectedMember({ id: m.id, memberNumber: m.memberNumber, fullName: `${m.firstName} ${m.lastName}` }); setMemberSearch(''); setMemberSearchOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
                                            {m.firstName[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-slate-800">{m.firstName} {m.lastName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{m.memberNumber}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <CalendarDays size={14} className="inline mr-1.5 text-slate-400" />
                        Date Range
                    </label>
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex items-center gap-2">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">From</div>
                                <input type="date" max={toDate || TODAY} value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <Minus size={14} className="text-slate-400 mt-4" />
                            <div>
                                <div className="text-xs text-slate-500 mb-1">To</div>
                                <input type="date" min={fromDate} max={TODAY} value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_RANGES.map(r => (
                                <button key={r.label} onClick={() => { const d = r.getDates(); setFromDate(d.from); setToDate(d.to); }} className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors">
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
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
                    >
                        {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><FileText size={15} /> Generate Statement</>}
                    </button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm print:hidden">{error}</div>}

            {/* Print header */}
            <PrintHeader memberName={activeMemberName ?? ''} memberNumber={activeMemberNumber} fromDate={fromDate} toDate={toDate} />

            {/* Statement output */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 print:hidden">
                    <Loader2 className="animate-spin mb-3 text-blue-600" size={36} />
                    <p className="text-sm">Generating statement…</p>
                </div>
            ) : hasFetched ? (
                <div id="statement-printable" className="space-y-5">

                    {/* Member + period bar */}
                    <div className="flex items-center justify-between bg-slate-800 text-white rounded-xl px-6 py-4 print:hidden">
                        <div>
                            <div className="text-lg font-bold">{activeMemberName}</div>
                            {activeMemberNumber && <div className="text-sm text-slate-300 font-mono">{activeMemberNumber}</div>}
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Period</div>
                            <div className="text-sm font-semibold">
                                {fromDate ? fmtDate(fromDate + 'T00:00:00') : 'All time'}
                                {toDate && ` → ${fmtDate(toDate + 'T00:00:00')}`}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{statement.length} total transactions</div>
                        </div>
                    </div>

                    {/* Summary cards */}
                    {statement.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Savings */}
                            <div className="bg-white rounded-xl border border-emerald-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <PiggyBank size={15} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Savings</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">Deposits</span><span className="font-semibold text-emerald-700">+{fmt(stats.savingsDeposits)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Withdrawals</span><span className="font-semibold text-red-600">−{fmt(stats.savingsWithdrawals)}</span></div>
                                    <div className="flex justify-between pt-1 border-t border-slate-100">
                                        <span className="font-bold text-slate-700">Net</span>
                                        <span className={`font-bold ${stats.savingsNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{stats.savingsNet >= 0 ? '+' : ''}{fmt(stats.savingsNet)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Loans */}
                            <div className="bg-white rounded-xl border border-blue-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Coins size={15} className="text-blue-600" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loans</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">Disbursed</span><span className="font-semibold text-blue-700">{fmt(stats.loanDisbursed)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Repaid</span><span className="font-semibold text-emerald-700">+{fmt(stats.loanRepaid)}</span></div>
                                    <div className="flex justify-between pt-1 border-t border-slate-100">
                                        <span className="font-bold text-slate-700">Outstanding</span>
                                        <span className="font-bold text-blue-700">{fmt(Math.max(0, stats.loanDisbursed - stats.loanRepaid))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Penalties */}
                            <div className="bg-white rounded-xl border border-red-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle size={15} className="text-red-600" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Penalties</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">Charged</span><span className="font-semibold text-red-600">−{fmt(stats.penaltiesCharged)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Paid / Waived</span><span className="font-semibold text-emerald-700">+{fmt(stats.penaltiesPaid)}</span></div>
                                    <div className="flex justify-between pt-1 border-t border-slate-100">
                                        <span className="font-bold text-slate-700">Outstanding</span>
                                        <span className={`font-bold ${stats.penaltiesCharged - stats.penaltiesPaid > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmt(Math.max(0, stats.penaltiesCharged - stats.penaltiesPaid))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Module sections */}
                    {statement.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400 print:hidden">
                            <FileText size={40} className="mb-3 text-slate-200" />
                            <p className="font-semibold text-slate-500">No transactions found</p>
                            <p className="text-sm mt-1">{fromDate || toDate ? 'No activity recorded in this date range.' : 'This member has no recorded transactions yet.'}</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {savings.length   > 0 && <ModuleSection module="SAVINGS"   items={savings}   runningNet={stats.savingsNet} />}
                            {loans.length     > 0 && <ModuleSection module="LOANS"     items={loans} />}
                            {penalties.length > 0 && <ModuleSection module="PENALTIES" items={penalties} />}
                        </div>
                    )}
                </div>
            ) : !isStaff ? null : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 print:hidden">
                    <FileText size={40} className="mb-3 text-slate-200" />
                    <p className="text-sm">Select a member and click Generate to view their statement.</p>
                </div>
            )}
        </div>
    );
};