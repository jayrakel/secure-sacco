import { useState, useEffect } from 'react';
import { loanApi, type LoanApplication } from '../api/loan-api';
import { ApplyLoanModal } from '../components/ApplyLoanModal';
import { PayLoanFeeModal } from '../components/PayLoanFeeModal';
import { AddGuarantorModal } from '../components/AddGuarantorModal';

export default function MyLoansPage() {
    const [applications, setApplications] = useState<LoanApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showApplyModal, setShowApplyModal] = useState(false);
    const [payFeeApp, setPayFeeApp] = useState<LoanApplication | null>(null);
    const [addGuarantorApp, setAddGuarantorApp] = useState<LoanApplication | null>(null);

    const fetchApplications = () => {
        setLoading(true);
        loanApi.getMyApplications()
            .then(setApplications)
            .catch(() => setError('Failed to load your loan applications.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING_FEE': return 'bg-yellow-100 text-yellow-800';
            case 'PENDING_GUARANTORS': return 'bg-orange-100 text-orange-800';
            case 'PENDING_APPROVAL': return 'bg-blue-100 text-blue-800';
            case 'APPROVED': return 'bg-indigo-100 text-indigo-800';
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-800';
            case 'DEFAULTED': return 'bg-red-100 text-red-800';
            case 'CLOSED': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">My Loans</h1>
                <button
                    onClick={() => setShowApplyModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                >
                    Apply for a Loan
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

            {loading ? (
                <div>Loading...</div>
            ) : applications.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    You haven't applied for any loans yet.
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {applications.map(app => (
                        <div key={app.id} className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500 flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-gray-800">{app.loanProduct.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(app.status)}`}>
                  {app.status.replace('_', ' ')}
                </span>
                            </div>

                            <div className="text-sm text-gray-600 space-y-1 mb-4 flex-grow">
                                <p><strong>Principal:</strong> {app.principalAmount} KES</p>
                                <p><strong>App Fee:</strong> {app.applicationFee} KES {app.isApplicationFeePaid ? '(Paid)' : '(Unpaid)'}</p>
                                <p><strong>Applied On:</strong> {new Date(app.createdAt).toLocaleDateString()}</p>

                                {app.guarantors.length > 0 && (
                                    <div className="mt-2">
                                        <strong>Guarantors:</strong>
                                        <ul className="list-disc pl-4 text-xs mt-1">
                                            {app.guarantors.map(g => (
                                                <li key={g.id}>{g.guarantorName || g.guarantorMemberNumber} - {g.amountPledged} KES ({g.status})</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 mt-auto">
                                {app.status === 'PENDING_FEE' && (
                                    <button onClick={() => setPayFeeApp(app)} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm">
                                        Pay Fee via M-Pesa
                                    </button>
                                )}
                                {app.status === 'PENDING_GUARANTORS' && (
                                    <button onClick={() => setAddGuarantorApp(app)} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm">
                                        Add Guarantor
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showApplyModal && (
                <ApplyLoanModal onClose={() => setShowApplyModal(false)} onSuccess={() => { setShowApplyModal(false); fetchApplications(); }} />
            )}
            {payFeeApp && (
                <PayLoanFeeModal applicationId={payFeeApp.id} feeAmount={payFeeApp.applicationFee} onClose={() => setPayFeeApp(null)} onSuccess={() => { setPayFeeApp(null); fetchApplications(); }} />
            )}
            {addGuarantorApp && (
                <AddGuarantorModal applicationId={addGuarantorApp.id} onClose={() => setAddGuarantorApp(null)} onSuccess={() => { setAddGuarantorApp(null); fetchApplications(); }} />
            )}
        </div>
    );
}