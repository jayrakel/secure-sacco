import { useState } from 'react';
import { loanApi, type LoanApplication } from '../api/loan-api';
import { Calendar, AlertCircle } from 'lucide-react';

interface DisburseLoanModalProps {
    application: LoanApplication;
    onClose: () => void;
    onSuccess: () => void;
}

export function DisburseLoanModal({ application, onClose, onSuccess }: DisburseLoanModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Timeline Math Engine
    const gracePeriod = application.loanProduct.gracePeriodDays || 0;
    const today = new Date();

    // The system starts the true schedule immediately after the grace period ends
    const scheduleStartDate = new Date(today);
    scheduleStartDate.setDate(scheduleStartDate.getDate() + gracePeriod);

    // The very first weekly payment is due exactly 7 days after the schedule starts
    const firstDueDate = new Date(scheduleStartDate);
    firstDueDate.setDate(firstDueDate.getDate() + 7);

    const handleDisburse = async () => {
        setLoading(true);
        setError('');
        try {
            await loanApi.disburseLoan(application.id);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to disburse loan funds.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Disburse Loan Funds</h2>
                <p className="text-sm text-gray-500 mb-6">Review terms before committing to the General Ledger.</p>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2"><AlertCircle size={18} className="shrink-0 mt-0.5"/> <span>{error}</span></div>}

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-sm text-slate-500">Principal Amount</span>
                        <span className="font-bold text-lg text-emerald-600">{application.principalAmount.toLocaleString()} KES</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Loan Product</span>
                        <span className="font-medium text-slate-800">{application.loanProduct.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Term</span>
                        <span className="font-medium text-slate-800">{application.loanProduct.termWeeks} weeks</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-1"><Calendar size={14} /> Grace Period</span>
                        <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{gracePeriod} Days</span>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                        <span className="text-slate-700 font-medium">First Installment Due</span>
                        <span className="font-bold text-slate-900">{firstDueDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>

                <div className="bg-amber-50 text-amber-800 p-3 rounded text-xs mb-6 leading-relaxed">
                    <strong>Warning:</strong> Disbursing this loan is irreversible. It will instantly alter the SACCO's General Ledger (Debit Loan Receivable, Credit Cash/Bank) and initiate the automated weekly tracking engine.
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm" disabled={loading}>
                        Cancel
                    </button>
                    <button type="button" onClick={handleDisburse} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium text-sm shadow-sm" disabled={loading}>
                        {loading ? 'Posting to GL...' : 'Confirm & Disburse Funds'}
                    </button>
                </div>
            </div>
        </div>
    );
}