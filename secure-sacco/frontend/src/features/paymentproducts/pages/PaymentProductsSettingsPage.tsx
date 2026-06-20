import React, { useEffect, useState } from 'react';
import {
    Package, Plus, X, Loader2, AlertCircle, Trash2, Lock
} from 'lucide-react';
import { paymentProductsApi } from '../api/payment-products-api';
import type { PaymentProduct, ModuleType } from '../api/payment-products-api';
import { accountingApi } from '../../accounting/api/accounting-api';
import type { Account } from '../../accounting/api/accounting-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const MODULE_LABELS: Record<ModuleType, string> = {
    SAVINGS: 'Savings',
    PENALTY: 'Penalty',
    LOAN: 'Loan',
    CUSTOM: 'Custom',
};

const MODULE_COLORS: Record<ModuleType, string> = {
    SAVINGS: 'bg-emerald-100 text-emerald-700',
    PENALTY: 'bg-red-100 text-red-700',
    LOAN: 'bg-blue-100 text-blue-700',
    CUSTOM: 'bg-purple-100 text-purple-700',
};

interface FormState {
    name: string;
    code: string;
    description: string;
    glAccountId: string;
}

const emptyForm: FormState = { name: '', code: '', description: '', glAccountId: '' };

export const PaymentProductsSettingsPage: React.FC = () => {
    const [products, setProducts] = useState<PaymentProduct[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm]         = useState<FormState>(emptyForm);
    const [saving, setSaving]     = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [prods, accts] = await Promise.all([
                paymentProductsApi.getAll(),
                accountingApi.getAccounts(),
            ]);
            setProducts(prods);
            setAccounts(accts);
        } catch {
            setError('Could not load payment products.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!form.name || !form.code || !form.glAccountId) {
            setError('Name, code, and GL account are required');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await paymentProductsApi.create({
                name: form.name,
                code: form.code,
                description: form.description || undefined,
                moduleType: 'CUSTOM',
                glAccountId: form.glAccountId,
            });
            setShowForm(false);
            setForm(emptyForm);
            await load();
        } catch (e) {
            setError(getApiErrorMessage(e, 'Failed to create product'));
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (p: PaymentProduct) => {
        try {
            await paymentProductsApi.update(p.id, { isActive: !p.isActive });
            await load();
        } catch (e) {
            setError(getApiErrorMessage(e, 'Failed to update product'));
        }
    };

    const handleDelete = async (p: PaymentProduct) => {
        if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
        try {
            await paymentProductsApi.remove(p.id);
            await load();
        } catch (e) {
            setError(getApiErrorMessage(e, 'Failed to delete product'));
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Payment Products</h1>
                        <p className="text-sm text-slate-500">
                            Configure what members can allocate deposits toward — savings, penalties, loans, and custom contributions.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setShowForm(true); setError(null); }}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl"
                >
                    <Plus size={18} /> New Product
                </button>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* ── Create form ── */}
            {showForm && (
                <div className="mb-6 p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">New Custom Product</h3>
                        <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-white text-slate-400">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500">Name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Meat Contribution"
                                className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500">Code</label>
                            <input
                                value={form.code}
                                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. MEAT_FUND"
                                className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-500">Description (optional)</label>
                        <input
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Shown to members on the allocation screen"
                            className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-500">GL Account to Credit</label>
                        <select
                            value={form.glAccountId}
                            onChange={e => setForm({ ...form, glAccountId: e.target.value })}
                            className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm"
                        >
                            <option value="">Select account…</option>
                            {accounts.filter(a => a.isActive).map(a => (
                                <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                            Every deposit allocated to this product posts a clean GL credit here automatically.
                        </p>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Create Product'}
                    </button>
                </div>
            )}

            {/* ── Product list ── */}
            {loading ? (
                <div className="text-center py-10 text-slate-400">Loading…</div>
            ) : (
                <div className="space-y-2">
                    {products.map(p => (
                        <div
                            key={p.id}
                            className={`flex items-center justify-between p-4 rounded-xl border ${
                                p.isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${MODULE_COLORS[p.moduleType]}`}>
                                    {MODULE_LABELS[p.moduleType]}
                                </span>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-sm text-slate-800">{p.name}</span>
                                        {p.isSystem && (
                                            <span title="System product">
                                                <Lock size={12} className="text-slate-400" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {p.code} → {p.glAccountCode} {p.glAccountName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleActive(p)}
                                    disabled={p.isSystem}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                                        p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                                    } ${p.isSystem ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                                >
                                    {p.isActive ? 'Active' : 'Inactive'}
                                </button>
                                {!p.isSystem && (
                                    <button
                                        onClick={() => handleDelete(p)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PaymentProductsSettingsPage;