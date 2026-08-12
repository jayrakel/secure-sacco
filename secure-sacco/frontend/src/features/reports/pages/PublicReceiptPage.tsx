import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Receipt, CheckCircle2, XCircle, Clock, FileDown, ShieldCheck, Printer } from 'lucide-react';
import api from '../../../shared/api/axiosInstance';
import { PaymentRouteLookupResponse } from '../api/report-api';

const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_BADGE: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING:   { color: 'bg-amber-100 text-amber-700',   icon: <Clock size={14} /> },
    SUBMITTED: { color: 'bg-amber-100 text-amber-700',   icon: <Clock size={14} /> },
    ROUTED:    { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={14} /> },
    FAILED:    { color: 'bg-red-100 text-red-700',       icon: <XCircle size={14} /> },
    REJECTED:  { color: 'bg-red-100 text-red-700',       icon: <XCircle size={14} /> },
    COMPLETED: { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={14} /> },
    APPROVED:  { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={14} /> },
    PAID:      { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={14} /> },
};

export const PublicReceiptPage: React.FC = () => {
    const { ref } = useParams<{ ref: string }>();
    const [result, setResult] = useState<PaymentRouteLookupResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                // Public endpoint
                const res = await api.get<PaymentRouteLookupResponse>(`/public/receipts/${ref}`);
                setResult(res.data);
            } catch (e) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchReceipt();
    }, [ref]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="animate-pulse text-slate-400">Loading receipt...</div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                    <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Receipt Not Found</h1>
                    <p className="text-slate-500 mb-6">
                        The receipt reference <strong>{ref}</strong> could not be found or may have expired.
                    </p>
                    <Link to="/" className="text-teal-600 font-semibold hover:underline">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    const isExpenseClaim = result.internalRef?.startsWith('EXP-');

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <div className="max-w-xl mx-auto">
                {/* Print action bar */}
                <div className="flex justify-end mb-4 gap-2 print:hidden">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium text-sm transition-colors shadow-sm"
                    >
                        <Printer size={16} /> Print
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-medium text-sm transition-colors shadow-sm"
                    >
                        <FileDown size={16} /> Save PDF
                    </button>
                </div>

                {/* Receipt Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    {/* Header */}
                    <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-teal-500/10 rounded-full blur-xl"></div>
                        
                        <div className="relative z-10">
                            <ShieldCheck size={32} className="mx-auto text-teal-400 mb-3" />
                            <h1 className="text-white text-xl font-bold tracking-wide">BETTERLINK VENTURES SACCO</h1>
                            <p className="text-slate-400 text-sm mt-1">Official Transaction Receipt</p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-sm text-slate-500 font-medium mb-1">Amount {isExpenseClaim ? 'Reimbursed' : 'Paid'}</p>
                                <p className="text-4xl font-black text-slate-800 tracking-tight">
                                    <span className="text-2xl text-slate-400 font-bold mr-1">KES</span>
                                    {fmt(result.totalAmount)}
                                </p>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase ${STATUS_BADGE[result.paymentStatus]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                                {STATUS_BADGE[result.paymentStatus]?.icon}
                                {result.paymentStatus}
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid gap-6">
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Date</p>
                                    <p className="font-semibold text-slate-800">
                                        {new Date(result.createdAt).toLocaleString('en-KE', { 
                                            day: 'numeric', month: 'short', year: 'numeric',
                                            hour: 'numeric', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Receipt No.</p>
                                    <p className="font-mono font-semibold text-slate-800">{result.mpesaRef || result.internalRef}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Member Name</p>
                                    <p className="font-semibold text-slate-800">{result.memberName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Member No.</p>
                                    <p className="font-semibold text-slate-800">{result.memberNumber || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Split Details */}
                        {result.isSplitDeposit && result.routes && result.routes.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">
                                    Allocation Breakdown
                                </p>
                                <div className="space-y-3">
                                    {result.routes.map((route, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-slate-600">{route.productName}</span>
                                            <span className="font-semibold text-slate-800">KES {fmt(route.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {isExpenseClaim && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">
                                    Transaction Type
                                </p>
                                <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    Expense Claim Reimbursement
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="bg-slate-50 p-6 text-center text-xs text-slate-400 border-t border-slate-100">
                        <p>This is a system generated receipt and does not require a signature.</p>
                        <p className="mt-1">For support, please contact SACCO administration.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicReceiptPage;
