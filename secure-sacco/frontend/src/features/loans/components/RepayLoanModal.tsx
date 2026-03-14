import { useState } from 'react';
import { loanApi } from '../api/loan-api';
import { AlertCircle } from 'lucide-react';

interface RepayLoanModalProps {
    applicationId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function RepayLoanModal({ applicationId, onClose, onSuccess }: RepayLoanModalProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber || !amount) return;
        setLoading(true);
        setError('');
        try {
            await loanApi.repayLoan(applicationId, {
                phoneNumber,
                amount: parseFloat(amount)
            });
            setSuccessMsg('M-Pesa prompt sent to your phone! Please enter your PIN. Your balance will update automatically once Safaricom processes the payment.');
            setTimeout(() => onSuccess(), 4000);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError('Failed to initiate Repayment.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Make Loan Repayment</h2>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5"/> {error}</div>}
                {successMsg && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded text-sm font-medium">{successMsg}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Repayment Amount (KES)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">Excess funds will be stored as Prepayment Credit.</p>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">M-Pesa Phone Number</label>
                        <input
                            type="text"
                            placeholder="2547XXXXXXXX"
                            className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" disabled={loading || !!successMsg}>
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium shadow-sm" disabled={loading || !!successMsg}>
                            {loading ? 'Initiating...' : 'Pay with M-Pesa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}