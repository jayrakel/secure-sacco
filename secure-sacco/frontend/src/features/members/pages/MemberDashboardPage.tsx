import React, { useState } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSettings } from '../../settings/context/SettingsContext'; // <--- NEW IMPORT
import { User, Shield, CreditCard, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { PaymentModal } from '../../payments/components/PaymentModal';

const MemberDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { settings } = useSettings(); // <--- USE GLOBAL SETTINGS
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Dynamically pull the registration fee, fallback to 1000 if loading
    const registrationFee = settings?.registrationFee || 1000;

    const isActive = user?.memberStatus === 'ACTIVE';
    const isPending = user?.memberStatus === 'PENDING';

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
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <User size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">{user?.firstName} {user?.lastName}</h2>
                    <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
                    <div className="mt-4 px-4 py-2 bg-slate-50 rounded-lg w-full border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Member Number</p>
                        <p className="text-lg font-mono font-semibold text-blue-700">{user?.memberNumber || 'Pending'}</p>
                    </div>
                </div>

                {/* Registration Status Card */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className={isActive ? "text-emerald-600" : "text-amber-500"} size={24} />
                        <h3 className="text-lg font-bold text-slate-800">Account Status</h3>
                    </div>

                    <div className={`p-4 rounded-lg border-l-4 ${
                        isActive
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-amber-50 border-amber-500 text-amber-800'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                {isActive ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                            </div>
                            <div>
                                <p className="font-bold text-base">
                                    {isActive ? 'Fully Registered & Active' : 'Awaiting Registration Fee'}
                                </p>
                                <p className="text-sm mt-1 opacity-90 leading-relaxed">
                                    {isActive
                                        ? 'Your account is fully set up. You can now access savings and loans.'
                                        : 'Please pay your registration fee to unlock your SACCO Member Number and full benefits.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Active Payment CTA for PENDING Users */}
                    {isPending && (
                        <div className="mt-6 p-6 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Registration Fee</h4>
                                    <p className="text-sm text-slate-500 mt-0.5">KES {registrationFee.toLocaleString()} one-time payment</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                                <button
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm mb-2"
                                >
                                    Pay via M-Pesa
                                    <ChevronRight size={18} />
                                </button>
                                <p className="text-xs text-slate-400 italic text-center sm:text-right">
                                    *After paying on your phone, refresh this page.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal Component */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                amount={registrationFee} // <--- PASS DYNAMIC FEE
                accountReference={`REG-${user?.id?.substring(0, 8).toUpperCase() || 'FEE'}`}
                title="Pay Registration Fee"
                description="Please provide your M-Pesa registered phone number. We will send a secure prompt directly to your phone to authorize the transaction."
            />
        </div>
    );
};

export default MemberDashboardPage;