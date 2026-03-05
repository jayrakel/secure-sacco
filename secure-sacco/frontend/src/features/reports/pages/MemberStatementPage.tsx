import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { reportApi, type StatementItemDTO } from '../api/report-api';
import { memberApi } from '../../members/api/member-api';
import { Download, Printer, Filter } from 'lucide-react';

export const MemberStatementPage: React.FC = () => {
    const { user } = useAuth();
    const isStaff = user?.permissions?.includes('REPORTS_READ');

    const [members, setMembers] = useState<{ id: string, memberNumber: string, firstName: string, lastName: string }[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>(isStaff ? '' : (user?.memberId || ''));

    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');

    const [statement, setStatement] = useState<StatementItemDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch members for the dropdown (Staff Only)
    useEffect(() => {
        if (isStaff) {
            memberApi.getMembers()
                .then(res => setMembers(res.content || []))
                .catch(console.error);
        }
    }, [isStaff]);

    const handleFetchStatement = async () => {
        if (!selectedMemberId) {
            setError("Please select a member first.");
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await reportApi.getMemberStatement(selectedMemberId, fromDate, toDate);
            setStatement(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch statement');
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch for logged-in Member
    useEffect(() => {
        if (!isStaff && selectedMemberId) {
            handleFetchStatement();
        }
    }, [isStaff, selectedMemberId]);

    const handleExportCSV = () => {
        const headers = "Date,Module,Type,Description,Reference,Amount\n";
        const rows = statement.map(i => `${new Date(i.date).toLocaleDateString()},${i.module},${i.type},"${i.description}",${i.reference},${i.amount}`).join('\n');
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement_${selectedMemberId}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-end print:hidden">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Member Statement</h1>
                    <p className="mt-1 text-sm text-gray-500">Unified chronological ledger of Savings, Loans, and Penalties.</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => window.print()} className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200">
                        <Printer className="w-4 h-4 mr-2" /> Print
                    </button>
                    <button onClick={handleExportCSV} disabled={statement.length === 0} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </button>
                </div>
            </div>

            {/* --- CONTROLS (Hidden on Print) --- */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-end gap-4 print:hidden">
                {isStaff && (
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
                        <select
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            <option value="">-- Choose Member --</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.memberNumber} - {m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
                <button onClick={handleFetchStatement} className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800">
                    <Filter className="w-4 h-4 mr-2" /> Generate
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 rounded-md print:hidden">{error}</div>}

            {/* --- STATEMENT TIMELINE GRID --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (KES)</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading statement timeline...</td></tr>
                        ) : statement.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No transaction events found for this period.</td></tr>
                        ) : (
                            statement.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${item.module === 'SAVINGS' ? 'bg-green-100 text-green-800' :
                                                item.module === 'LOANS' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-red-100 text-red-800'}`}>
                                                {item.module}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reference || '-'}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${['DEPOSIT', 'REPAYMENT'].includes(item.type) ? 'text-green-600' : 'text-red-600'}`}>
                                        {['DEPOSIT', 'REPAYMENT'].includes(item.type) ? '+' : '-'}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};