import { useState, useEffect } from 'react';
import { loanApi, type LoanApplication } from '../api/loan-api';
import { ApplyLoanModal } from '../components/ApplyLoanModal';
import { PayLoanFeeModal } from '../components/PayLoanFeeModal';
import { AddGuarantorModal } from '../components/AddGuarantorModal';
import { ActiveLoanCard } from '../components/ActiveLoanCard'; // <--- NEW
import { RepayLoanModal } from '../components/RepayLoanModal'; // <--- NEW

export default function MyLoansPage() {
    const [applications, setApplications] = useState<LoanApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showApplyModal, setShowApplyModal] = useState(false);
    const [payFeeApp, setPayFeeApp] = useState<LoanApplication | null>(null);
    const [addGuarantorApp, setAddGuarantorApp] = useState<LoanApplication | null>(null);
    const [repayApp, setRepayApp] = useState<LoanApplication | null>(null); // <--- NEW

    const fetchApplications = () => {
        setLoading(true);
        loanApi.getMyApplications()
            .then(setApplications)
            .catch(() => setError('Failed to load your loan applications.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchApplications(); }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING_FEE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'PENDING_GUARANTORS': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'PENDING_APPROVAL': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'VERIFIED': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'APPROVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-800 border-slate-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Loan Hub</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your applications and active loan balances.</p>
                </div>
                <button onClick={() => setShowApplyModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors font-medium text-sm">
                    Apply for a New Loan
                </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">{error}</div>}

            {loading ? (
                <div className="text-slate-500 animate-pulse flex justify-center py-12">Loading your portfolio...</div>
            ) : applications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        {/* simple empty icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No Loans Found</h3>
                    <p className="text-slate-500 text-sm max-w-sm">You haven't applied for any loans yet. Click the button above to explore Sacco products.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
                    {applications.map(app => {
                        // --- THE ROUTER: ACTIVE VS PENDING ---
                        const isActive = ['ACTIVE', 'IN_GRACE', 'DEFAULTED'].includes(app.status);

                        if (isActive) {
                            return <ActiveLoanCard key={app.id} application={app} onRepayClick={() => setRepayApp(app)} />;
                        }

                        // --- PENDING / PROCESSING CARD ---
                        return (
                            <div key={app.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                                <div className={`p-4 flex justify-between items-start border-b ${getStatusColor(app.status)} border-opacity-50`}>
                                    <h3 className="text-lg font-bold text-slate-800">{app.productName}</h3>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getStatusColor(app.status)}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                                </div>

                                <div className="p-5 text-sm text-slate-600 space-y-2 flex-grow">
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Requested Principal</span>
                                        <span className="font-bold text-slate-900">{app.principalAmount.toLocaleString()} KES</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Application Fee</span>
                                        <span className="font-medium text-slate-800">{app.applicationFee.toLocaleString()} KES {app.applicationFeePaid ? <span className="text-emerald-600 text-xs font-bold">(PAID)</span> : <span className="text-amber-600 text-xs font-bold">(UNPAID)</span>}</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className="text-slate-500">Applied On</span>
                                        <span className="font-medium text-slate-800">{new Date(app.createdAt).toLocaleDateString()}</span>
                                    </div>

                                    {(app.guarantors?.length ?? 0) > 0 && (
                                        <div className="mt-4 pt-3 border-t border-slate-100">
                                            <strong className="text-slate-700 text-xs uppercase tracking-wider">Guarantor Pledges:</strong>
                                            <ul className="space-y-1.5 mt-2">
                                                {app.guarantors.map(g => (
                                                    <li key={g.id} className="flex justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                                        <span className="font-medium">{g.guarantorName || g.guarantorMemberNumber}</span>
                                                        <span className="text-slate-500">{g.guaranteedAmount.toLocaleString()} KES ({g.status})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                                    {app.status === 'PENDING_FEE' && (
                                        <button onClick={() => setPayFeeApp(app)} className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
                                            Pay Fee via M-Pesa
                                        </button>
                                    )}
                                    {app.status === 'PENDING_GUARANTORS' && (
                                        <button onClick={() => setAddGuarantorApp(app)} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
                                            Add Guarantor
                                        </button>
                                    )}
                                    {['PENDING_APPROVAL', 'VERIFIED', 'APPROVED'].includes(app.status) && (
                                        <div className="text-center text-xs text-slate-500 py-1 font-medium">
                                            Under Review by Sacco Committee
                                        </div>
                                    )}
                                    {app.status === 'CLOSED' && (
                                        <div className="text-center text-xs text-slate-500 py-1 font-medium">
                                            Loan Fully Repaid & Closed
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- ALL MODALS --- */}
            {showApplyModal && <ApplyLoanModal onClose={() => setShowApplyModal(false)} onSuccess={() => { setShowApplyModal(false); fetchApplications(); }} />}
            {payFeeApp && <PayLoanFeeModal applicationId={payFeeApp.id} feeAmount={payFeeApp.applicationFee} onClose={() => setPayFeeApp(null)} onSuccess={() => { setPayFeeApp(null); fetchApplications(); }} />}
            {addGuarantorApp && <AddGuarantorModal applicationId={addGuarantorApp.id} onClose={() => setAddGuarantorApp(null)} onSuccess={() => { setAddGuarantorApp(null); fetchApplications(); }} />}
            {repayApp && <RepayLoanModal applicationId={repayApp.id} onClose={() => setRepayApp(null)} onSuccess={() => { setRepayApp(null); fetchApplications(); }} />}
        </div>
    );
}