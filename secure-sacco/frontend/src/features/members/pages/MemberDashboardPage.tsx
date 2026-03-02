import React, { useState } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { User, Shield, CreditCard, ChevronRight } from 'lucide-react';
import { PaymentModal } from '../../payments/components/PaymentModal';

const MemberDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const REGISTRATION_FEE = 1000;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Member Portal</h1>
                    <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.firstName}!</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                        <User size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">{user?.firstName} {user?.lastName}</h2>
                    <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
                    <div className="mt-4 px-4 py-2 bg-slate-50 rounded-lg w-full border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Member Number</p>
                        <p className="text-lg font-mono font-semibold text-emerald-700">{user?.memberNumber || 'N/A'}</p>
                    </div>
                </div>

                {/* Registration Status Card */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="text-emerald-600" size={24} />
                        <h3 className="text-lg font-bold text-slate-800">Registration Status</h3>
                    </div>

                    <div className={`p-4 rounded-lg border-l-4 ${
                        user?.memberStatus === 'ACTIVE'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-amber-50 border-amber-500 text-amber-800'
                    }`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold">{user?.memberStatus === 'ACTIVE' ? 'Fully Registered & Active' : 'Pending Fee Payment'}</p>
                                <p className="text-sm mt-1 opacity-90">
                                    {user?.memberStatus === 'ACTIVE'
                                        ? 'Your account is fully set up. You can now access savings and loans.'
                                        : 'Please pay your registration fee to unlock full SACCO benefits.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Active Payment CTA */}
                    {user?.memberStatus !== 'ACTIVE' && (
                        <div className="mt-6 p-6 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Registration Fee</h4>
                                    <p className="text-sm text-slate-500 mt-0.5">KES {REGISTRATION_FEE.toLocaleString()} one-time payment</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                Pay via M-Pesa
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal Component */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                amount={REGISTRATION_FEE}
                accountReference={`REG-${user?.id?.substring(0, 8).toUpperCase() || 'FEE'}`}
                title="Pay Registration Fee"
                description="Please provide your M-Pesa registered phone number. We will send a secure prompt directly to your phone to authorize the transaction."
            />
        </div>
    );
};

export default MemberDashboardPage;