import React, { useState, useEffect, useCallback } from 'react';
import { auditApi, AUDIT_EVENT_TYPES, type AuditLogDTO, type AuditLogFilters } from '../api/audit-api';
import {
    Shield, Search, Download, ChevronLeft, ChevronRight,
    Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-KE', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    });
};

const eventStyle = (action: string): string => {
    const a = action.toUpperCase();
    if (a.includes('FAIL') || a.includes('KILL') || a.includes('WAIVE')) return 'bg-red-100 text-red-800';
    if (a.includes('LOGIN') || a.includes('DISBURSE') || a.includes('COMPLETE')) return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-100 text-slate-600';
};

// ─── CSV export ───────────────────────────────────────────────────────────────

const downloadCsv = (rows: AuditLogDTO[]) => {
    const header = 'Timestamp,Actor,Event Type,Target,IP Address,Details';
    const escape = (v: string | null | undefined) =>
        v ? `"${v.replace(/"/g, '""')}"` : '';
    const lines = rows.map(r =>
        [fmtDate(r.createdAt), r.actor, r.action, escape(r.target), r.ipAddress ?? '', escape(r.details)].join(',')
    );
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const AuditLogPage: React.FC = () => {
    const [logs, setLogs]           = useState<AuditLogDTO[]>([]);
    const [total, setTotal]         = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage]           = useState(0);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');

    // Filters
    const [actorEmail, setActorEmail] = useState('');
    const [eventType, setEventType]   = useState('');
    const [from, setFrom]             = useState('');
    const [to, setTo]                 = useState('');

    const fetchLogs = useCallback(async (p = 0) => {
        setLoading(true);
        setError('');
        try {
            const filters: AuditLogFilters = {
                page: p, size: PAGE_SIZE,
                actorEmail: actorEmail || undefined,
                eventType:  eventType  || undefined,
                from:       from       || undefined,
                to:         to         || undefined,
            };
            const data = await auditApi.getLogs(filters);
            setLogs(data.content);
            setTotal(data.totalElements);
            setTotalPages(data.totalPages);
            setPage(data.page);
        } catch {
            setError('Failed to load audit logs. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [actorEmail, eventType, from, to]);

    useEffect(() => { fetchLogs(0); }, [fetchLogs]);  // initial load

    const handleSearch = () => fetchLogs(0);
    const handleReset = () => {
        setActorEmail(''); setEventType(''); setFrom(''); setTo('');
        // fetchLogs will be called with cleared state after re-render; force it:
        setLoading(true);
        auditApi.getLogs({ page: 0, size: PAGE_SIZE }).then(data => {
            setLogs(data.content); setTotal(data.totalElements);
            setTotalPages(data.totalPages); setPage(data.page);
        }).catch(() => setError('Failed to load audit logs.')).finally(() => setLoading(false));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="text-red-600" size={24} />
                        Security Audit Log
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Immutable record of all security-relevant events. Read-only.
                    </p>
                </div>
                <button
                    onClick={() => downloadCsv(logs)}
                    disabled={logs.length === 0}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition"
                >
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* ── Filter bar ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Actor email…"
                            value={actorEmail}
                            onChange={e => setActorEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="pl-8 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={eventType}
                        onChange={e => setEventType(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All event types</option>
                        {AUDIT_EVENT_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    <input
                        type="date" value={from} onChange={e => setFrom(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="From"
                    />
                    <input
                        type="date" value={to} onChange={e => setTo(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="To"
                    />
                </div>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleSearch}
                        className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                        <Search size={14} /> Search
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                    >
                        <RefreshCw size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* ── Results summary ────────────────────────────────────────── */}
            {!loading && !error && (
                <p className="text-sm text-slate-500">
                    Showing <strong>{logs.length}</strong> of <strong>{total.toLocaleString()}</strong> events
                    {totalPages > 1 && ` — page ${page + 1} of ${totalPages}`}
                </p>
            )}

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-blue-500" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 text-sm">
                        No audit events found matching your filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Timestamp</th>
                                <th className="px-4 py-3">Actor</th>
                                <th className="px-4 py-3">Event Type</th>
                                <th className="px-4 py-3">Reference / Target</th>
                                <th className="px-4 py-3">IP Address</th>
                                <th className="px-4 py-3">Details</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                                        {fmtDate(log.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-800 font-medium max-w-45 truncate">
                                        {log.actor}
                                    </td>
                                    <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${eventStyle(log.action)}`}>
                                                {log.action}
                                            </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 max-w-40 truncate">
                                        {log.target ?? <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                                        {log.ipAddress ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 max-w-55 truncate" title={log.details ?? ''}>
                                        {log.details ?? <span className="text-slate-300">—</span>}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => fetchLogs(page - 1)} disabled={page === 0 || loading}
                        className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                        <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="text-sm text-slate-500">
                        Page {page + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => fetchLogs(page + 1)} disabled={page >= totalPages - 1 || loading}
                        className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AuditLogPage;