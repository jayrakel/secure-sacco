import { useState, useEffect, useMemo } from 'react';
import { loanApi, type LoanApplication } from '../api/loan-api';
import { VerifyLoanModal } from '../components/VerifyLoanModal';
import { CommitteeApproveModal } from '../components/CommitteeApproveModal';
import { DisburseLoanModal } from '../components/DisburseLoanModal';
import { LoanDetailModal } from '../components/LoanDetailModal';
import HasPermission from '../../../shared/components/HasPermission';
import { Coins, Search, RefreshCw, Loader2, AlertCircle, X, Eye, TrendingUp, Users, Calendar } from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { badge: string; label: string; color: string }> = {
    DRAFT: { badge: 'bg-slate-100 text-slate-800', label: 'Draft', color: 'border-slate-500' },
    PENDING_FEE: { badge: 'bg-amber-100 text-amber-800', label: 'Pending Fee', color: 'border-amber-500' },
    PENDING_GUARANTORS: { badge: 'bg-yellow-100 text-yellow-800', label: 'Pending Guarantors', color: 'border-yellow-500' },
    PENDING_VERIFICATION: { badge: 'bg-sky-100 text-sky-800',      label: 'Pending Verification', color: 'border-sky-500' },
    VERIFIED: { badge: 'bg-violet-100 text-violet-800', label: 'Verified', color: 'border-violet-500' },
    PENDING_APPROVAL:     { badge: 'bg-blue-100 text-blue-800',     label: 'Pending Approval',     color: 'border-blue-500' },
    APPROVED:             { badge: 'bg-emerald-100 text-emerald-800',label: 'Approved',            color: 'border-emerald-500' },
    ACTIVE:               { badge: 'bg-green-100 text-green-800',   label: 'Active',               color: 'border-green-500' },
    IN_GRACE: { badge: 'bg-orange-100 text-orange-800', label: 'In Grace', color: 'border-orange-500' },
    REJECTED:             { badge: 'bg-red-100 text-red-800',       label: 'Rejected',             color: 'border-red-500' },
    REFINANCED: { badge: 'bg-indigo-100 text-indigo-800', label: 'Refinanced', color: 'border-indigo-500' },
    RESTRUCTURED: { badge: 'bg-purple-100 text-purple-800', label: 'Restructured', color: 'border-purple-500' },
    CLOSED:               { badge: 'bg-slate-100 text-slate-600',   label: 'Closed',               color: 'border-slate-500' },
    DEFAULTED: { badge: 'bg-rose-100 text-rose-800', label: 'Defaulted', color: 'border-rose-500' },
};

const fmt = (n: number) =>
    `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtShort = (n: number) => {
    if (n >= 1000000) return `KES ${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `KES ${(n / 1000).toFixed(0)}K`;
    return `KES ${n}`;
};

