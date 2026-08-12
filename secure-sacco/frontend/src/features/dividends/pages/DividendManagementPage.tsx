import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

interface DividendDeclaration {
    id: string;
    financialYear: number;
    ratePercentage: number;
    totalAllocated: number;
    status: string;
    createdAt: string;
}

export default function DividendManagementPage() {
    const [declarations, setDeclarations] = useState<DividendDeclaration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDeclaring, setIsDeclaring] = useState(false);
    const [declareError, setDeclareError] = useState<string | null>(null);
    const [financialYear, setFinancialYear] = useState<number>(new Date().getFullYear() - 1);
    const [ratePercentage, setRatePercentage] = useState<number>(5.0);
    const [showDeclareModal, setShowDeclareModal] = useState(false);

    const loadDeclarations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/v1/admin/dividends');
            setDeclarations(response.data);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDeclarations();
    }, [loadDeclarations]);

    const handleDeclare = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsDeclaring(true);
            setDeclareError(null);
            await axios.post('/api/v1/admin/dividends/declare', {
                financialYear,
                ratePercentage
            });
            setShowDeclareModal(false);
            loadDeclarations();
        } catch (err) {
            setDeclareError(getApiErrorMessage(err));
        } finally {
            setIsDeclaring(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dividend Management</h1>
                    <p className="text-gray-500 mt-1">Manage and distribute end-of-year dividends based on share capital</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={loadDeclarations}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </button>
                    <button 
                        onClick={() => setShowDeclareModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Declare Dividend
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 mb-6">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : declarations.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financial Year</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Allocated</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Declared On</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {declarations.map(decl => (
                                <tr key={decl.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {decl.financialYear}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {decl.ratePercentage}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                                        KES {decl.totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            decl.status === 'DISTRIBUTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {decl.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                        {new Date(decl.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <div className="mx-auto h-12 w-12 text-gray-300 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <RefreshCw className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No dividends declared</h3>
                        <p className="text-sm text-gray-500">Declare a new dividend to get started.</p>
                    </div>
                )}
            </div>

            {showDeclareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 overflow-y-auto">
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <form onSubmit={handleDeclare}>
                            <div className="px-6 pt-6 pb-4">
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                                        Declare Dividend
                                    </h3>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowDeclareModal(false)}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {declareError && (
                                    <div className="mb-5 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200 flex items-start">
                                        <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                        {declareError}
                                    </div>
                                )}

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Financial Year</label>
                                        <input 
                                            type="number" 
                                            required
                                            min={2000}
                                            max={2100}
                                            value={financialYear}
                                            onChange={e => setFinancialYear(parseInt(e.target.value))}
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Dividend Rate (%)</label>
                                        <input 
                                            type="number" 
                                            required
                                            step="0.01"
                                            min={0.01}
                                            max={100}
                                            value={ratePercentage}
                                            onChange={e => setRatePercentage(parseFloat(e.target.value))}
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border" 
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Calculated on members' Share Capital
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-6 bg-yellow-50 p-4 border border-yellow-200 rounded-lg flex items-start">
                                    <svg className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-sm text-yellow-800 leading-relaxed">
                                        <strong>Warning:</strong> Declaring a dividend will immediately calculate payouts for all eligible share accounts and credit their Deposit Shares. This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowDeclareModal(false)}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isDeclaring}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 border border-transparent rounded-lg text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isDeclaring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {isDeclaring ? 'Distributing...' : 'Confirm & Distribute'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
