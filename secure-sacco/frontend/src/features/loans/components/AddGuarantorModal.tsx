import { useState } from 'react';
import { loanApi } from '../api/loan-api';

interface AddGuarantorModalProps {
    applicationId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddGuarantorModal({ applicationId, onClose, onSuccess }: AddGuarantorModalProps) {
    const [memberNumber, setMemberNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberNumber || !amount) return;
        setLoading(true);
        setError('');
        try {
            await loanApi.addGuarantor(applicationId, {
                memberNumber: memberNumber,
                guaranteedAmount: parseFloat(amount),
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add guarantor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Add Guarantor</h2>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guarantor Member Number</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                            value={memberNumber}
                            onChange={(e) => setMemberNumber(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Pledged (KES)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Guarantor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}