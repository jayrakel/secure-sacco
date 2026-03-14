import { useState, useEffect } from 'react';
import { loanApi, type LoanApplication, type LoanSummary } from '../api/loan-api';
import { TrendingDown, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';

interface ActiveLoanCardProps {
    application: LoanApplication;
    onRepayClick: () => void;
}

export function ActiveLoanCard({ application, onRepayClick }: ActiveLoanCardProps) {
    const [summary, setSummary] = useState<LoanSummary | null>(null);
    const [loading, setLoading] = useState(true);  // starts true; never set synchronously in effect

    useEffect(() => {
        let cancelled = false;

        loanApi.getLoanSummary(application.id)
            .then((result) => {
                if (!cancelled) {
                    setSummary(result);
                }
            })
            .catch((error: unknown) => {
                console.error(error);
                if (!cancelled) {
                    setSummary(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [application.id]);

    if (loading) return <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 animate-pulse h-64"></div>;
    if (!summary) return null;

    const isDefaulted = summary.totalArrears > 0;

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col ${isDefaulted ? 'border-red-300' : 'border-emerald-200'}`}>
            <div className={`p-4 flex justify-between items-center border-b ${isDefaulted ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <h3 className="font-bold text-slate-800">{summary.productName}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${isDefaulted ? 'bg-red-200 text-red-800' : 'bg-emerald-200 text-emerald-800'}`}>
                    {isDefaulted ? 'IN ARREARS' : summary.status.replace('_', ' ')}
                </span>
            </div>

            <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1 flex items-center gap-1"><TrendingDown size={14}/> Outstanding</p>
                        <p className="text-lg font-bold text-slate-900">{summary.totalOutstanding.toLocaleString()} KES</p>
                    </div>

                    <div className={`${summary.totalArrears > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'} p-3 rounded-lg border`}>
                        <p className={`text-xs font-medium uppercase mb-1 flex items-center gap-1 ${summary.totalArrears > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                            <AlertTriangle size={14}/> Arrears
                        </p>
                        <p className={`text-lg font-bold ${summary.totalArrears > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                            {summary.totalArrears.toLocaleString()} KES
                        </p>
                    </div>
                </div>

                <div className="space-y-3 mt-2">
                    {summary.prepaymentCredit > 0 && (
                        <div className="flex justify-between items-center text-sm p-2 bg-blue-50 text-blue-800 rounded border border-blue-100">
                            <span className="font-medium">Prepayment Credit Rollover</span>
                            <span className="font-bold">+{summary.prepaymentCredit.toLocaleString()} KES</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-2"><Calendar size={16}/> Next Due Date</span>
                        <span className="font-medium text-slate-800">
                            {summary.nextDueDate ? new Date(summary.nextDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-2"><CheckCircle2 size={16}/> Next Amount Due</span>
                        <span className="font-medium text-slate-800">{summary.nextDueAmount.toLocaleString()} KES</span>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={onRepayClick} className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm flex justify-center items-center gap-2">
                    Make Repayment
                </button>
            </div>
        </div>
    );
}