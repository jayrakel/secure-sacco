import { useState, useEffect, useCallback } from 'react';
import { getIncomeStatement, type IncomeStatementResponse } from '../api/income-statement-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';

export default function ProfitAndLossPage() {
    const [data, setData]       = useState<IncomeStatementResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try { setLoading(true); setError(null); setData(await getIncomeStatement()); }
        catch (e) { setError(getApiErrorMessage(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />
                <span className="text-slate-500">Loading Profit & Loss statement…</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">{error || 'Failed to load statement'}</div>
            </div>
        );
    }

    const fmt = (n: number) => Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 });
    const isProfit = data.netIncome >= 0;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Profit & Loss Statement</h1>
                <p className="text-slate-500 text-sm">Real-time Income Statement (Revenue vs. Expenses)</p>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp size={20} /></div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">KES {fmt(data.totalRevenue)}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><TrendingDown size={20} /></div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">KES {fmt(data.totalExpenses)}</div>
                </div>
                <div className={`p-6 rounded-2xl border shadow-sm ${isProfit ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><Scale size={20} /></div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Net {isProfit ? 'Profit' : 'Loss'}</span>
                    </div>
                    <div className="text-2xl font-bold">KES {fmt(data.netIncome)}</div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Revenue Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">Operating Revenue (4xxx)</h2>
                    </div>
                    <div className="p-6">
                        {data.revenues.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No revenue recorded yet.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody>
                                    {data.revenues.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                                            <td className="py-3 text-slate-600">{item.accountCode} - {item.accountName}</td>
                                            <td className="py-3 text-right font-semibold text-slate-900">{fmt(item.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Expense Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">Operating Expenses (5xxx)</h2>
                    </div>
                    <div className="p-6">
                        {data.expenses.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No expenses recorded yet.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody>
                                    {data.expenses.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                                            <td className="py-3 text-slate-600">{item.accountCode} - {item.accountName}</td>
                                            <td className="py-3 text-right font-semibold text-slate-900">{fmt(item.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
