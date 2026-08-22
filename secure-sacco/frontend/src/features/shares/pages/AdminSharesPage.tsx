import { useState, useEffect } from 'react';
import { sharesApi } from '../api/shares-api';
import type { AdminShareAccountDTO, ShareTransactionDTO } from '../api/shares-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import { Search, Loader2, Landmark, History, X, ChevronRight, Download } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';

export default function AdminSharesPage() {
    const [accounts, setAccounts] = useState<AdminShareAccountDTO[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<AdminShareAccountDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedAccount, setSelectedAccount] = useState<AdminShareAccountDTO | null>(null);
    const [transactions, setTransactions] = useState<ShareTransactionDTO[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                setLoading(true);
                const data = await sharesApi.getAllAccounts();
                setAccounts(data);
                setFilteredAccounts(data);
            } catch (err) {
                setError(getApiErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredAccounts(accounts);
            return;
        }
        const q = searchQuery.toLowerCase();
        setFilteredAccounts(accounts.filter(a => 
            a.memberName.toLowerCase().includes(q) || 
            a.memberNumber.toLowerCase().includes(q) ||
            a.product.name.toLowerCase().includes(q)
        ));
    }, [searchQuery, accounts]);

    const handleViewLedger = async (account: AdminShareAccountDTO) => {
        setSelectedAccount(account);
        try {
            setTransactionsLoading(true);
            const data = await sharesApi.getAccountTransactions(account.id);
            setTransactions(data);
        } catch (err) {
            console.error('Failed to load transactions:', err);
        } finally {
            setTransactionsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center bg-slate-50 min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 flex-1 bg-slate-50 min-h-screen">
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Shares Ledger</h1>
                        <p className="text-sm text-slate-500">Monitor and manage member share accounts</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
                {/* Left Panel: Accounts List */}
                <div className={`flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col ${selectedAccount ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input 
                                placeholder="Search by member name, number, or product..." 
                                className="pl-9 bg-white"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Member</th>
                                    <th className="px-6 py-3">Product</th>
                                    <th className="px-6 py-3 text-right">Balance</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAccounts.map(account => (
                                    <tr 
                                        key={account.id} 
                                        onClick={() => handleViewLedger(account)}
                                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedAccount?.id === account.id ? 'bg-emerald-50/50 hover:bg-emerald-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-slate-800">{account.memberName}</div>
                                            <div className="text-xs text-slate-500">{account.memberNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                                                {account.product.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-emerald-700">
                                            KES {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                account.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {account.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-slate-400">
                                            <ChevronRight className="w-4 h-4 inline-block" />
                                        </td>
                                    </tr>
                                ))}
                                {filteredAccounts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            No share accounts found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Panel: Transaction Ledger */}
                {selectedAccount && (
                    <div className="w-full lg:w-[450px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-8rem)] sticky top-24">
                        <div className="p-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History className="w-4 h-4 text-emerald-600" />
                                    Ledger: {selectedAccount.product.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">{selectedAccount.memberName} ({selectedAccount.memberNumber})</p>
                            </div>
                            <button 
                                onClick={() => setSelectedAccount(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 border-b border-slate-100 text-center">
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Current Balance</p>
                            <div className="text-3xl font-bold text-slate-800">
                                KES {selectedAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {transactionsLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                                </div>
                            ) : transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 w-2 h-2 rounded-full ${
                                                tx.type === 'DEPOSIT' ? 'bg-emerald-500' :
                                                tx.type === 'DIVIDEND' ? 'bg-blue-500' : 'bg-rose-500'
                                            }`} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{tx.type}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                                                    {tx.reference && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-mono">{tx.reference}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-semibold ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-8 text-sm text-slate-500">
                                    No transactions recorded yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
