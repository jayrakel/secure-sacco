import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Search, Loader2, AlertCircle, CheckCircle2,
    Clock, XCircle, Receipt, GitBranch,
} from 'lucide-react';
import { reportApi, type PaymentRouteLookupResponse } from '../api/report-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MODULE_COLORS: Record<string, string> = {
    SAVINGS: 'bg-emerald-100 text-emerald-700',
    PENALTY: 'bg-red-100 text-red-700',
    LOAN: 'bg-blue-100 text-blue-700',
    CUSTOM: 'bg-purple-100 text-purple-700',
};

const STATUS_BADGE: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING:   { color: 'bg-amber-100 text-amber-700',   icon: <Clock size={12} /> },
    ROUTED:    { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> },
    FAILED:    { color: 'bg-red-100 text-red-700',       icon: <XCircle size={12} /> },
    COMPLETED: { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> },
};

export const PaymentLookupPage: React.FC = () => {
    const [reference, setReference] = useState('');
    const [result, setResult]       = useState<PaymentRouteLookupResponse | null>(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [searched, setSearched]   = useState(false);

    const handleSearch = async () => {
        if (!reference.trim()) return;
        setLoading(true);
        setError('');
        setSearched(true);
        try {
            const res = await reportApi.lookupPayment(reference.trim());
            setResult(res);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not search for that reference.'));
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link to="/reports" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                    <ArrowLeft size={18} />
                </Link>
                <div className="p-2.5 rounded-xl bg-teal-100 text-teal-700">
                    <GitBranch size={22} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Payment Lookup</h1>
                    <p className="text-sm text-slate-500">
                        Search by M-Pesa reference — see every route a split deposit was sent to, side by side.
                    </p>
                </div>
            </div>

            {/* ── Search box ── */}
            <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                        placeholder="e.g. UFIFC8LYOR"
                        className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm font-mono"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !reference.trim()}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-3 rounded-xl disabled:opacity-60"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                </button>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {searched && !loading && !error && !result && (
                <div className="text-center py-16 text-slate-400">
                    <Receipt size={32} className="mx-auto mb-3 text-slate-300" />
                    No payment found matching "{reference}". Try the exact M-Pesa receipt code from the
                    confirmation SMS, or the internal reference if the payment is still pending.
                </div>
            )}

            {result && (
                <div className="space-y-4">
                    {/* ── Payment summary ── */}
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-2xl font-bold text-slate-800">KES {fmt(result.totalAmount)}</p>
                                <p className="text-sm text-slate-500">{result.memberName} {result.memberNumber && `· ${result.memberNumber}`}</p>
                            </div>
                            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-lg ${STATUS_BADGE[result.paymentStatus]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                                {STATUS_BADGE[result.paymentStatus]?.icon}
                                {result.paymentStatus}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-slate-100">
                            <div>
                                <p className="text-xs text-slate-400">M-Pesa Reference</p>
                                <p className="font-mono text-slate-700">{result.mpesaRef ?? '— not yet confirmed —'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Internal Reference</p>
                                <p className="font-mono text-slate-700">{result.internalRef}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Phone</p>
                                <p className="text-slate-700">{result.senderPhoneNumber ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Date</p>
                                <p className="text-slate-700">
                                    {new Date(result.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>
                        </div>

                        {result.failureReason && (
                            <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                {result.failureReason}
                            </div>
                        )}
                    </div>

                    {/* ── Routes ── */}
                    {result.isSplitDeposit ? (
                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <p className="text-sm font-semibold text-slate-700 mb-3">
                                Split across {result.routes.length} route{result.routes.length === 1 ? '' : 's'}
                            </p>
                            <div className="space-y-2">
                                {result.routes.map((route, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${MODULE_COLORS[route.moduleType]}`}>
                                                {route.moduleType}
                                            </span>
                                            <span className="text-sm font-medium text-slate-700">{route.productName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-slate-700">KES {fmt(route.amount)}</span>
                                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_BADGE[route.status]?.color}`}>
                                                {STATUS_BADGE[route.status]?.icon}
                                                {route.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {result.routes.some(r => r.failureReason) && (
                                <div className="mt-3 space-y-1.5">
                                    {result.routes.filter(r => r.failureReason).map((r, i) => (
                                        <p key={i} className="text-xs text-red-600">
                                            {r.productName}: {r.failureReason}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-slate-50 text-sm text-slate-500 text-center">
                            This was a single-purpose deposit (not split) — check the relevant module's own statement for details.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PaymentLookupPage;