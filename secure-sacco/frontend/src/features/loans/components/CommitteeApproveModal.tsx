import { useState } from 'react';
import { loanApi, type LoanApplication } from '../api/loan-api';

interface CommitteeApproveModalProps {
    application: LoanApplication;
    onClose: () => void;
    onSuccess: () => void;
}

export function CommitteeApproveModal({ application, onClose, onSuccess }: CommitteeApproveModalProps) {
    const [notes, setNotes] = useState('');
    const [action, setAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!action) return;
        setLoading(true);
        setError('');
        try {
            if (action === 'APPROVED') {
                await loanApi.committeeApprove(application.id, {notes});
            } else {
                await loanApi.rejectApplication(application.id, {notes});
            }
            onSuccess();
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError('Failed to process committee aproval.');
            }
        } finally {
            setLoading(false);
        }
    };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Committee Approval</h2>
                    <p className="text-sm text-gray-600 mb-4">Application: {application.productName} - {application.principalAmount} KES</p>

                    {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Committee Comments / Meeting
                                Notes</label>
                            <textarea
                                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                required={action === 'REJECTED'}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" onClick={() => setAction('REJECTED')}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                    disabled={loading}>
                                Reject Application
                            </button>
                            <button type="submit" onClick={() => setAction('APPROVED')}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                                    disabled={loading}>
                                Approve for Disbursal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
}