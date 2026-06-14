import React, { useState } from 'react';
import { savingsApi } from '../api/savings-api';
import { X, ArrowDownCircle, ArrowUpCircle, Banknote, Building2, CreditCard, FileText } from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage.ts';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    memberNumber?: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    onSuccess: () => void;
}

const DEPOSIT_CHANNELS = [
    { value: 'CASH',     label: 'Cash',          icon: Banknote,    desc: 'Physical cash received at office' },
    { value: 'EFT',      label: 'Bank Transfer',  icon: Building2,   desc: 'EFT from personal bank account' },
    { value: 'PESALINK', label: 'PesaLink',       icon: CreditCard,  desc: 'Instant inter-bank PesaLink transfer' },
    { value: 'RTGS',     label: 'RTGS',           icon: Building2,   desc: 'Real-time gross settlement' },
    { value: 'CHEQUE',   label: 'Cheque',         icon: FileText,    desc: 'Physical cheque — 3 business day clearing' },
];

export const ManualTransactionModal: React.FC<Props> = ({
    isOpen, onClose, memberId, memberName, memberNumber, type, onSuccess
}) => {
    const [amount, setAmount]               = useState<number | ''>('');
    const [channel, setChannel]             = useState('CASH');
    const [bankName, setBankName]           = useState('');
    const [externalReference, setExtRef]    = useState('');
    const [referenceNotes, setRefNotes]     = useState('');
    const [isLoading, setIsLoading]         = useState(false);
    const [error, setError]                 = useState('');

    if (!isOpen) return null;

    const selectedChannel = DEPOSIT_CHANNELS.find(c => c.value === channel);
    const needsBankInfo   = ['EFT', 'PESALINK', 'RTGS', 'CHEQUE'].includes(channel);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (type === 'DEPOSIT') {
                await savingsApi.manualDeposit({
                    memberId,
                    amount: Number(amount),
                    channel,
                    bankName:          bankName.trim()       || undefined,
                    externalReference: externalReference.trim() || undefined,
                    referenceNotes:    referenceNotes.trim() || undefined,
                });
            } else {
                await savingsApi.manualWithdrawal({ memberId, amount: Number(amount), referenceNotes });
            }
            onSuccess();
            onClose();
            setAmount(''); setChannel('CASH'); setBankName('');
            setExtRef(''); setRefNotes(''); setError('');
        } catch (err: unknown) {
            setError(getApiErrorMessage(err) || 'Transaction failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">

                {/* Header */}
                <div className={`p-4 border-b flex justify-between items-center text-white ${type === 'DEPOSIT' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                    <div className="flex items-center gap-2 font-semibold">
                        {type === 'DEPOSIT' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                        Post {type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                    )}

                    {/* Member */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                        <span className="text-slate-500">Member: </span>
                        <span className="font-bold text-slate-800">{memberName}</span>
                        {memberNumber && <span className="text-slate-400 ml-2">· {memberNumber}</span>}
                    </div>

                    {/* Channel selector — deposits only */}
                    {type === 'DEPOSIT' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {DEPOSIT_CHANNELS.map(ch => {
                                    const Icon = ch.icon;
                                    const active = channel === ch.value;
                                    return (
                                        <button
                                            key={ch.value}
                                            type="button"
                                            onClick={() => setChannel(ch.value)}
                                            className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                                                active
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Icon size={16} />
                                            {ch.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedChannel && (
                                <p className="text-xs text-slate-400 mt-1.5">{selectedChannel.desc}</p>
                            )}
                        </div>
                    )}

                    {/* Bank transfer info box */}
                    {type === 'DEPOSIT' && needsBankInfo && memberNumber && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                            <p className="font-semibold mb-1">Member should use these payment details:</p>
                            <p>Account No: <span className="font-mono font-bold">01148381964600</span></p>
                            <p>Bank: <span className="font-bold">Co-operative Bank of Kenya</span></p>
                            <p>Reference: <span className="font-mono font-bold">{memberNumber}</span></p>
                        </div>
                    )}

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount (KES)</label>
                        <input
                            type="number" min="1" step="0.01" required
                            value={amount}
                            onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. 5000"
                        />
                    </div>

                    {/* Bank name — for EFT/PESALINK/RTGS/CHEQUE */}
                    {type === 'DEPOSIT' && needsBankInfo && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {channel === 'CHEQUE' ? 'Bank (cheque drawn on)' : "Sender's Bank"}
                            </label>
                            <input
                                type="text"
                                value={bankName}
                                onChange={e => setBankName(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Equity Bank, KCB, NCBA..."
                            />
                        </div>
                    )}

                    {/* External reference */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {channel === 'CHEQUE' ? 'Cheque Number' : channel === 'CASH' ? 'Receipt Number (optional)' : 'Bank Reference Number'}
                        </label>
                        <input
                            type="text"
                            value={externalReference}
                            onChange={e => setExtRef(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={
                                channel === 'CHEQUE'   ? 'Cheque number...' :
                                channel === 'CASH'     ? 'Optional receipt number' :
                                'Bank transaction reference...'
                            }
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                        <input
                            type="text"
                            value={referenceNotes}
                            onChange={e => setRefNotes(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Any additional notes..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading || !amount}
                            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${type === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            {isLoading ? 'Processing...' : `Post ${type}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};