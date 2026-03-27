import React, { useState, useEffect } from 'react';
import { savingsApi, type StatementTransactionResponse, type SavingsBalanceResponse } from '../api/savings-api';
import { MpesaDepositModal } from '../components/MpesaDepositModal';
import { PiggyBank, Smartphone, Clock, RefreshCw, AlertCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../auth/context/AuthProvider';
import { MemberObligationsSection } from '../../obligations/components/MemberObligationsSection';

const MemberSavingsPage: React.FC = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState<SavingsBalanceResponse | null>(null);
    const [statement, setStatement] = useState<StatementTransactionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

    const isPending = user?.memberStatus === 'PENDING';

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [balData, stmtData] = await Promise.all([
                savingsApi.getMyBalance(),
                savingsApi.getMyStatement()
            ]);
            setBalance(balData);
            setStatement(stmtData);
        } catch (error) {
            console.error("Failed to load savings data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isPending) {
            loadData();
        } else {
            setIsLoading(false);
        }
    }, [isPending]);

    if (isPending) {
        return (
            <div className="p-4 sm:p-6 max-w-4xl mx-auto text-center mt-12">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Incomplete</h2>
                <p className="text-slate-600">Please pay your registration fee on the Dashboard to unlock the Savings Vault.</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <PiggyBank className="text-emerald-600" /> My Savings Vault
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your savings, top up via M-Pesa, and view your statement.</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card */}
                <div className="bg-emerald-600 text-white p-6 rounded-xl shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-6 opacity-90">
                            <PiggyBank size={24} />
                            <h2 className="font-semibold">Available Savings</h2>
                        </div>
                        <h3 className="text-4xl font-bold mb-2">
                            KES {balance?.availableBalance?.toLocaleString() || '0'}
                        </h3>
                        <p className="text-emerald-100 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                            Account Status: {balance?.accountStatus || 'ACTIVE'}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsDepositModalOpen(true)}
                        className="mt-8 w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold transition-colors shadow-sm"
                    >
                        <Smartphone size={20} /> Top Up via M-Pesa
                    </button>
                </div>

                {/* Mini Statement */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[400px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Clock size={18} className="text-slate-500"/>
                        <h3 className="font-bold text-slate-800">Recent Transactions</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-slate-500">Loading statement...</div>
                        ) : statement.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <PiggyBank className="text-slate-300 mb-3" size={40} />
                                <p className="text-slate-600 font-medium">No savings yet</p>
                                <p className="text-sm text-slate-400 mt-1">Initiate an M-Pesa top-up to start growing your wealth!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {statement.map((tx) => (
                                    <div key={tx.transactionId} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${tx.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {tx.type === 'DEPOSIT' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 flex items-center gap-2">
                                                    {tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${tx.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                        {tx.status}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                    {format(new Date(tx.postedAt || new Date()), 'MMM dd, yyyy HH:mm')}
                                                    <span>•</span>
                                                    <span className="font-mono uppercase">{tx.channel}</span>
                                                    <span>•</span>
                                                    <span className="font-mono">{tx.reference}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                {tx.type === 'DEPOSIT' ? '+' : '-'} {tx.amount.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                Bal: {tx.runningBalance.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Savings Obligations ─────────────────────────── */}
            <div className="mt-2">
                <MemberObligationsSection />
            </div>

            <MpesaDepositModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
};

export default MemberSavingsPage;