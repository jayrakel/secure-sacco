import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { smsApi, type SmsLog, type SmsLogPage as SmsLogPageType } from '../api/sms-api';
import { format } from 'date-fns';
import { Loader2, RefreshCw, Search, Phone } from 'lucide-react';

export const SmsLogPage: React.FC = () => {
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('');
    const [data, setData] = useState<SmsLogPageType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRetrying, setIsRetrying] = useState<Record<string, boolean>>({});

    const fetchLogs = useCallback(async (p: number, s: string, st: string) => {
        setIsLoading(true);
        try {
            const result = await smsApi.getSmsLogs({ page: p, size: 20, search: s, status: st });
            setData(result);
        } catch (error) {
            console.error('Failed to load SMS logs', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Simple debounce for search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs(page, search, status);
        }, 500);
        return () => clearTimeout(timer);
    }, [page, search, status, fetchLogs]);

    const handleRetry = async (id: string) => {
        setIsRetrying(prev => ({ ...prev, [id]: true }));
        try {
            await smsApi.retrySms(id);
            fetchLogs(page, search, status);
        } catch (error) {
            console.error('Failed to retry SMS', error);
        } finally {
            setIsRetrying(prev => ({ ...prev, [id]: false }));
        }
    };

    const getStatusBadge = (logStatus: string) => {
        switch (logStatus) {
            case 'SENT':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Sent</span>;
            case 'FAILED':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">Failed</span>;
            case 'PENDING':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Pending</span>;
            default:
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{logStatus}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SMS Delivery Logs</h1>
                    <p className="text-slate-500 mt-1">Track outgoing SMS messages and retry failed deliveries.</p>
                </div>
                <button
                    onClick={() => fetchLogs(page, search, status)}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <Card>
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-slate-800">Delivery History</CardTitle>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search phone number..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(0);
                                    }}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                />
                            </div>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPage(0);
                                }}
                                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                            >
                                <option value="">All Statuses</option>
                                <option value="SENT">Sent</option>
                                <option value="FAILED">Failed</option>
                                <option value="PENDING">Pending</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Recipient</th>
                                    <th className="px-6 py-4 w-1/3">Message</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Cost</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                                            <p className="text-slate-500 mt-2">Loading SMS logs...</p>
                                        </td>
                                    </tr>
                                ) : data?.content.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No SMS logs found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    data?.content.map((log: SmsLog) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-slate-700">
                                                    {format(new Date(log.createdAt), 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {format(new Date(log.createdAt), 'h:mm:ss a')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <Phone size={14} className="text-slate-400" />
                                                    {log.phoneNumber}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm line-clamp-2" title={log.message}>
                                                    {log.message}
                                                </p>
                                                {log.providerResponse && log.status === 'FAILED' && (
                                                    <p className="text-xs text-red-500 mt-1 font-mono truncate max-w-sm" title={log.providerResponse}>
                                                        Error: {log.providerResponse}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(log.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                                                {log.cost || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {log.status === 'FAILED' && (
                                                    <button
                                                        onClick={() => handleRetry(log.id)}
                                                        disabled={isRetrying[log.id]}
                                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-md transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-end w-full gap-2"
                                                    >
                                                        {isRetrying[log.id] && <Loader2 className="w-3 h-3 animate-spin" />}
                                                        Retry Send
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <p className="text-sm text-slate-500">
                                Showing <span className="font-medium text-slate-700">{data.number * data.size + 1}</span> to <span className="font-medium text-slate-700">{Math.min((data.number + 1) * data.size, data.totalElements)}</span> of <span className="font-medium text-slate-700">{data.totalElements}</span> results
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={data.first}
                                    className="px-3 py-1 text-sm border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={data.last}
                                    className="px-3 py-1 text-sm border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
export default SmsLogPage;
