import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom'; // <-- ADDED IMPORT
import { savingsApi, type StatementTransactionResponse } from '../../savings/api/savings-api';
import { loanApi, type LoanApplication, type LoanSummary } from '../../loans/api/loan-api';
import { penaltyApi, type PenaltySummary } from '../../penalties/api/penalty-api';
import {
    PiggyBank, Coins, AlertCircle, Download, RefreshCw,
    Loader2, ArrowDownLeft, ArrowUpCircle, Calendar,
    ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().split('T')[0];

const monthStart = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
};

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab = 'savings' | 'loans' | 'penalties';

type LoanDetailItem = {
    label: string;
    value: string;
    sub?: string;
    highlight?: boolean;
    danger?: boolean;
};

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'savings', label: 'Savings Statement', icon: PiggyBank, color: 'text-emerald-600' },
    { id: 'loans', label: 'Loan History', icon: Coins, color: 'text-violet-600' },
    { id: 'penalties', label: 'Outstanding Penalties', icon: AlertCircle, color: 'text-rose-600' },
];

const LOAN_STATUS: Record<string, { badge: string; dot: string; label: string }> = {
    PENDING_FEE: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400', label: 'Fee Pending' },
    PENDING_GUARANTORS: { badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400', label: 'Needs Guarantors' },
    PENDING_VERIFICATION: { badge: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500', label: 'Under Review' },
    VERIFIED: { badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500', label: 'Verified' },
    APPROVED: { badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', label: 'Approved' },
    ACTIVE: { badge: 'bg-green-100 text-green-800', dot: 'bg-green-500', label: 'Active' },
    REJECTED: { badge: 'bg-red-100 text-red-800', dot: 'bg-red-400', label: 'Rejected' },
    CLOSED: { badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'Closed' },
};

// /penalties/my only returns OPEN status items — no other statuses will ever appear
const PENALTY_STATUS: Record<string, string> = {
    OPEN: 'bg-rose-100 text-rose-800',
};

// ─── CSV export helper ────────────────────────────────────────────────────────
const exportSavingsCSV = (rows: StatementTransactionResponse[]) => {
    const h = 'Date,Type,Reference,Channel,Amount (KES),Running Balance (KES),Status\n';
    const b = rows
        .map((r) =>
            `${format(new Date(r.postedAt), 'yyyy-MM-dd HH:mm')},${r.type},${r.reference},${r.channel},${r.amount},${r.runningBalance},${r.status}`
        )
        .join('\n');

    const blob = new Blob([h + b], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MySavingsStatement_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const MemberPersonalReportsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('savings');

    // ── Savings state ──────────────────────────────────────────────────────────
    const [savingsFrom, setSavingsFrom] = useState(monthStart());
    const [savingsTo, setSavingsTo] = useState(today());
    const [savingsTxns, setSavingsTxns] = useState<StatementTransactionResponse[]>([]);
    const [savingsLoading, setSavingsLoading] = useState(false);
    const [savingsError, setSavingsError] = useState('');
    const [savingsRan, setSavingsRan] = useState(false);

    // ── Loans state ────────────────────────────────────────────────────────────
    const [loans, setLoans] = useState<LoanApplication[]>([]);
    const [loanSummaries, setLoanSummaries] = useState<Record<string, LoanSummary>>({});
    const [loansLoading, setLoansLoading] = useState(false);
    const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

    // ── Penalties state ────────────────────────────────────────────────────────
    const [penalties, setPenalties] = useState<PenaltySummary[]>([]);
    const [penaltiesLoading, setPenaltiesLoading] = useState(false);

    // ── Load loans & penalties on mount ───────────────────────────────────────
    useEffect(() => {
        setLoansLoading(true);
        loanApi.getMyApplications()
            .then(setLoans)
            .catch((error: unknown) => {
                console.error(getApiErrorMessage(error, 'Failed to load loans.'));
            })
            .finally(() => setLoansLoading(false));

        setPenaltiesLoading(true);
        penaltyApi.getMyOpenPenalties()
            .then(setPenalties)
            .catch((error: unknown) => {
                console.error(getApiErrorMessage(error, 'Failed to load penalties.'));
            })
            .finally(() => setPenaltiesLoading(false));
    }, []);

    // ── Fetch savings statement ────────────────────────────────────────────────
    const fetchSavings = useCallback(async () => {
        setSavingsLoading(true);
        setSavingsError('');

        try {
            const data = await savingsApi.getMyStatement(savingsFrom, savingsTo);
            setSavingsTxns(data);
            setSavingsRan(true);
        } catch (error: unknown) {
            setSavingsError(getApiErrorMessage(error, 'Failed to load statement. Please try again.'));
        } finally {
            setSavingsLoading(false);
        }
    }, [savingsFrom, savingsTo]);

    // ── Expand loan → load its summary ────────────────────────────────────────
    const toggleLoan = async (loan: LoanApplication) => {
        if (expandedLoan === loan.id) {
            setExpandedLoan(null);
            return;
        }

        setExpandedLoan(loan.id);

        if (!loanSummaries[loan.id] && loan.status === 'ACTIVE') {
            try {
                const sum = await loanApi.getLoanSummary(loan.id);
                setLoanSummaries((prev) => ({ ...prev, [loan.id]: sum }));
            } catch (error: unknown) {
                console.error(getApiErrorMessage(error, 'Failed to load loan summary.'));
            }
        }
    };

    // ── Savings derived stats ──────────────────────────────────────────────────
    const totalDeposits = useMemo(
        () => savingsTxns.filter((t) => t.type === 'DEPOSIT').reduce((s, t) => s + t.amount, 0),
        [savingsTxns]
    );

    const totalWithdrawals = useMemo(
        () => savingsTxns.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amount, 0),
        [savingsTxns]
    );

    const closingBalance = savingsTxns.length > 0 ? savingsTxns[0].runningBalance : null;
    const totalPenaltiesOutstanding = penalties.reduce((s, p) => s + p.outstandingAmount, 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">

            {/* ── UPDATED HEADER WITH BUTTON ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-slate-600" size={22} />
                        My Reports
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Your personal savings statement, loan history, and penalty records.
                    </p>
                </div>

                {/* ── NEW DOWNLOAD BUTTON ── */}
                <Link
                    to="/reports/statements"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shrink-0"
                >
                    <Download size={16} />
                    Download Official Statement
                </Link>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-white shadow-sm text-slate-800'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon size={15} className={activeTab === tab.id ? tab.color : ''} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'savings' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</label>
                            <input
                                type="date"
                                value={savingsFrom}
                                max={savingsTo}
                                onChange={(e) => setSavingsFrom(e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</label>
                            <input
                                type="date"
                                value={savingsTo}
                                min={savingsFrom}
                                max={today()}
                                onChange={(e) => setSavingsTo(e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                        </div>

                        <button
                            onClick={fetchSavings}
                            disabled={savingsLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
                        >
                            {savingsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            {savingsLoading ? 'Loading…' : 'Load Statement'}
                        </button>

                        {savingsRan && savingsTxns.length > 0 && (
                            <button
                                onClick={() => exportSavingsCSV(savingsTxns)}
                                className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <Download size={14} /> Export CSV
                            </button>
                        )}
                    </div>

                    {savingsError && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                            {savingsError}
                        </div>
                    )}

                    {savingsRan && !savingsLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deposits</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-2">KES {fmt(totalDeposits)}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {savingsTxns.filter((t) => t.type === 'DEPOSIT').length} transactions
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Withdrawals</p>
                                <p className="text-2xl font-bold text-amber-600 mt-2">KES {fmt(totalWithdrawals)}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {savingsTxns.filter((t) => t.type === 'WITHDRAWAL').length} transactions
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closing Balance</p>
                                <p className="text-2xl font-bold text-slate-800 mt-2">
                                    {closingBalance !== null ? `KES ${fmt(closingBalance)}` : '—'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">As at {savingsTo}</p>
                            </div>
                        </div>
                    )}

                    {savingsLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                            <Loader2 size={28} className="animate-spin text-emerald-600" />
                            <span className="text-sm">Loading your statement…</span>
                        </div>
                    ) : savingsRan ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-800">Transaction Log</p>
                                <p className="text-xs text-slate-400">
                                    {savingsTxns.length} record{savingsTxns.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {savingsTxns.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2">
                                    <PiggyBank size={32} className="text-slate-200" />
                                    <p className="text-sm font-medium text-slate-500">No transactions in this period</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            {['Date', 'Type', 'Reference', 'Channel', 'Amount (KES)', 'Balance (KES)', 'Status'].map((h) => (
                                                <th
                                                    key={h}
                                                    className={`px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${
                                                        h.includes('Amount') || h.includes('Balance') ? 'text-right' : 'text-left'
                                                    }`}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-50 bg-white">
                                        {savingsTxns.map((tx) => {
                                            const isDeposit = tx.type === 'DEPOSIT';
                                            return (
                                                <tr key={tx.transactionId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                                                        {format(new Date(tx.postedAt), 'dd MMM yyyy, HH:mm')}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                                    isDeposit ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                                }`}
                                                            >
                                                                {isDeposit ? <ArrowDownLeft size={11} /> : <ArrowUpCircle size={11} />}
                                                                {tx.type}
                                                            </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-600">{tx.reference}</td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">{tx.channel}</td>
                                                    <td
                                                        className={`px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold ${
                                                            isDeposit ? 'text-emerald-600' : 'text-amber-600'
                                                        }`}
                                                    >
                                                        {isDeposit ? '+' : '-'}{fmt(tx.amount)}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold text-slate-800">
                                                        {fmt(tx.runningBalance)}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <span
                                                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                                    tx.status === 'POSTED'
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : tx.status === 'PENDING'
                                                                            ? 'bg-sky-50 text-sky-700'
                                                                            : 'bg-red-50 text-red-700'
                                                                }`}
                                                            >
                                                                {tx.status}
                                                            </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>

                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                        <tr>
                                            <td colSpan={4} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Period: {savingsFrom} → {savingsTo}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="text-xs font-bold text-emerald-600">+{fmt(totalDeposits)}</div>
                                                <div className="text-xs font-bold text-amber-600">-{fmt(totalWithdrawals)}</div>
                                            </td>
                                            <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">
                                                {closingBalance !== null ? fmt(closingBalance) : '—'}
                                            </td>
                                            <td />
                                        </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                            <Calendar size={36} className="text-slate-200" />
                            <p className="text-sm font-medium text-slate-500">
                                Select a date range and click <strong className="text-slate-600">Load Statement</strong>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'loans' && (
                <div className="space-y-3">
                    {loansLoading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                            <Loader2 size={28} className="animate-spin text-violet-500" />
                            <span className="text-sm">Loading your loan history…</span>
                        </div>
                    ) : loans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <Coins size={36} className="text-slate-200" />
                            <p className="text-sm font-medium text-slate-500">No loan applications yet</p>
                        </div>
                    ) : (
                        loans.map((loan) => {
                            const cfg = LOAN_STATUS[loan.status] ?? {
                                badge: 'bg-slate-100 text-slate-600',
                                dot: 'bg-slate-400',
                                label: loan.status,
                            };

                            const isExpanded = expandedLoan === loan.id;
                            const summary = loanSummaries[loan.id];

                            const detailItems: LoanDetailItem[] = [
                                { label: 'Principal', value: `KES ${fmt(loan.principalAmount)}` },
                                { label: 'Purpose', value: loan.purpose || '—' },
                                { label: 'Term', value: `${loan.termWeeks} weeks` },
                                { label: 'Grace Period', value: `${loan.gracePeriodDays} days` },
                                {
                                    label: 'Application Fee',
                                    value: `KES ${fmt(loan.applicationFee)}`,
                                    sub: loan.applicationFeePaid ? '✓ Paid' : '✗ Unpaid',
                                },
                                { label: 'Status', value: cfg.label },
                                ...(summary
                                    ? [
                                        {
                                            label: 'Outstanding',
                                            value: `KES ${fmt(summary.totalOutstanding)}`,
                                            highlight: true,
                                        },
                                        {
                                            label: 'Arrears',
                                            value: summary.totalArrears > 0 ? `KES ${fmt(summary.totalArrears)}` : 'None',
                                            danger: summary.totalArrears > 0,
                                        },
                                        {
                                            label: 'Next Due',
                                            value: summary.nextDueDate
                                                ? format(new Date(summary.nextDueDate), 'dd MMM yyyy')
                                                : '—',
                                        },
                                        {
                                            label: 'Due Amount',
                                            value: summary.nextDueAmount > 0
                                                ? `KES ${fmt(summary.nextDueAmount)}`
                                                : '—',
                                        },
                                        {
                                            label: 'Prepayment Cr',
                                            value: `KES ${fmt(summary.prepaymentCredit)}`,
                                        },
                                    ]
                                    : []),
                            ];

                            return (
                                <div key={loan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <button
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                                        onClick={() => toggleLoan(loan)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800">{loan.productName}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Applied {format(new Date(loan.createdAt), 'dd MMM yyyy')}
                                                    &nbsp;·&nbsp; KES {fmt(loan.principalAmount)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0 ml-3">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                                            {isExpanded ? (
                                                <ChevronUp size={16} className="text-slate-400" />
                                            ) : (
                                                <ChevronDown size={16} className="text-slate-400" />
                                            )}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                                            {loan.status === 'ACTIVE' && !summary ? (
                                                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                                    <Loader2 size={16} className="animate-spin" /> Loading loan details…
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {detailItems.map((item, i) => (
                                                        <div key={i} className="bg-white rounded-xl p-3 border border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                {item.label}
                                                            </p>
                                                            <p
                                                                className={`text-sm font-bold mt-0.5 ${
                                                                    item.danger
                                                                        ? 'text-rose-600'
                                                                        : item.highlight
                                                                            ? 'text-violet-700'
                                                                            : 'text-slate-800'
                                                                }`}
                                                            >
                                                                {item.value}
                                                            </p>
                                                            {item.sub && (
                                                                <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {loan.guarantors?.length > 0 && (
                                                        <div className="col-span-2 sm:col-span-3 bg-white rounded-xl p-3 border border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                                Guarantors ({loan.guarantors.length})
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {loan.guarantors.map((g) => (
                                                                    <span
                                                                        key={g.id}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold"
                                                                    >
                                                                        {g.guarantorName} · KES {fmt(g.guaranteedAmount)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {activeTab === 'penalties' && (
                <div className="space-y-4">
                    {!penaltiesLoading && penalties.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outstanding</p>
                                <p
                                    className={`text-2xl font-bold mt-2 ${
                                        totalPenaltiesOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
                                    }`}
                                >
                                    KES {fmt(totalPenaltiesOutstanding)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {penalties.filter((p) => p.status === 'OPEN' || p.status === 'PARTIAL').length} open
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Original</p>
                                <p className="text-2xl font-bold text-slate-800 mt-2">
                                    KES {fmt(penalties.reduce((s, p) => s + p.originalAmount, 0))}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {penalties.length} total record{penalties.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount Waived</p>
                                <p className="text-2xl font-bold text-slate-800 mt-2">
                                    KES {fmt(penalties.reduce((s, p) => s + p.amountWaived, 0))}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    KES {fmt(penalties.reduce((s, p) => s + p.principalPaid + p.interestPaid, 0))} paid
                                </p>
                            </div>
                        </div>
                    )}

                    {penaltiesLoading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                            <Loader2 size={28} className="animate-spin text-rose-500" />
                            <span className="text-sm">Loading penalty records…</span>
                        </div>
                    ) : penalties.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <AlertCircle size={36} className="text-emerald-200" />
                            <p className="text-sm font-medium text-slate-500">No outstanding penalties — you're clear!</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                    <tr>
                                        {['Rule', 'Date Raised', 'Original Amount', 'Amount Paid', 'Waived', 'Outstanding', 'Status'].map((h) => (
                                            <th
                                                key={h}
                                                className={`px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${
                                                    ['Original Amount', 'Amount Paid', 'Waived', 'Outstanding'].includes(h)
                                                        ? 'text-right'
                                                        : 'text-left'
                                                }`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-50 bg-white">
                                    {penalties.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <p className="text-xs font-semibold text-slate-800">{p.ruleName}</p>
                                                <p className="text-[10px] font-mono text-slate-400">{p.ruleCode}</p>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                                                {format(new Date(p.createdAt), 'dd MMM yyyy')}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold text-slate-700">
                                                {fmt(p.originalAmount)}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-emerald-600">
                                                {fmt(p.principalPaid + p.interestPaid)}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-slate-500">
                                                {fmt(p.amountWaived)}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold text-rose-600">
                                                {fmt(p.outstandingAmount)}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            PENALTY_STATUS[p.status] ?? 'bg-slate-100 text-slate-600'
                                                        }`}
                                                    >
                                                        {p.status}
                                                    </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>

                                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                    <tr>
                                        <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Totals ({penalties.length} record{penalties.length !== 1 ? 's' : ''})
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-slate-700">
                                            {fmt(penalties.reduce((s, p) => s + p.originalAmount, 0))}
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600">
                                            {fmt(penalties.reduce((s, p) => s + p.principalPaid + p.interestPaid, 0))}
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-slate-500">
                                            {fmt(penalties.reduce((s, p) => s + p.amountWaived, 0))}
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-bold text-rose-600">
                                            {fmt(totalPenaltiesOutstanding)}
                                        </td>
                                        <td />
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MemberPersonalReportsPage;