import React from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ObligationPeriodResponse, PagedResponse, PeriodStatus } from '../api/obligations-api';

interface Props {
    data: PagedResponse<ObligationPeriodResponse> | null;
    loading: boolean;
    page: number;
    onPageChange: (page: number) => void;
}

const StatusBadge: React.FC<{ status: PeriodStatus }> = ({ status }) => {
    const styles: Record<PeriodStatus, { cls: string; icon: React.ReactNode; label: string }> = {
        COVERED: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <CheckCircle2 size={11} />, label: 'Covered' },
        DUE:     { cls: 'bg-amber-50 border-amber-200 text-amber-700',       icon: <Clock size={11} />,         label: 'Due'     },
        OVERDUE: { cls: 'bg-red-50 border-red-200 text-red-700',             icon: <AlertTriangle size={11} />, label: 'Overdue' },
    };
    const s = styles[status];
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
            {s.icon} {s.label}
        </span>
    );
};

const SkeletonRows: React.FC = () => (
    <div className="space-y-2 animate-pulse p-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg" />
        ))}
    </div>
);

export const ObligationHistoryTable: React.FC<Props> = ({ data, loading, page, onPageChange }) => {
    if (loading) return <SkeletonRows />;

    if (!data || data.content.length === 0) {
        return (
            <div className="text-center py-10 text-slate-500 text-sm">
                No obligation history yet. History will appear once periods are evaluated.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 text-left">Period</th>
                        <th className="px-4 py-3 text-right">Required</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Shortfall</th>
                        <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {data.content.map(period => {
                        const shortfall = Math.max(0, period.requiredAmount - period.paidAmount);
                        return (
                            <tr key={period.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-medium">
                                    {format(parseISO(period.periodStart), 'dd MMM')}
                                    {' – '}
                                    {format(parseISO(period.periodEnd), 'dd MMM yyyy')}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                    KES {period.requiredAmount.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-emerald-700">
                                    KES {period.paidAmount.toLocaleString()}
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${shortfall > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                    {shortfall > 0 ? `KES ${shortfall.toLocaleString()}` : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <StatusBadge status={period.status} />
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
                <div className="flex justify-between items-center text-sm text-slate-600 px-1">
                    <span>
                        {data.number * data.size + 1}–{Math.min((data.number + 1) * data.size, data.totalElements)} of {data.totalElements}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={data.first}
                            onClick={() => onPageChange(page - 1)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="text-xs text-slate-500">
                            {data.number + 1} / {data.totalPages}
                        </span>
                        <button
                            disabled={data.last}
                            onClick={() => onPageChange(page + 1)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};