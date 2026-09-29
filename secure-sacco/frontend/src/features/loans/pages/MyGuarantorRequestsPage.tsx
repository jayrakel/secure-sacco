import { useState, useEffect } from 'react';
import { loanApi, type MyGuarantorRequestResponse } from '../api/loan-api';
import { AlertCircle, CheckCircle, XCircle, Clock, Check } from 'lucide-react';

export default function MyGuarantorRequestsPage() {
    const [requests, setRequests] = useState<MyGuarantorRequestResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

    const showToast = (ok: boolean, msg: string) => {
        setToast({ ok, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await loanApi.getMyGuarantorRequests();
            setRequests(data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch guarantor requests:', err);
            setError('Failed to load guarantor requests. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleRespond = async (applicationId: string, guarantorId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            setProcessingId(guarantorId);
            await loanApi.respondToGuarantorRequest(applicationId, guarantorId, status);
            showToast(true, `Request ${status.toLowerCase()} successfully`);
            fetchRequests();
        } catch (err) {
            console.error('Failed to respond to request:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            showToast(false, axiosError.response?.data?.message || 'Failed to respond to request');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Guarantor Requests</h1>
                    <p className="text-slate-600">Review requests from members asking you to guarantee their loans.</p>
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Requests</h3>
                    <p className="text-slate-500">You don't have any pending guarantor requests.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Applicant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Loan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested Guarantee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {requests.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(request.requestedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{request.applicantName}</div>
                                        <div className="text-sm text-slate-500">{request.applicantMemberNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                        KES {request.loanAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        KES {request.guaranteedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {request.status === 'PENDING' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                <Clock className="w-3 h-3 mr-1" /> Pending
                                            </span>
                                        )}
                                        {request.status === 'ACCEPTED' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Accepted
                                            </span>
                                        )}
                                        {request.status === 'REJECTED' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <XCircle className="w-3 h-3 mr-1" /> Rejected
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {request.status === 'PENDING' && (
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => handleRespond(request.loanApplicationId, request.id, 'ACCEPTED')}
                                                    disabled={processingId === request.id}
                                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(request.loanApplicationId, request.id, 'REJECTED')}
                                                    disabled={processingId === request.id}
                                                    className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded shadow-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-sm ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {toast.ok ? <Check size={14} className="text-emerald-600 shrink-0" /> : <AlertCircle size={14} className="text-red-500 shrink-0" />}
                        {toast.msg}
                    </div>
                </div>
            )}
        </div>
    );
}
