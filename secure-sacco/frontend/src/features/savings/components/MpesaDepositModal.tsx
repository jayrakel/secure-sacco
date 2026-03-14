import React, { useState } from 'react';
import { savingsApi } from '../api/savings-api';
import { X, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import {getApiErrorMessage} from "../../../shared/utils/getApiErrorMessage.ts";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const MpesaDepositModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'INPUT' | 'PROCESSING' | 'SUCCESS'>('INPUT');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await savingsApi.initiateMpesaDeposit({
                phoneNumber,
                amount: Number(amount)
            });
            setMessage(response.customerMessage || 'Please check your phone for the M-Pesa PIN prompt.');
            setStep('SUCCESS');
            onSuccess(); // Refresh statement in background
        } catch (error: unknown) {
            setError(getApiErrorMessage(error, 'Failed to initiate M-Pesa push'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep('INPUT');
        setAmount('');
        setPhoneNumber('');
        setError('');
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center text-white bg-emerald-600">
                    <div className="flex items-center gap-2 font-semibold">
                        <Smartphone size={20} />
                        M-Pesa Savings Deposit
                    </div>
                    <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {step === 'INPUT' && (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-sm text-slate-600 mb-4">
                            Enter your M-Pesa phone number and the amount you wish to save. We will send a secure prompt directly to your phone.
                        </p>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">M-Pesa Phone Number</label>
                            <input
                                type="text"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                                placeholder="e.g. 0712345678"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (KES)</label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                                placeholder="e.g. 1000"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !amount || !phoneNumber}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Prompt'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 'SUCCESS' && (
                    <div className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Prompt Sent!</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            {message}
                        </p>
                        <div className="pt-4">
                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-4 italic">
                            Once you enter your PIN, refresh your dashboard to see your updated balance.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};