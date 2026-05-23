import { useState, useEffect, useCallback } from 'react';
import { getMyExpenseClaims, type ExpenseClaimResponse } from '../api/expense-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        PENDING:  'bg-amber-100 text-amber-800 border border-amber-200',
        APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        REJECTED: 'bg-red-100 text-red-800 border border-red-200',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}>
            {status === 'PENDING' ? '⏳ Pending' : status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
        </span>
    );
};

export default function MyExpenseClaimsPage() {
    const [claims, setClaims]   = useState<ExpenseClaimResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const fetchClaims = useCallback(async () => {
        try { setLoading(true); setError(null); setClaims(await getMyExpenseClaims()); }
        catch (e) { setError(getApiErrorMessage(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchClaims(); }, [fetchClaims]);

    const pending  = claims.filter(c => c.status === 'PENDING').length;
    const approved = claims.filter(c => c.status === 'APPROVED').length;
    const totalApproved = claims.filter(c => c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0);

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">My Expense Claims</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Expenses you paid on behalf of the SACCO — track reimbursement status here
                </p>

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                        { label: 'Pending Review',   value: pending,   display: String(pending),      color: 'text-amber-600' },
                        { label: 'Approved',          value: approved,  display: String(approved),     color: 'text-emerald-600' },
                        { label: 'Total Reimbursed',  value: totalApproved,
                          display: `KES ${totalApproved.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
                          color: 'text-slate-700' },
                    ].map(({ label, display, color }) => (
                        <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                            <p className={`text-2xl font-bold mt-1 ${color}`}>{display}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info banner */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <p className="font-semibold mb-0.5">How this works</p>
                <p>When you pay a SACCO expense out of pocket, inform the Treasurer or Admin. They will submit a claim on your behalf. Once approved, the SACCO will credit your account or reimburse you directly.</p>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

            {/* Claims list */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-700">Claim History ({claims.length})</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />
                        Loading your claims…
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="text-5xl mb-3">🧾</div>
                        <p className="text-slate-500 font-medium">No expense claims found</p>
                        <p className="text-slate-400 text-sm mt-1">Contact your Treasurer or Admin to submit a claim on your behalf</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {claims.map((claim) => (
                            <div key={claim.id} className="px-6 py-5 hover:bg-slate-50/60 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <StatusBadge status={claim.status} />
                                            {claim.journalReference && (
                                                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    {claim.journalReference}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-slate-800 mt-1">{claim.description}</p>
                                        {claim.receiptReference && (
                                            <p className="text-xs text-slate-400 mt-0.5">Receipt: <span className="font-mono">{claim.receiptReference}</span></p>
                                        )}
                                        {claim.rejectionReason && (
                                            <p className="text-xs text-red-600 mt-1 italic">Rejection reason: {claim.rejectionReason}</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-2">
                                            Submitted {new Date(claim.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xl font-bold text-slate-900">
                                            KES {Number(claim.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                        </p>
                                        {claim.reviewedAt && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Reviewed {new Date(claim.reviewedAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
