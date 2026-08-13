import React, { useState, useEffect } from 'react';
import apiClient from '../../../shared/api/api-client';
import { RefreshCw, CheckCircle, XCircle, Upload } from 'lucide-react';
import dayjs from 'dayjs';

interface ReconciliationLine {
    productName: string;
    glAccountCode: string;
    glAccountName: string;
    subLedgerBalance: number;
    glBalance: number;
    variance: number;
    isReconciled: boolean;
}

interface InternalReconciliationResponse {
    timestamp: string;
    savingsReconciliation: ReconciliationLine[];
    shareReconciliation: ReconciliationLine[];
    loanReconciliation: ReconciliationLine[];
}

interface BankReconciliationLine {
    date: string;
    description: string;
    reference: string;
    amount: number;
    matchStatus: string;
}

interface BankReconciliationResult {
    totalMatched: number;
    totalUnmatched: number;
    lines: BankReconciliationLine[];
}

export const ReconciliationPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'INTERNAL' | 'BANK'>('INTERNAL');
    
    // Internal State
    const [internalData, setInternalData] = useState<InternalReconciliationResponse | null>(null);
    const [internalLoading, setInternalLoading] = useState(false);
    
    // Bank State
    const [file, setFile] = useState<File | null>(null);
    const [bankResult, setBankResult] = useState<BankReconciliationResult | null>(null);
    const [bankLoading, setBankLoading] = useState(false);

    const fetchInternalReconciliation = async () => {
        setInternalLoading(true);
        try {
            const res = await apiClient.get<InternalReconciliationResponse>('/accounting/reconciliation/internal');
            setInternalData(res.data);
        } catch (err) {
            console.error('Failed to fetch internal reconciliation', err);
        } finally {
            setInternalLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'INTERNAL') {
            fetchInternalReconciliation();
        }
    }, [activeTab]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    const handleBankUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setBankLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiClient.post('/accounting/reconciliation/bank/upload', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data'
                }
            });
            setBankResult(res.data);
        } catch (err) {
            console.error('Failed to upload bank statement', err);
            alert("Error uploading file.");
        } finally {
            setBankLoading(false);
        }
    };

    const renderInternalTable = (title: string, lines: ReconciliationLine[]) => (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                            <th className="p-4 font-medium">Product / Area</th>
                            <th className="p-4 font-medium">GL Account</th>
                            <th className="p-4 font-medium text-right">Sub-Ledger Balance</th>
                            <th className="p-4 font-medium text-right">GL Balance</th>
                            <th className="p-4 font-medium text-right">Variance</th>
                            <th className="p-4 font-medium text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {lines.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic">No data available for this section.</td></tr>
                        ) : lines.map((line, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium text-gray-900">{line.productName}</td>
                                <td className="p-4">
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded mr-2">{line.glAccountCode}</span>
                                    <span className="text-gray-600 text-sm">{line.glAccountName}</span>
                                </td>
                                <td className="p-4 text-right font-medium">{formatMoney(line.subLedgerBalance)}</td>
                                <td className="p-4 text-right font-medium">{formatMoney(line.glBalance)}</td>
                                <td className={`p-4 text-right font-bold ${line.variance !== 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {formatMoney(line.variance)}
                                </td>
                                <td className="p-4 text-center">
                                    {line.isReconciled ? (
                                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
                                            <CheckCircle size={14} /> OK
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-bold">
                                            <XCircle size={14} /> MISMATCH
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Reconciliation Hub</h1>
                <p className="text-gray-500 mt-1">Ensure total synchronization between your sub-ledgers, GL, and external banks.</p>
            </div>

            <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
                <button 
                    onClick={() => setActiveTab('INTERNAL')}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'INTERNAL' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    Internal Reconciliation
                </button>
                <button 
                    onClick={() => setActiveTab('BANK')}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'BANK' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    Bank Reconciliation
                </button>
            </div>

            {activeTab === 'INTERNAL' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-sm text-gray-500">
                            {internalData && `Last checked: ${dayjs(internalData.timestamp).format('YYYY-MM-DD HH:mm:ss')}`}
                        </p>
                        <button onClick={fetchInternalReconciliation} disabled={internalLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors">
                            <RefreshCw size={16} className={internalLoading ? 'animate-spin' : ''} />
                            Re-run Checks
                        </button>
                    </div>

                    {internalLoading && !internalData ? (
                        <div className="p-12 text-center text-gray-400 animate-pulse">Running reconciliation checks...</div>
                    ) : internalData ? (
                        <>
                            {renderInternalTable("Savings Ledgers", internalData.savingsReconciliation)}
                            {renderInternalTable("Shares Ledgers", internalData.shareReconciliation)}
                            {renderInternalTable("Loan Portfolios", internalData.loanReconciliation)}
                        </>
                    ) : (
                        <div className="p-12 text-center text-gray-400">No data. Click Re-run Checks.</div>
                    )}
                </div>
            )}

            {activeTab === 'BANK' && (
                <div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 max-w-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Upload Bank Statement</h3>
                        <p className="text-gray-500 text-sm mb-6">Upload a CSV file containing date, description, reference, and amount to auto-match against system journal entries.</p>
                        
                        <form onSubmit={handleBankUpload} className="flex gap-4 items-center">
                            <input 
                                type="file" 
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <button 
                                type="submit" 
                                disabled={!file || bankLoading}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                            >
                                <Upload size={18} />
                                {bankLoading ? 'Processing...' : 'Upload & Match'}
                            </button>
                        </form>
                    </div>

                    {bankResult && (
                        <div>
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                                    <h4 className="text-green-800 font-bold mb-1">Total Matched</h4>
                                    <p className="text-2xl font-bold text-green-600">{formatMoney(bankResult.totalMatched)}</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
                                    <h4 className="text-red-800 font-bold mb-1">Total Unmatched</h4>
                                    <p className="text-2xl font-bold text-red-600">{formatMoney(bankResult.totalUnmatched)}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Description</th>
                                            <th className="p-4">Reference</th>
                                            <th className="p-4 text-right">Amount</th>
                                            <th className="p-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {bankResult.lines.map((line: BankReconciliationLine, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-4">{line.date}</td>
                                                <td className="p-4">{line.description}</td>
                                                <td className="p-4 font-mono text-xs text-gray-500">{line.reference}</td>
                                                <td className="p-4 text-right font-medium">{formatMoney(line.amount)}</td>
                                                <td className="p-4 text-center">
                                                    {line.matchStatus === 'MATCHED' ? (
                                                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">MATCHED</span>
                                                    ) : (
                                                        <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">UNMATCHED</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
