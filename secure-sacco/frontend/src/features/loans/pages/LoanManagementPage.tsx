import { useState, useEffect, useMemo } from 'react';
import { loanApi, type LoanApplication } from '../api/loan-api';
import { VerifyLoanModal } from '../components/VerifyLoanModal';
import { CommitteeApproveModal } from '../components/CommitteeApproveModal';
import { DisburseLoanModal } from '../components/DisburseLoanModal';
import HasPermission from '../../../shared/components/HasPermission';
import { Coins, Search, RefreshCw, Loader2, AlertCircle, X } from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
    PENDING_VERIFICATION: { badge: 'bg-sky-100 text-sky-800',      label: 'Pending Verification' },
    VERIFIED:             { badge: 'bg-violet-100 text-violet-800', label: 'Verified'             },
    APPROVED:             { badge: 'bg-emerald-100 text-emerald-800',label: 'Approved'            },
    ACTIVE:               { badge: 'bg-green-100 text-green-800',   label: 'Active'               },
    REJECTED:             { badge: 'bg-red-100 text-red-800',       label: 'Rejected'             },
    PENDING_APPROVAL:     { badge: 'bg-blue-100 text-blue-800',     label: 'Pending Approval'     },
    CLOSED:               { badge: 'bg-slate-100 text-slate-600',   label: 'Closed'               },
};

const fmt = (n: number) =>
    `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoanManagementPage() {
    const [applications, setApplications] = useState<LoanApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch]           = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [verifyApp,   setVerifyApp]   = useState<LoanApplication | null>(null);
    const [committeeApp,setCommitteeApp]= useState<LoanApplication | null>(null);
    const [disburseApp, setDisburseApp] = useState<LoanApplication | null>(null);

    const fetchApplications = (isRefresh = false) => {
        if (isRefresh) {
            setError('');
            setLoading(true);
        }
        loanApi.getAllApplications()
            .then(setApplications)
            .catch(() => setError('Failed to load loan applications. Please try again.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchApplications(false);
    }, []);

    const filtered = useMemo(() => {
        let rows = applications;
        if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            rows = rows.filter(r =>
                r.memberId?.toLowerCase().includes(q) ||
                r.productName?.toLowerCase().includes(q)
            );
        }
        return rows;
    }, [applications, statusFilter, search]);

    // Count per status for the filter bar
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const a of applications) counts[a.status] = (counts[a.status] ?? 0) + 1;
        return counts;
    }, [applications]);

    const actionableStatuses = ['PENDING_VERIFICATION', 'VERIFIED', 'APPROVED'];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Coins className="text-emerald-600" size={22} />
                        Loan Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Review, verify, approve, and disburse loan applications.
                    </p>
                </div>
                <button
                    onClick={() => fetchApplications(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* ── Status filter chips ── */}
            {!loading && applications.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={() => setStatusFilter('')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                            !statusFilter
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                    >
                        All ({applications.length})
                    </button>
                    {actionableStatuses.filter(s => statusCounts[s]).map(s => {
                        const cfg = STATUS_CONFIG[s] ?? { badge: '', label: s };
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                                    statusFilter === s
                                        ? 'bg-slate-800 text-white border-slate-800'
                                        : `${cfg.badge} border-transparent`
                                }`}
                            >
                                {cfg.label} ({statusCounts[s]})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
            )}

            {/* ── Table card ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Applications</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {filtered.length} of {applications.length} records
                            {statusFilter && ` · filtered by ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter}`}
                        </p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search member, product…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                        <tr>
                            {['Member ID', 'Product', 'Amount', 'Status', 'Actions'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${h === 'Amount' || h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <Loader2 className="animate-spin mx-auto mb-3 text-emerald-600" size={32} />
                                    <p className="text-sm text-slate-500 font-medium">Loading applications…</p>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                        <Coins className="text-slate-300" size={26} />
                                    </div>
                                    <p className="text-slate-500 font-semibold text-sm">No applications found</p>
                                    <p className="text-slate-400 text-xs mt-1">
                                        {applications.length === 0 ? 'There are no loan applications in the system.' : 'Try adjusting your filters.'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(app => {
                                const cfg = STATUS_CONFIG[app.status] ?? { badge: 'bg-slate-100 text-slate-600', label: app.status };
                                return (
                                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="text-xs font-mono font-semibold text-slate-600">{app.memberId}</span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="text-sm font-medium text-slate-800">{app.productName}</span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                            <span className="text-sm font-bold text-slate-800">{fmt(app.principalAmount)}</span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    {cfg.label}
                                                </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <HasPermission permission="LOANS_APPROVE">
                                                    {app.status === 'PENDING_VERIFICATION' && (
                                                        <button onClick={() => setVerifyApp(app)} className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors">
                                                            Verify
                                                        </button>
                                                    )}
                                                </HasPermission>
                                                <HasPermission permission="LOANS_COMMITTEE_APPROVE">
                                                    {app.status === 'VERIFIED' && (
                                                        <button onClick={() => setCommitteeApp(app)} className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 transition-colors">
                                                            Approve
                                                        </button>
                                                    )}
                                                </HasPermission>
                                                <HasPermission permission="LOANS_DISBURSE">
                                                    {app.status === 'APPROVED' && (
                                                        <button onClick={() => setDisburseApp(app)} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors">
                                                            Disburse
                                                        </button>
                                                    )}
                                                </HasPermission>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {verifyApp    && <VerifyLoanModal     application={verifyApp}    onClose={() => setVerifyApp(null)}    onSuccess={() => { setVerifyApp(null);    fetchApplications(true); }} />}
            {committeeApp && <CommitteeApproveModal application={committeeApp} onClose={() => setCommitteeApp(null)} onSuccess={() => { setCommitteeApp(null); fetchApplications(true); }} />}
            {disburseApp  && <DisburseLoanModal    application={disburseApp}  onClose={() => setDisburseApp(null)}  onSuccess={() => { setDisburseApp(null);  fetchApplications(true); }} />}
        </div>
    );
}