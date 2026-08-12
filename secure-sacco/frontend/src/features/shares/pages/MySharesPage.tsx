import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import { Loader2 } from 'lucide-react';

interface ShareAccount {
    id: string;
    balance: number;
    status: string;
    product: {
        name: string;
        code: string;
    };
    createdAt: string;
}

interface ShareTransaction {
    id: string;
    amount: number;
    type: string;
    reference: string;
    createdAt: string;
}

export default function MySharesPage() {
    const [accounts, setAccounts] = useState<ShareAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<ShareTransaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);

    const loadAccounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/v1/me/shares');
            setAccounts(response.data);
            if (response.data.length > 0) {
                setSelectedAccount(response.data[0].id);
            }
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTransactions = useCallback(async (accountId: string) => {
        try {
            setTransactionsLoading(true);
            const response = await axios.get(`/api/v1/me/shares/${accountId}/transactions`);
            setTransactions(response.data);
        } catch (err) {
            console.error('Failed to load transactions', err);
        } finally {
            setTransactionsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    useEffect(() => {
        if (selectedAccount) {
            loadTransactions(selectedAccount);
        }
    }, [selectedAccount, loadTransactions]);

    if (loading) {
        return (
            <div className="p-8 text-center flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Shares</h1>

            {accounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {accounts.map(account => (
                        <div 
                            key={account.id} 
                            onClick={() => setSelectedAccount(account.id)}
                            className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all ${selectedAccount === account.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">{account.product.name}</h3>
                            <div className="text-3xl font-bold text-gray-900">
                                KES {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-4 flex items-center justify-between text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${account.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {account.status}
                                </span>
                                <span className="text-gray-500">Since {new Date(account.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center mb-8">
                    <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Share Accounts Found</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        You currently do not own any shares in the Sacco. Share accounts are automatically created when you make your first share purchase or when dividends are distributed.
                    </p>
                    <button 
                        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                        onClick={() => alert("Purchasing shares is not yet enabled for this account.")}
                    >
                        Purchase Shares
                    </button>
                </div>
            )}

            {selectedAccount && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                    </div>
                    {transactionsLoading ? (
                        <div className="p-8 text-center flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-800' :
                                                    tx.type === 'DIVIDEND' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tx.reference || '-'}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No transactions found for this account.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
