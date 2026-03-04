import { useState, useEffect } from 'react';
import { loanApi, type LoanProduct } from '../api/loan-api';

interface ApplyLoanModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function ApplyLoanModal({ onClose, onSuccess }: ApplyLoanModalProps) {
    const [products, setProducts] = useState<LoanProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [amount, setAmount] = useState('');
    const [purpose, setPurpose] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loanApi.getProducts().then(setProducts).catch(() => setError('Failed to load products.'));
    }, []);

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId || !amount) return;
        setLoading(true);
        setError('');
        try {
            await loanApi.createApplication({
                productId: selectedProductId,
                principalAmount: parseFloat(amount),
                purpose,
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to apply for loan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-semibold mb-4">Apply for a Loan</h2>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loan Product</label>
                        <select
                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            required
                        >
                            <option value="">Select a product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Max: {p.maxAmount})</option>
                            ))}
                        </select>
                    </div>

                    {selectedProduct && (
                        <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded">
                            <p><strong>Interest:</strong> {selectedProduct.interestRate}% ({selectedProduct.interestModel})</p>
                            <p><strong>Term:</strong> {selectedProduct.termWeeks} weeks</p>
                            <p><strong>App Fee:</strong> {selectedProduct.applicationFee} KES</p>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Loan</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="e.g. Business expansion, school fees..."
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount (KES)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={selectedProduct?.minAmount || 1}
                            max={selectedProduct?.maxAmount || 1000000}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}