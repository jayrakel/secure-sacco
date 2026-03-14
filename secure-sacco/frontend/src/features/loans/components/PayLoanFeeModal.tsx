import { useState } from 'react';
import { loanApi } from '../api/loan-api';

interface PayLoanFeeModalProps {
    applicationId: string;
    feeAmount: number;
    onClose: () => void;
    onSuccess: () => void;
}

export function PayLoanFeeModal({ applicationId, feeAmount, onClose, onSuccess }: PayLoanFeeModalProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber) return;
        setLoading(true);
        setError('');
        try {
            await loanApi.payFee(applicationId, {phoneNumber});
            setSuccessMsg('M-Pesa prompt sent to your phone! Please enter your PIN.');
            setTimeout(() => onSuccess(), 3000);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError('Failed to initiate payment.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Pay Application Fee</h2>
                <p className="text-gray-600 mb-4">Amount due: <span className="font-bold">{feeAmount} KES</span></p>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
                {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded text-sm">{successMsg}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
                        <input
                            type="text"
                            placeholder="2547XXXXXXXX"
                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" disabled={loading || !!successMsg}>
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" disabled={loading || !!successMsg}>
                            {loading ? 'Initiating...' : 'Pay with M-Pesa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}