import React, { useState, useEffect } from 'react';
import apiClient from '../../../shared/api/api-client';
import axios from 'axios';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

interface AccountBalance {
    accountCode: string;
    accountName: string;
    balance: number;
}

interface SectionData {
    accounts: AccountBalance[];
    totalBalance: number;
}

interface BalanceSheetResponse {
    asOfDate: string;
    assets: SectionData;
    liabilities: SectionData;
    equity: SectionData;
    netIncome: number;
    isBalanced: boolean;
    actualBankBalance?: number;
}

export const BalanceSheetPage: React.FC = () => {
    const [data, setData] = useState<BalanceSheetResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get<BalanceSheetResponse>('/accounting/balance-sheet');
            setData(res.data);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || 'Failed to fetch balance sheet');
            } else {
                setError('Failed to fetch balance sheet');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    const renderSection = (title: string, section: SectionData, isAsset: boolean) => (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">{title}</h3>
            {section.accounts.length === 0 ? (
                <p className="text-gray-500 italic">No accounts in this category.</p>
            ) : (
                <div className="space-y-2">
                    {section.accounts.map((acc, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{acc.accountCode}</span>
                                <span className="text-gray-700">{acc.accountName}</span>
                            </div>
                            <span className="font-medium text-gray-900">{formatMoney(acc.balance)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-gray-200">
                        <span className="font-bold text-gray-800 uppercase tracking-wider text-sm">Total {title}</span>
                        <span className={`font-bold text-lg ${isAsset ? 'text-blue-700' : 'text-purple-700'}`}>
                            {formatMoney(section.totalBalance)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading balance sheet...</div>;
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
                    <AlertCircle className="text-red-500 mt-0.5" />
                    <div>
                        <h3 className="text-red-800 font-medium">Error</h3>
                        <p className="text-red-700 mt-1">{error}</p>
                        <button onClick={fetchData} className="mt-3 text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">Retry</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const totalLiabilitiesAndEquity = data.liabilities.totalBalance + data.equity.totalBalance;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Statement of Financial Position</h1>
                    <p className="text-gray-500 mt-1">As of {dayjs(data.asOfDate).format('MMMM D, YYYY')}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        <RefreshCw size={18} /> Refresh
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </div>

            {!data.isBalanced && (
                <div className="mb-8 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="bg-red-100 p-3 rounded-full">
                        <AlertCircle className="text-red-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-red-800 font-bold text-lg">Balance Sheet Mismatch</h3>
                        <p className="text-red-700 mt-1">
                            Assets ({formatMoney(data.assets.totalBalance)}) do not equal Liabilities + Equity ({formatMoney(totalLiabilitiesAndEquity)}).
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Assets */}
                <div>
                    {data.actualBankBalance !== undefined && data.actualBankBalance !== null && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                                <h3 className="text-blue-900 font-bold text-lg">Actual Bank Balance</h3>
                                <p className="text-blue-700 text-sm mt-1">Live from Co-op Bank</p>
                            </div>
                            <span className="font-bold text-2xl text-blue-800">{formatMoney(data.actualBankBalance)}</span>
                        </div>
                    )}
                    {renderSection("Assets", data.assets, true)}
                </div>

                {/* Right Column: Liabilities & Equity */}
                <div>
                    {renderSection("Liabilities", data.liabilities, false)}
                    {renderSection("Equity", data.equity, false)}

                    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                        <span className="font-bold uppercase tracking-wider">Total Liab. & Equity</span>
                        <span className="font-bold text-2xl">{formatMoney(totalLiabilitiesAndEquity)}</span>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 text-center text-sm text-gray-400">
                <p>Generated by Secure Sacco Accounting Module</p>
            </div>
        </div>
    );
};
