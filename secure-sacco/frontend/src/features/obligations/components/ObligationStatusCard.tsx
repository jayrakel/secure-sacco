import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { ObligationResponse, PeriodStatus } from '../api/obligation-api';

interface Props {
    obligation: ObligationResponse;
}

const statusConfig: Record<PeriodStatus, {
    label: string;
    textColor: string;
    badgeBg: string;
    icon: React.ReactNode;
}> = {
    COVERED: {
        label: 'Covered',
        textColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        icon: <CheckCircle2 size={13} />,
    },
    DUE: {
        label: 'Due',
        textColor: 'text-amber-700',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
        icon: <Clock size={13} />,
    },
    OVERDUE: {
        label: 'Overdue',
        textColor: 'text-red-700',
        badgeBg: 'bg-red-50 border-red-200 text-red-700',
        icon: <AlertTriangle size={13} />,
    },
};

export const ObligationStatusCard: React.FC<Props> = ({ obligation }) => {
    const period    = obligation.currentPeriod;
    const cfg       = period ? statusConfig[period.status] : statusConfig.DUE;
    const periodEnd = period ? parseISO(period.periodEnd) : null;
    const today     = new Date();
    const daysLeft  = periodEnd ? differenceInDays(periodEnd, today) : null;
    const progressPct = period
        ? Math.min(100, Math.round((period.paidAmount / period.requiredAmount) * 100))
        : 0;

    const cardBorder = period?.status === 'OVERDUE'
        ? 'border-red-200 bg-red-50/30'
        : 'border-slate-200 bg-white';

    return (
        <div className={`rounded-xl border p-5 shadow-sm ${cardBorder}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1.5">
                        <Calendar size={13} />
                        <span className="font-medium uppercase tracking-wide">
                            {obligation.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} Obligation
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        KES {obligation.amountDue.toLocaleString()}
                        <span className="text-sm font-normal text-slate-500 ml-1">
                            / {obligation.frequency === 'WEEKLY' ? 'week' : 'month'}
                        </span>
                    </p>
                </div>

                {period && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badgeBg}`}>
                        {cfg.icon} {cfg.label}
                    </span>
                )}
            </div>

            {period ? (
                <>
                    {/* Progress bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>Contribution progress</span>
                            <span className="font-medium">{progressPct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    period.status === 'COVERED' ? 'bg-emerald-500' :
                                        period.status === 'OVERDUE' ? 'bg-red-500' : 'bg-amber-400'
                                }`}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white/80 rounded-lg p-3 border border-slate-100">
                            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Required</p>
                            <p className="font-semibold text-slate-800 text-sm">
                                KES {period.requiredAmount.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/80 rounded-lg p-3 border border-slate-100">
                            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Paid</p>
                            <p className="font-semibold text-emerald-700 text-sm">
                                KES {period.paidAmount.toLocaleString()}
                            </p>
                        </div>
                        <div className={`rounded-lg p-3 border ${
                            period.remaining > 0
                                ? 'bg-red-50/80 border-red-100'
                                : 'bg-slate-50 border-slate-100'
                        }`}>
                            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Remaining</p>
                            <p className={`font-semibold text-sm ${period.remaining > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                                {period.remaining > 0 ? `KES ${period.remaining.toLocaleString()}` : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Period dates + days label */}
                    <div className="flex justify-between items-center mt-4 text-xs text-slate-500">
                        <span>
                            {format(parseISO(period.periodStart), 'dd MMM')} –{' '}
                            {format(parseISO(period.periodEnd), 'dd MMM yyyy')}
                        </span>
                        {daysLeft !== null && (
                            <span className={`font-medium ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                                {daysLeft < 0
                                    ? `${Math.abs(daysLeft)}d overdue`
                                    : daysLeft === 0
                                        ? 'Due today'
                                        : `${daysLeft}d left`}
                            </span>
                        )}
                    </div>
                </>
            ) : (
                <p className="text-sm text-slate-500 mt-2">No period opened yet for this cycle.</p>
            )}
        </div>
    );
};