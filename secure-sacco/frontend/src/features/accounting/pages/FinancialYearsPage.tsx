import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import { Loader2, Plus, RefreshCw, Calendar, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';

interface FinancialYear {
    id: string;
    yearName: string;
    startDate: string;
    endDate: string;
    status: string;
    isCurrent: boolean;
}

export const FinancialYearsPage: React.FC = () => {
    const [years, setYears] = useState<FinancialYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form states
    const [yearName, setYearName] = useState(`${new Date().getFullYear()}`);
    const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
    const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);

    const loadYears = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/accounting/financial-years', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setYears(res.data);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadYears();
    }, [loadYears]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            setCreateError(null);
            const token = localStorage.getItem('token');
            await axios.post('/api/v1/accounting/financial-years', {
                yearName,
                startDate,
                endDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCreateModal(false);
            loadYears();
        } catch (err) {
            setCreateError(getApiErrorMessage(err));
        } finally {
            setIsCreating(false);
        }
    };

    const handleCloseYear = async (id: string) => {
        if (!window.confirm("Are you sure you want to close this financial year? This cannot be undone.")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/v1/accounting/financial-years/${id}/close`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadYears();
        } catch (err) {
            alert(getApiErrorMessage(err));
        }
    };

    const handleSetCurrent = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/v1/accounting/financial-years/${id}/current`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadYears();
        } catch (err) {
            alert(getApiErrorMessage(err));
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Years</h1>
                    <p className="text-gray-500 mt-1">Manage accounting periods for the SACCO</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={loadYears}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> New Financial Year
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
                ) : years.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {years.map(fy => (
                                <tr key={fy.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                        {fy.yearName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                        {dayjs(fy.startDate).format('MMM D, YYYY')} - {dayjs(fy.endDate).format('MMM D, YYYY')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            fy.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {fy.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {fy.isCurrent ? (
                                            <span className="inline-flex items-center text-blue-600">
                                                <CheckCircle className="w-5 h-5" />
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {!fy.isCurrent && fy.status === 'OPEN' && (
                                            <button 
                                                onClick={() => handleSetCurrent(fy.id)}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                Set Current
                                            </button>
                                        )}
                                        {fy.status === 'OPEN' && (
                                            <button 
                                                onClick={() => handleCloseYear(fy.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Close Year
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <div className="mx-auto h-12 w-12 text-gray-300 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No Financial Years</h3>
                        <p className="text-sm text-gray-500">Create a financial year to track your accounting periods.</p>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 overflow-y-auto">
                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
                        <form onSubmit={handleCreate}>
                            <div className="px-6 pt-6 pb-4">
                                <h3 className="text-xl font-bold text-gray-900 mb-5">
                                    New Financial Year
                                </h3>
                                
                                {createError && (
                                    <div className="mb-5 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                                        {createError}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Year Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="e.g. 2026"
                                            value={yearName}
                                            onChange={e => setYearName(e.target.value)}
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 flex items-center"
                                >
                                    {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Year
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
