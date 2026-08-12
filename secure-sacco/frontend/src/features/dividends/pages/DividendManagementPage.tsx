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
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowDeclareModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleDeclare}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                                        Declare Dividend
                                    </h3>
                                    
                                    {declareError && (
                                        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded text-sm border border-red-200">
                                            {declareError}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Financial Year</label>
                                            <input 
                                                type="number" 
                                                required
                                                min={2000}
                                                max={2100}
                                                value={financialYear}
                                                onChange={e => setFinancialYear(parseInt(e.target.value))}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Dividend Rate (%)</label>
                                            <input 
                                                type="number" 
                                                required
                                                step="0.01"
                                                min={0.01}
                                                max={100}
                                                value={ratePercentage}
                                                onChange={e => setRatePercentage(parseFloat(e.target.value))}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" 
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Calculated on members' Share Capital</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 bg-yellow-50 p-3 border border-yellow-200 rounded-md">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Warning:</strong> Declaring a dividend will immediately calculate payouts for all eligible share accounts and credit their Deposit Shares. This action cannot be easily undone.
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeclareModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isDeclaring}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 sm:w-auto sm:text-sm"
                                    >
                                        {isDeclaring ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Distribute'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