// ─── Stat Card Component ──────────────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: 'emerald' | 'orange' | 'green' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
    };
    return (
        <div className={`rounded-2xl border p-5 ${colors[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-75">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <Icon size={32} className="opacity-20" />
            </div>
        </div>
    );
};

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
    const [detailApp, setDetailApp]     = useState<LoanApplication | null>(null);
    const [viewMode, setViewMode]       = useState<'grid' | 'list'>('grid');

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
        let cancelled = false;

        const loadApplications = async () => {
            try {
                const data = await loanApi.getAllApplications();
                if (!cancelled) {
                    setApplications(data);
                }
            } catch {
                if (!cancelled) {
                    setError('Failed to load loan applications. Please try again.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadApplications();

        return () => {
            cancelled = true;
        };
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
     useMemo(() => {
         const counts: Record<string, number> = {};
         for (const a of applications) counts[a.status] = (counts[a.status] ?? 0) + 1;
         return counts;
     }, [applications]);


    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Coins className="text-emerald-600" size={28} />
                        Loan Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage loan applications through the entire workflow</p>
                </div>
                <button
                    onClick={() => fetchApplications(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg hover:shadow-emerald-200"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* ── Statistics Cards ── */}
            {!loading && applications.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Applications" value={applications.length} icon={Coins} color="emerald" />
                    <StatCard label="Pending Action" value={applications.filter(a => ['PENDING_VERIFICATION', 'VERIFIED', 'PENDING_APPROVAL'].includes(a.status)).length} icon={TrendingUp} color="orange" />
                    <StatCard label="Approved & Active" value={applications.filter(a => ['APPROVED', 'ACTIVE'].includes(a.status)).length} icon={Calendar} color="green" />
                    <StatCard label="Total Portfolio" value={fmtShort(applications.reduce((sum, a) => sum + a.principalAmount, 0))} icon={Users} color="blue" />
                </div>
            )}

            {/* ── Filters & Search ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search member ID, product name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            List
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Status Filter Chips ── */}
            {!loading && applications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setStatusFilter('')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                            !statusFilter
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                    >
                        All ({applications.length})
                    </button>
                    {['PENDING_VERIFICATION', 'VERIFIED', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'REJECTED'].map(s => {
                        const count = applications.filter(a => a.status === s).length;
                        if (!count) return null;
                        const cfg = STATUS_CONFIG[s] ?? { badge: '', label: s };
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                                    statusFilter === s
                                        ? `${cfg.badge} border-current border-opacity-50`
                                        : `${cfg.badge} border-transparent opacity-70 hover:opacity-100`
                                }`}
                            >
                                {cfg.label} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
                    <AlertCircle size={18} className="shrink-0" /> {error}
                </div>
            )}

            {/* ── Grid View ── */}
            {viewMode === 'grid' && (
                <div>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="animate-spin text-emerald-600 mb-3" size={40} />
                            <p className="text-slate-500 font-medium">Loading applications…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl">
                            <Coins className="mx-auto mb-3 text-slate-300" size={48} />
                            <p className="text-slate-500 font-semibold text-lg">No applications found</p>
                            <p className="text-slate-400 text-sm mt-1">
                                {applications.length === 0 ? 'No loan applications in the system' : 'Try adjusting your filters'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map(app => {
                                const cfg = STATUS_CONFIG[app.status] ?? { badge: 'bg-slate-100 text-slate-600', label: app.status };
                                return (
                                    <div key={app.id} className={`bg-white rounded-2xl border-l-4 ${cfg.color} shadow-sm hover:shadow-md transition-all overflow-hidden group`}>
                                        <div className="p-5 space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="text-xs text-slate-500 font-mono">{app.memberNumber || app.memberId}</p>
                                                    <h3 className="font-bold text-slate-900 mt-1 group-hover:text-emerald-600 transition-colors">{app.memberName || 'Member'}</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">{app.productName}</p>
                                                </div>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>

                                            {/* Amount */}
                                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                                                <p className="text-slate-600 text-xs font-medium mb-1">Principal Amount</p>
                                                <p className="text-2xl font-bold text-emerald-700">{fmt(app.principalAmount)}</p>
                                                <div className="mt-3 text-xs">
                                                    <p className="text-slate-600">Interest Rate</p>
                                                    <p className="font-semibold text-slate-900">{app.interestRate}% p.a.</p>
                                                </div>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-slate-500 font-medium">Tenor</p>
                                                    <p className="font-semibold text-slate-900">{app.termWeeks} weeks</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 font-medium">Application Fee</p>
                                                    <p className="font-semibold text-slate-900">{fmt(app.applicationFee || 0)}</p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-2 border-t border-slate-200">
                                                <button
                                                    onClick={() => setDetailApp(app)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-colors"
                                                >
                                                    <Eye size={14} /> Details
                                                </button>
                                                <HasPermission permission="LOANS_APPROVE">
                                                    {app.status === 'PENDING_VERIFICATION' && (
                                                        <button onClick={() => setVerifyApp(app)} className="flex-1 px-3 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg font-medium text-xs transition-colors">
                                                            Verify
                                                        </button>
                                                    )}
                                                </HasPermission>
                                                <HasPermission permission="LOANS_COMMITTEE_APPROVE">
                                                    {app.status === 'VERIFIED' && (
                                                        <button onClick={() => setCommitteeApp(app)} className="flex-1 px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg font-medium text-xs transition-colors">
                                                            Approve
                                                        </button>
                                                    )}
                                                </HasPermission>
                                                <HasPermission permission="LOANS_DISBURSE">
                                                    {app.status === 'APPROVED' && (
                                                        <button onClick={() => setDisburseApp(app)} className="flex-1 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-medium text-xs transition-colors">
                                                            Disburse
                                                        </button>
                                                    )}
                                                </HasPermission>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── List View ── */}
            {viewMode === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="animate-spin text-emerald-600 mb-3" size={40} />
                            <p className="text-slate-500 font-medium">Loading applications…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <Coins className="mx-auto mb-3 text-slate-300" size={48} />
                            <p className="text-slate-500 font-semibold">No applications found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Member</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Product</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase">Amount</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Rate</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filtered.map(app => {
                                        const cfg = STATUS_CONFIG[app.status] ?? { badge: 'bg-slate-100 text-slate-600', label: app.status };
                                        return (
                                            <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-slate-900">{app.memberName || 'Member'}</p>
                                                    <p className="text-xs text-slate-500">{app.memberNumber || app.memberId}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-slate-800">{app.productName}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="font-bold text-slate-900">{fmt(app.principalAmount)}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-slate-700">{app.interestRate}% p.a.</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setDetailApp(app)}
                                                            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                                                            title="View details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <HasPermission permission="LOANS_APPROVE">
                                                            {app.status === 'PENDING_VERIFICATION' && (
                                                                <button onClick={() => setVerifyApp(app)} className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg font-semibold text-xs transition-colors">
                                                                    Verify
                                                                </button>
                                                            )}
                                                        </HasPermission>
                                                        <HasPermission permission="LOANS_COMMITTEE_APPROVE">
                                                            {app.status === 'VERIFIED' && (
                                                                <button onClick={() => setCommitteeApp(app)} className="px-3 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg font-semibold text-xs transition-colors">
                                                                    Approve
                                                                </button>
                                                            )}
                                                        </HasPermission>
                                                        <HasPermission permission="LOANS_DISBURSE">
                                                            {app.status === 'APPROVED' && (
                                                                <button onClick={() => setDisburseApp(app)} className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-xs transition-colors">
                                                                    Disburse
                                                                </button>
                                                            )}
                                                        </HasPermission>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modals ── */}
            {verifyApp    && <VerifyLoanModal     application={verifyApp}    onClose={() => setVerifyApp(null)}    onSuccess={() => { setVerifyApp(null);    fetchApplications(true); }} />}
            {committeeApp && <CommitteeApproveModal application={committeeApp} onClose={() => setCommitteeApp(null)} onSuccess={() => { setCommitteeApp(null); fetchApplications(true); }} />}
            {disburseApp  && <DisburseLoanModal    application={disburseApp}  onClose={() => setDisburseApp(null)}  onSuccess={() => { setDisburseApp(null);  fetchApplications(true); }} />}
            {detailApp    && <LoanDetailModal      loan={detailApp}           onClose={() => setDetailApp(null)} />}
        </div>
    );
}