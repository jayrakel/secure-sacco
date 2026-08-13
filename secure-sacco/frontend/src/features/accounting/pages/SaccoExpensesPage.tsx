import { useState, useEffect, useCallback } from 'react';
import { getSaccoExpenses, recordSaccoExpense, type SaccoExpenseResponse } from '../api/sacco-expense-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const EXPENSE_ACCOUNTS = [
    { code: '5230', label: 'Salaries & Wages' },
    { code: '5240', label: 'Staff Allowances & Benefits' },
    { code: '5250', label: 'Rent & Rates' },
    { code: '5260', label: 'Printing & Stationery' },
    { code: '5270', label: 'Travel & Transport' },
    { code: '5280', label: 'Electricity & Water' },
    { code: '5290', label: 'Internet & Telephone' },
    { code: '5310', label: 'Committee Allowances' },
    { code: '5320', label: 'AGM & Education Expenses' },
    { code: '5330', label: 'Audit Fees' },
    { code: '5340', label: 'Legal & Professional Fees' },
    { code: '5350', label: 'Licenses & Permits' },
];

const inp = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1.5';

const BLANK_FORM = {
    expenseDate: new Date().toISOString().split('T')[0],
    amount: '',
    glAccountCode: '',
    narration: '',
    reference: ''
};

export default function SaccoExpensesPage() {
    const [expenses, setExpenses]   = useState<SaccoExpenseResponse[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [showRecord, setShowRecord] = useState(false);
    const [form, setForm]   = useState(BLANK_FORM);
    const [saving, setSaving] = useState(false);

    const fetchExpenses = useCallback(async () => {
        try { setLoading(true); setError(null); setExpenses(await getSaccoExpenses()); }
        catch (e) { setError(getApiErrorMessage(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const handleRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setActionError(null);
        try {
            await recordSaccoExpense({
                expenseDate: form.expenseDate,
                amount: parseFloat(form.amount),
                glAccountCode: form.glAccountCode,
                narration: form.narration.trim(),
                reference: form.reference.trim() || undefined,
            });
            setShowRecord(false);
            setForm(BLANK_FORM);
            await fetchExpenses();
        } catch (e) { setActionError(getApiErrorMessage(e)); }
        finally { setSaving(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">SACCO Operating Expenses</h1>
                        <p className="text-slate-500 text-sm mt-1">Directly record operational expenses to the General Ledger</p>
                    </div>
                    <button onClick={() => { setShowRecord(true); setActionError(null); }}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-95">
                        <span className="text-lg leading-none">+</span> Record Expense
                    </button>
                </div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-700">Recent Expenses</h2>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />Loading expenses…
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="text-5xl mb-3">💸</div>
                        <p className="text-slate-500 font-medium">No expenses recorded yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold text-left">Date</th>
                                    <th className="px-6 py-3 font-semibold text-left">Narration</th>
                                    <th className="px-6 py-3 font-semibold text-left">GL Account</th>
                                    <th className="px-6 py-3 font-semibold text-right">Amount (KES)</th>
                                    <th className="px-6 py-3 font-semibold text-left">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {expenses.map((expense) => {
                                    const acct = EXPENSE_ACCOUNTS.find(a => a.code === expense.glAccountCode);
                                    return (
                                        <tr key={expense.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                {new Date(expense.expenseDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-800">{expense.narration}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-mono text-xs text-slate-500">{expense.glAccountCode} - {acct?.label || 'Unknown Account'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-slate-800">
                                                {Number(expense.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-mono text-xs text-emerald-600">{expense.journalReference}</p>
                                                {expense.reference && <p className="text-xs text-slate-400">Ref: {expense.reference}</p>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Record Operating Expense</h3>
                            <p className="text-sm text-slate-500 mt-1">This will deduct funds from the Main Bank Account and recognize the expense.</p>
                        </div>
                        <form onSubmit={handleRecord} className="p-6 space-y-4">
                            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{actionError}</div>}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Expense Date *</label>
                                    <input type="date" required value={form.expenseDate}
                                        onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} className={inp} />
                                </div>
                                <div>
                                    <label className={lbl}>Amount (KES) *</label>
                                    <input type="number" required min="0.01" step="0.01" placeholder="e.g. 5000"
                                        value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inp} />
                                </div>
                            </div>

                            <div>
                                <label className={lbl}>Expense Category (GL Account) *</label>
                                <select required value={form.glAccountCode}
                                    onChange={e => setForm(f => ({ ...f, glAccountCode: e.target.value }))} className={inp}>
                                    <option value="">Select an expense account…</option>
                                    {EXPENSE_ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.label} ({a.code})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={lbl}>Narration / Description *</label>
                                <input required placeholder="e.g. Office rent for August 2026" value={form.narration}
                                    onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} className={inp} />
                            </div>

                            <div>
                                <label className={lbl}>Reference (Invoice/Receipt No.)</label>
                                <input placeholder="e.g. INV-2026-001" value={form.reference}
                                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className={inp} />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowRecord(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                                    {saving ? 'Recording…' : 'Record Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
