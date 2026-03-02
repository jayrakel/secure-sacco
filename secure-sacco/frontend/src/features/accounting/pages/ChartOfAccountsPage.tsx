import React, { useEffect, useState } from 'react';
import { accountingApi, type Account } from '../api/accounting-api';
import { BookOpen, Lock, CheckCircle2, XCircle } from 'lucide-react';

const ChartOfAccountsPage: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const data = await accountingApi.getAccounts();
                // Sort by account code (e.g., 1000, 1100, 2000)
                setAccounts(data.sort((a, b) => a.accountCode.localeCompare(b.accountCode)));
            } catch (error) {
                console.error('Failed to load accounts', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAccounts();
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ASSET': return 'bg-blue-100 text-blue-800';
            case 'LIABILITY': return 'bg-orange-100 text-orange-800';
            case 'EQUITY': return 'bg-purple-100 text-purple-800';
            case 'REVENUE': return 'bg-emerald-100 text-emerald-800';
            case 'EXPENSE': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="text-blue-600" />
                        Chart of Accounts
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage the ledger's foundational accounts.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Account Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-center">System Acc.</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {accounts.map(account => (
                                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-medium text-slate-700">{account.accountCode}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-800">{account.accountName}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{account.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${getTypeColor(account.accountType)}`}>
                                                {account.accountType}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                {account.isSystemAccount ? (
                                                    /* Move the title to a wrapper span */
                                                    <span title="System Locked">
                <Lock size={16} className="text-slate-400" />
            </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </div>
                                        </td>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            {account.isActive ? (
                                                <CheckCircle2 size={18} className="text-emerald-500" />
                                            ) : (
                                                <XCircle size={18} className="text-red-500" />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChartOfAccountsPage;