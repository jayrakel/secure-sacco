import { useState, useEffect } from 'react';
import { penaltyApi, type PenaltySummary } from '../api/penalty-api';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MemberPenaltiesPage() {
    const [penalties, setPenalties] = useState<PenaltySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');

    // Payment Form State
    const [selectedPenaltyId, setSelectedPenaltyId] = useState<string>('ALL');
    const [amount, setAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [payError, setPayError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fetchPenalties = () => {
        setLoading(true);
        penaltyApi.getMyOpenPenalties()
            .then(setPenalties)
            .catch(() => setFetchError('Failed to load your penalties.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPenalties(); }, []);

    const totalOutstanding = penalties.reduce((sum, p) => sum + p.outstandingAmount, 0);

    // Auto-fill perfect amount when selection changes
    useEffect(() => {
        if (selectedPenaltyId === 'ALL') {
            setAmount(totalOutstanding.toString());
        } else {
            const selected = penalties.find(p => p.id === selectedPenaltyId);
            if (selected) setAmount(selected.outstandingAmount.toString());
        }
    }, [selectedPenaltyId, totalOutstanding, penalties]);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !phoneNumber) return;
        setPayLoading(true);
        setPayError('');
        setSuccessMsg('');

        try {
            await penaltyApi.repayPenalty({
                phoneNumber,
                amount: parseFloat(amount),
                // If 'ALL' is selected, send null so backend Engine pays oldest-first perfectly
                penaltyId: selectedPenaltyId === 'ALL' ? null : selectedPenaltyId
            });
            setSuccessMsg('M-Pesa prompt sent! Please enter your PIN. Refreshing list in 5 seconds...');
            setTimeout(() => {
                setSuccessMsg('');
                fetchPenalties();
            }, 5000);
        } catch (err: any) {
            setPayError(err.response?.data?.message || 'Failed to initiate payment.');
        } finally {
            setPayLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">My Fines & Penalties</h1>
                <p className="text-slate-500 text-sm mt-1">View and clear your outstanding system penalties.</p>
            </div>

            {fetchError && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{fetchError}</div>}

            <div className="grid md:grid-cols-3 gap-6 items-start">
                {/* Left Column: The Ledger List */}
                <div className="md:col-span-2 space-y-4">
                    {loading ? (
                        <div className="animate-pulse flex gap-4 bg-white p-6 rounded-xl border border-slate-200 h-32"></div>
                    ) : penalties.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">All Clear!</h3>
                            <p className="text-slate-500 text-sm">You have no outstanding penalties.</p>
                        </div>
                    ) : (
                        penalties.map(p => (
                            <div key={p.id} className="bg-white rounded-xl border border-red-200 shadow-sm p-5 flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-red-800 flex items-center gap-2">
                                        <AlertCircle size={18} /> {p.ruleName}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Applied on: {new Date(p.createdAt).toLocaleDateString()}</p>
                                    <div className="mt-3 text-sm text-slate-600 space-y-1">
                                        <p>Original Fine: <span className="font-medium">{p.originalAmount.toLocaleString()} KES</span></p>
                                        {p.interestPaid > 0 && <p>Interest Paid: <span className="font-medium">{p.interestPaid.toLocaleString()} KES</span></p>}
                                        {p.principalPaid > 0 && <p>Principal Paid: <span className="font-medium">{p.principalPaid.toLocaleString()} KES</span></p>}
                                        {p.amountWaived > 0 && <p>Amount Waived: <span className="font-medium text-emerald-600">{p.amountWaived.toLocaleString()} KES</span></p>}
                                    </div>
                                </div>
                                <div className="text-left sm:text-right bg-red-50 p-3 rounded-lg border border-red-100 h-fit">
                                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Outstanding</p>
                                    <p className="text-2xl font-black text-red-700">{p.outstandingAmount.toLocaleString()} <span className="text-sm font-bold">KES</span></p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: Dynamic Payment Form */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Clear Penalties</h2>

                    {penalties.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No payments needed.</p>
                    ) : (
                        <form onSubmit={handlePay}>
                            {payError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{payError}</div>}
                            {successMsg && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded text-sm">{successMsg}</div>}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Target</label>
                                <select
                                    className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium text-slate-800"
                                    value={selectedPenaltyId}
                                    onChange={(e) => setSelectedPenaltyId(e.target.value)}
                                    disabled={payLoading || !!successMsg}
                                >
                                    <option value="ALL">Pay ALL ({totalOutstanding.toLocaleString()} KES)</option>
                                    {penalties.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.ruleName} ({p.outstandingAmount.toLocaleString()} KES)
                                        </option>
                                    ))}
                                </select>
                                {selectedPenaltyId === 'ALL' && (
                                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Payment will be dynamically distributed, targeting oldest compound interest first.</p>
                                )}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Amount to Pay (KES)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                    max={selectedPenaltyId === 'ALL' ? undefined : penalties.find(p => p.id === selectedPenaltyId)?.outstandingAmount}
                                    required
                                    disabled={payLoading || !!successMsg}
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-1">M-Pesa Number</label>
                                <input
                                    type="text"
                                    placeholder="2547XXXXXXXX"
                                    className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    required
                                    disabled={payLoading || !!successMsg}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-bold text-sm disabled:opacity-50"
                                disabled={payLoading || !!successMsg}
                            >
                                {payLoading ? 'Initiating STK...' : 'Pay via M-Pesa'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}