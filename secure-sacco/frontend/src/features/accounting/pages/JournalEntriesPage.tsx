import React, { useEffect, useState } from 'react';
import { accountingApi, type JournalEntry } from '../api/accounting-api';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const JournalEntriesPage: React.FC = () => {
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 20;

    useEffect(() => {
        const fetchJournals = async () => {
            setIsLoading(true);
            try {
                // Fetch data but tell TypeScript we want to verify its shape safely
                const rawResponse = await accountingApi.getJournalEntries(page, PAGE_SIZE);
                const data = rawResponse as unknown;

                console.log("Raw API Response:", data); // We still need this to debug!

                let journalsList: JournalEntry[] = [];
                let totalPagesCount = 1;
                let totalElementsCount = 0;

                // Safely inspect the structure without using 'any'
                if (data && typeof data === 'object') {
                    const record = data as Record<string, unknown>;

                    // Scenario 1: Standard Spring Boot Page structure { content: [...] }
                    if ('content' in record && Array.isArray(record.content)) {
                        journalsList = record.content as JournalEntry[];
                        totalPagesCount = typeof record.totalPages === 'number' ? record.totalPages : 1;
                        totalElementsCount = typeof record.totalElements === 'number' ? record.totalElements : journalsList.length;
                    }
                    // Scenario 2: Array returned directly [...]
                    else if (Array.isArray(data)) {
                        journalsList = data as JournalEntry[];
                        totalElementsCount = journalsList.length;
                    }
                    // Scenario 3: Nested data wrapper { data: { content: [...] } }
                    else if ('data' in record && typeof record.data === 'object' && record.data !== null) {
                        const nested = record.data as Record<string, unknown>;
                        if ('content' in nested && Array.isArray(nested.content)) {
                            journalsList = nested.content as JournalEntry[];
                            totalPagesCount = typeof nested.totalPages === 'number' ? nested.totalPages : 1;
                            totalElementsCount = typeof nested.totalElements === 'number' ? nested.totalElements : journalsList.length;
                        }
                    }
                }

                setJournals(journalsList);
                setTotalPages(totalPagesCount);
                setTotalElements(totalElementsCount);

            } catch (error) {
                console.error('Failed to load journals', error);
                // Ensure journals is at least an empty array on error so the UI doesn't crash
                setJournals([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchJournals();
    }, [page]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Journal Entries
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        View all posted transactions in the ledger.
                        {totalElements > 0 && (
                            <span className="ml-2 text-slate-400">({totalElements.toLocaleString()} total entries)</span>
                        )}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : journals.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500">
                    No journal entries found. Make a payment to generate an entry!
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {journals.map(journal => (
                            <div key={journal.id} className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                                {/* Header */}
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{journal.description}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-1">
                                            REF: {journal.referenceNumber} | Date: {journal.transactionDate}
                                        </p>
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-6 py-3">
                            <p className="text-sm text-slate-500">
                                Page <span className="font-semibold text-slate-700">{page + 1}</span> of{' '}
                                <span className="font-semibold text-slate-700">{totalPages}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 0}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={15} /> Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default JournalEntriesPage;