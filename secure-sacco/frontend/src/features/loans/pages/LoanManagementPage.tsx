import { useState, useEffect } from 'react';
import { loanApi, type LoanApplication } from '../api/loan-api';
import { VerifyLoanModal } from '../components/VerifyLoanModal';
import { CommitteeApproveModal } from '../components/CommitteeApproveModal';
import HasPermission from '../../../shared/components/HasPermission';

export default function LoanManagementPage() {
    const [applications, setApplications] = useState<LoanApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [verifyApp, setVerifyApp] = useState<LoanApplication | null>(null);
    const [committeeApp, setCommitteeApp] = useState<LoanApplication | null>(null);

    const fetchApplications = () => {
        setLoading(true);
        loanApi.getAllApplications()
            .then(setApplications)
            .catch(() => setError('Failed to load system loan applications.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchApplications(); }, []);

    const handleDisburse = async (id: string) => {
        if (!window.confirm("Are you sure you want to officially disburse these funds? This will update the GL.")) return;
        try {
            await loanApi.disburseLoan(id);
            fetchApplications();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to disburse.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'bg-blue-100 text-blue-800';
            case 'VERIFIED': return 'bg-purple-100 text-purple-800';
            case 'APPROVED': return 'bg-emerald-100 text-emerald-800';
            case 'ACTIVE': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Loan Management Hub</h1>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((app) => (
                        <tr key={app.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{app.memberId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.loanProduct.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{app.principalAmount} KES</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(app.status)}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                {/* Loan Officer Action */}
                                <HasPermission permission="LOANS_APPROVE">
                                    {app.status === 'PENDING_APPROVAL' && (
                                        <button onClick={() => setVerifyApp(app)} className="text-blue-600 hover:text-blue-900">Verify (Officer)</button>
                                    )}
                                </HasPermission>

                                {/* Committee Action */}
                                <HasPermission permission="LOANS_COMMITTEE_APPROVE">
                                    {app.status === 'VERIFIED' && (
                                        <button onClick={() => setCommitteeApp(app)} className="text-purple-600 hover:text-purple-900">Approve (Committee)</button>
                                    )}
                                </HasPermission>

                                {/* Treasurer Action */}
                                <HasPermission permission="LOANS_DISBURSE">
                                    {app.status === 'APPROVED' && (
                                        <button onClick={() => handleDisburse(app.id)} className="text-emerald-600 hover:text-emerald-900">Disburse Funds</button>
                                    )}
                                </HasPermission>
                            </td>
                        </tr>
                    ))}
                    {applications.length === 0 && !loading && (
                        <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No applications found.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>

            {verifyApp && <VerifyLoanModal application={verifyApp} onClose={() => setVerifyApp(null)} onSuccess={() => { setVerifyApp(null); fetchApplications(); }} />}
            {committeeApp && <CommitteeApproveModal application={committeeApp} onClose={() => setCommitteeApp(null)} onSuccess={() => { setCommitteeApp(null); fetchApplications(); }} />}
        </div>
    );
}