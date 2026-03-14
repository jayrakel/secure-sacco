import React, { useState } from 'react';
import { savingsApi } from '../api/savings-api';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {getApiErrorMessage} from "../../../shared/utils/getApiErrorMessage.ts";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    onSuccess: () => void;
}

export const ManualTransactionModal: React.FC<Props> = ({ isOpen, onClose, memberId, memberName, type, onSuccess }) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [referenceNotes, setReferenceNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const payload = {memberId, amount: Number(amount), referenceNotes};

            if (type === 'DEPOSIT') {
                await savingsApi.manualDeposit(payload);
            } else {
                await savingsApi.manualWithdrawal(payload);
            }
            onSuccess();
            onClose();
            setAmount('');
            setReferenceNotes('');
        } catch (error: unknown) {
            setError(getApiErrorMessage(error) || 'Transaction failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                <div className={`p-4 border-b flex justify-between items-center text-white ${type === 'DEPOSIT' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                    <div className="flex items-center gap-2 font-semibold">
                        {type === 'DEPOSIT' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                        Post Cash {type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                        <span className="text-slate-500">Member: </span>
                        <span className="font-bold text-slate-800">{memberName}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount (KES)</label>
                        <input
                            type="number"
                            min="1"
                            step="0.01"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. 5000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reference / Receipt Number</label>
                        <input
                            type="text"
                            value={referenceNotes}
                            onChange={(e) => setReferenceNotes(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Optional reference note"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !amount}
                            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${type === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                        >
                            {isLoading ? 'Processing...' : `Post ${type}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};