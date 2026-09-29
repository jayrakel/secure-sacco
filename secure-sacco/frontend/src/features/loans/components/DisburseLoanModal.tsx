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
    const [chequeFile, setChequeFile] = useState<File | null>(null);
    const [checklist, setChecklist] = useState({
        signature: false,
        amountMatches: false,
        dateValid: false,
        payeeCorrect: false
    });

    const isReady = chequeFile && Object.values(checklist).every(Boolean);

    // Timeline Math Engine
    const gracePeriod = application.gracePeriodDays || 0;
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
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError('Failed to Disburse Loan Funds.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Disburse Loan Funds</h2>
                <p className="text-sm text-gray-500 mb-6">Review terms before committing to the General Ledger.</p>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2"><AlertCircle size={18} className="shrink-0 mt-0.5"/> <span>{error}</span></div>}

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-sm text-slate-500">Principal Amount</span>
                        <span className="font-bold text-lg text-emerald-600">{application.principalAmount.toLocaleString()} KES</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Loan Product</span>
                        <span className="font-medium text-slate-800">{application.productName}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-1"><Calendar size={14} /> Grace Period</span>
                        <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{gracePeriod} Days</span>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Upload Cheque Copy</label>
                    <input 
                        type="file" 
                        accept="image/*,.pdf"
                        onChange={e => setChequeFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-1"
                    />
                </div>

                <div className="mb-6 space-y-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Quality Checklist</label>
                    
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={checklist.signature} onChange={e => setChecklist(c => ({...c, signature: e.target.checked}))} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        Signatures verified and authentic
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={checklist.amountMatches} onChange={e => setChecklist(c => ({...c, amountMatches: e.target.checked}))} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        Amount in words and figures match principal
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={checklist.dateValid} onChange={e => setChecklist(c => ({...c, dateValid: e.target.checked}))} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        Date is current and valid
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={checklist.payeeCorrect} onChange={e => setChecklist(c => ({...c, payeeCorrect: e.target.checked}))} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        Payee name matches member's name
                    </label>
                </div>

                <div className="bg-amber-50 text-amber-800 p-3 rounded text-xs mb-6 leading-relaxed">
                    <strong>Warning:</strong> Disbursing this loan is irreversible. It will instantly alter the SACCO's General Ledger.
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm" disabled={loading}>
                        Cancel
                    </button>
                    <button type="button" onClick={handleDisburse} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium text-sm shadow-sm flex items-center justify-center min-w-[200px]" disabled={loading || !isReady}>
                        {loading ? 'Posting to GL...' : 'Confirm & Disburse'}
                    </button>
                </div>
            </div>
        </div>
    );
}