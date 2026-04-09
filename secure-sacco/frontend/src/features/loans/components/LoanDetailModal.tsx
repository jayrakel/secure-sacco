import React from 'react';
import { X, FileText, User, Calendar, DollarSign, AlertCircle, CheckCircle, Clock, Wallet, TrendingUp } from 'lucide-react';
import type { LoanApplication } from '../api/loan-api';

interface LoanDetailModalProps {
    loan: LoanApplication;
    onClose: () => void;
}

const fmt = (n: number | null | undefined) =>
    `KES ${(n ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    DRAFT: { bg: 'bg-slate-50', text: 'text-slate-700', icon: Clock },
    PENDING_FEE: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
    PENDING_GUARANTORS: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: Clock },
    PENDING_VERIFICATION: { bg: 'bg-sky-50', text: 'text-sky-700', icon: Clock },
    PENDING_APPROVAL: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
    VERIFIED: { bg: 'bg-violet-50', text: 'text-violet-700', icon: CheckCircle },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
    ACTIVE: { bg: 'bg-green-50', text: 'text-green-700', icon: TrendingUp },
    IN_GRACE: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Clock },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
    REFINANCED: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: TrendingUp },
    RESTRUCTURED: { bg: 'bg-purple-50', text: 'text-purple-700', icon: TrendingUp },
    CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', icon: FileText },
    DEFAULTED: { bg: 'bg-rose-50', text: 'text-rose-700', icon: AlertCircle },
};

// Helper to get display status label
const getStatusLabel = (status: string): string => {
    return status.replace(/_/g, ' ');
};

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({ loan, onClose }) => {
    const cfg = STATUS_COLORS[loan.status] || STATUS_COLORS.DRAFT;
    const StatusIcon = cfg.icon;

    // Get interest rate - from loan object or fallback to 0
    const interestRate = (loan.interestRate ?? 0);

    // Get values directly from database - no calculations
    const principalAmount = Number(loan.principalAmount) || 0;
    const tenorWeeks = loan.termWeeks || 0;


    // Member info
    const memberName = loan.memberName || 'Unknown Member';
    const memberNumber = loan.memberNumber || '-';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 rounded-t-2xl flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <FileText className="text-emerald-400" size={24} />
                                <h2 className="text-2xl font-bold text-white">Loan Application Details</h2>
                            </div>
                            <p className="text-slate-300 text-sm">ID: <span className="font-mono text-emerald-300">{loan.id}</span></p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 p-2 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">

                        {/* Status Card */}
                        <div className={`${cfg.bg} rounded-xl p-4 flex items-center gap-3 border border-current border-opacity-20`}>
                            <StatusIcon className={`${cfg.text}`} size={24} />
                            <div className="flex-1">
                                <p className={`${cfg.text} font-bold text-lg`}>{getStatusLabel(loan.status)}</p>
                                <p className={`${cfg.text} text-xs opacity-75`}>Current application status</p>
                            </div>
                        </div>

                        {/* Member Information */}
                        <div className="border-l-4 border-l-emerald-500 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                                <User className="text-emerald-600" size={20} />
                                <h3 className="text-lg font-bold text-slate-900">Member Information</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 font-medium">Member Name</p>
                                    <p className="text-slate-900 font-semibold text-base">{memberName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Member Number</p>
                                    <p className="text-slate-900 font-semibold text-base">{memberNumber}</p>
                                </div>
                            </div>
                        </div>

                        {/* Loan Details */}
                        <div className="border-l-4 border-l-blue-500 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="text-blue-600" size={20} />
                                <h3 className="text-lg font-bold text-slate-900">Loan Details</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 font-medium">Product</p>
                                    <p className="text-slate-900 font-semibold text-base">{loan.productName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Principal Amount</p>
                                    <p className="text-slate-900 font-bold text-base text-emerald-600">{fmt(principalAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Interest Rate</p>
                                    <p className="text-slate-900 font-semibold text-base">{interestRate.toFixed(2)}% p.a.</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Tenor</p>
                                    <p className="text-slate-900 font-semibold text-base">{tenorWeeks} weeks</p>
                                </div>
                            </div>
                        </div>

                        {/* Guarantors */}
                        {loan.guarantors && loan.guarantors.length > 0 && (
                            <div className="border-l-4 border-l-violet-500 pl-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="text-violet-600" size={20} />
                                    <h3 className="text-lg font-bold text-slate-900">Guarantors ({loan.guarantors.length})</h3>
                                </div>
                                <div className="space-y-2">
                                    {loan.guarantors.map((g, idx) => (
                                        <div key={idx} className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                                            <p className="font-semibold text-slate-900">{g.guarantorName || `Guarantor ${idx + 1}`}</p>
                                            <p className="text-xs text-slate-600">{g.guarantorMemberNumber || '-'} · {fmt(g.guaranteedAmount)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="border-l-4 border-l-orange-500 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="text-orange-600" size={20} />
                                <h3 className="text-lg font-bold text-slate-900">Timeline</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Created</span>
                                    <span className="text-slate-900 font-semibold">{fmtDate(loan.createdAt)}</span>
                                </div>
                                {loan.appliedAt && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Applied</span>
                                        <span className="text-slate-900 font-semibold">{fmtDate(loan.appliedAt)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fee Information */}
                        <div className="border-l-4 border-l-pink-500 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Wallet className="text-pink-600" size={20} />
                                <h3 className="text-lg font-bold text-slate-900">Fee & Charges</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 font-medium">Application Fee</p>
                                    <p className="text-slate-900 font-bold text-base text-pink-600">{fmt(loan.applicationFee)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Status</p>
                                    <p className="text-slate-900 font-semibold text-base">{loan.applicationFeePaid ? '✓ Paid' : 'Pending'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Purpose/Notes */}
                        {loan.purpose && (
                            <div className="border-l-4 border-l-yellow-500 pl-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="text-yellow-600" size={20} />
                                    <h3 className="text-lg font-bold text-slate-900">Loan Purpose</h3>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                    <p className="text-slate-700 text-sm">{loan.purpose}</p>
                                </div>
                            </div>
                        )}

                        {/* Additional Notes */}
                        {loan.comments && (
                            <div className="border-l-4 border-l-cyan-500 pl-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="text-cyan-600" size={20} />
                                    <h3 className="text-lg font-bold text-slate-900">Additional Notes</h3>
                                </div>
                                <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                                    <p className="text-slate-700 text-sm">{loan.comments}</p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-slate-50 px-8 py-4 rounded-b-2xl border-t flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};


