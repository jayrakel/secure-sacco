import React, { useEffect, useState } from 'react';
import { accountingApi, type JournalEntry } from '../api/accounting-api';
import { FileText } from 'lucide-react';

const JournalEntriesPage: React.FC = () => {
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchJournals = async () => {
            try {
                const data = await accountingApi.getJournalEntries();
                // Sort by date descending
                setJournals(data.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()));
            } catch (error) {
                console.error('Failed to load journals', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchJournals();
    }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Journal Entries
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">View all posted transactions in the ledger.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : journals.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500">
                    No journal entries found. Make a payment to generate an entry!
                </div>
            ) : (
                <div className="space-y-4">
                    {journals.map(journal => (
                        <div key={journal.id} className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                            {/* Header */}
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{journal.description}</p>
                                    <p className="text-xs text-slate-500 font-mono mt-1">REF: {journal.referenceNumber} | Date: {journal.transactionDate}</p>
                                </div>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold tracking-wide">
                                    {journal.status}
                                </span>
                            </div>

                            {/* Lines */}
                            <div className="p-0">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-2 text-left font-medium">Account</th>
                                        <th className="px-6 py-2 text-right font-medium">Debit (KES)</th>
                                        <th className="px-6 py-2 text-right font-medium">Credit (KES)</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                    {journal.lines.map(line => (
                                        <tr key={line.id}>
                                            <td className="px-6 py-3">
                                                <span className="font-mono text-slate-500 mr-2">{line.accountCode}</span>
                                                <span className="font-medium text-slate-800">{line.accountName}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-slate-700 font-mono">
                                                {line.debitAmount > 0 ? line.debitAmount.toLocaleString() : '-'}
                                            </td>
                                            <td className="px-6 py-3 text-right text-slate-700 font-mono">
                                                {line.creditAmount > 0 ? line.creditAmount.toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JournalEntriesPage;