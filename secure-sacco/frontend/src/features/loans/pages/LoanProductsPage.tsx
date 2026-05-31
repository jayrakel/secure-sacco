import { useState, useEffect, useCallback } from 'react';
import { loanApi } from '../api/loan-api';
import type { LoanProduct, LoanProductRequest } from '../api/loan-api';
import {
    Plus, Pencil, X, Check, Loader2, ToggleLeft, ToggleRight,
    BookOpen, Percent, Clock, DollarSign, AlertCircle, Calendar,
} from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const REPAYMENT_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
const INTEREST_MODELS = ['FLAT', 'REDUCING_BALANCE', 'COMPOUND'];

const fmtModel = (m: string) => m.replace(/_/g, ' ');

const emptyForm = (): LoanProductRequest => ({
    name: '',
    description: '',
    repaymentFrequency: 'WEEKLY',
    termWeeks: 12,
    interestModel: 'REDUCING_BALANCE',
    interestRate: 12,
    applicationFee: 0,
    gracePeriodDays: 3,
    isActive: true,
});

// ── Input primitives ──────────────────────────────────────────────────────────

const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white placeholder-slate-300 transition-all';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">{label}</label>
        {children}
        {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
);

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
    product: LoanProduct | null; // null = create mode
    onClose: () => void;
    onSaved: (p: LoanProduct) => void;
}

function ProductModal({ product, onClose, onSaved }: ModalProps) {
    const [form, setForm] = useState<LoanProductRequest>(
        product ? {
            name: product.name,
            description: product.description ?? '',
            repaymentFrequency: product.repaymentFrequency,
            termWeeks: product.termWeeks,
            interestModel: product.interestModel,
            interestRate: product.interestRate,
            applicationFee: product.applicationFee,
            gracePeriodDays: product.gracePeriodDays,
            isActive: product.isActive,
        } : emptyForm()
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = <K extends keyof LoanProductRequest>(k: K, v: LoanProductRequest[K]) =>
        setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError('Name is required.'); return; }
        setSaving(true);
        setError('');
        try {
            const saved = product
                ? await loanApi.updateProduct(product.id, form)
                : await loanApi.createProduct(form);
            onSaved(saved);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to save loan product.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">
                            {product ? `Edit: ${product.name}` : 'New Loan Product'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {product ? 'Update product configuration.' : 'Define a new loan type for members.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                            <AlertCircle size={13} className="shrink-0" /> {error}
                        </div>
                    )}

                    <Field label="Product Name">
                        <input className={inputCls} value={form.name}
                               placeholder="e.g. Development Loan"
                               onChange={e => set('name', e.target.value)} />
                    </Field>

                    <Field label="Description">
                        <textarea className={inputCls} rows={2} value={form.description}
                                  placeholder="Short description of this loan product..."
                                  onChange={e => set('description', e.target.value)} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Repayment Frequency">
                            <select className={inputCls} value={form.repaymentFrequency}
                                    onChange={e => set('repaymentFrequency', e.target.value)}>
                                {REPAYMENT_FREQUENCIES.map(f => (
                                    <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Term (Weeks)">
                            <input type="number" className={inputCls} min={1} value={form.termWeeks}
                                   onChange={e => set('termWeeks', parseInt(e.target.value) || 1)} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Interest Model">
                            <select className={inputCls} value={form.interestModel}
                                    onChange={e => set('interestModel', e.target.value)}>
                                {INTEREST_MODELS.map(m => (
                                    <option key={m} value={m}>{fmtModel(m)}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Interest Rate (%)" hint="Annual rate">
                            <input type="number" className={inputCls} min={0} step={0.5}
                                   value={form.interestRate}
                                   onChange={e => set('interestRate', parseFloat(e.target.value) || 0)} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Application Fee (KES)">
                            <input type="number" className={inputCls} min={0}
                                   value={form.applicationFee}
                                   onChange={e => set('applicationFee', parseFloat(e.target.value) || 0)} />
                        </Field>

                        <Field label="Grace Period (Days)" hint="Before penalties apply">
                            <input type="number" className={inputCls} min={0}
                                   value={form.gracePeriodDays}
                                   onChange={e => set('gracePeriodDays', parseInt(e.target.value) || 0)} />
                        </Field>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between pt-1">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Product Active</p>
                            <p className="text-xs text-slate-400">Members can apply when active.</p>
                        </div>
                        <button type="button"
                                onClick={() => set('isActive', !form.isActive)}
                                className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors cursor-pointer ${form.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
                            className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoanProductsPage() {
    const [products, setProducts] = useState<LoanProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState<'create' | LoanProduct | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

    const flash = (ok: boolean, msg: string) => {
        setToast({ ok, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setProducts(await loanApi.getAllProducts());
        } catch {
            setError('Failed to load loan products.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleToggle = async (product: LoanProduct) => {
        setToggling(product.id);
        try {
            const updated = await loanApi.toggleProduct(product);
            setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
            flash(true, `${updated.name} ${updated.isActive ? 'activated' : 'deactivated'}.`);
        } catch (err) {
            flash(false, getApiErrorMessage(err, 'Failed to toggle product.'));
        } finally {
            setToggling(null);
        }
    };

    const handleSaved = (saved: LoanProduct) => {
        setProducts(prev => {
            const exists = prev.find(p => p.id === saved.id);
            return exists
                ? prev.map(p => p.id === saved.id ? saved : p)
                : [saved, ...prev];
        });
        setModal(null);
        flash(true, `${saved.name} saved successfully.`);
    };

    const active   = products.filter(p => p.isActive);
    const inactive = products.filter(p => !p.isActive);

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Loan Products</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Define and manage loan types available to members.</p>
                </div>
                <button onClick={() => setModal('create')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shrink-0">
                    <Plus size={15} /> New Product
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-sm ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {toast.ok ? <Check size={14} className="text-emerald-600 shrink-0" /> : <AlertCircle size={14} className="text-red-500 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Loading products…</span>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                    <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-600">No loan products yet</p>
                    <p className="text-sm text-slate-400 mt-1 mb-4">Create your first loan product to allow members to apply.</p>
                    <button onClick={() => setModal('create')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
                        <Plus size={14} /> Create Product
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Active products */}
                    {active.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
                                Active — {active.length}
                            </p>
                            <div className="space-y-3">
                                {active.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        toggling={toggling === product.id}
                                        onEdit={() => setModal(product)}
                                        onToggle={() => handleToggle(product)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inactive products */}
                    {inactive.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
                                Inactive — {inactive.length}
                            </p>
                            <div className="space-y-3 opacity-60">
                                {inactive.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        toggling={toggling === product.id}
                                        onEdit={() => setModal(product)}
                                        onToggle={() => handleToggle(product)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <ProductModal
                    product={modal === 'create' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, toggling, onEdit, onToggle }: {
    product: LoanProduct;
    toggling: boolean;
    onEdit: () => void;
    onToggle: () => void;
}) {
    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-5 transition-all hover:shadow-md`}>
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-emerald-600" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-slate-900">{product.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
                {product.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-1">{product.description}</p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap gap-4">
                    <Stat icon={Percent} label="Interest" value={`${product.interestRate}% p.a.`} />
                    <Stat icon={Clock} label="Term" value={`${product.termWeeks} weeks`} />
                    <Stat icon={Calendar} label="Repayment" value={product.repaymentFrequency.charAt(0) + product.repaymentFrequency.slice(1).toLowerCase()} />
                    <Stat icon={DollarSign} label="App. Fee" value={`KES ${product.applicationFee.toLocaleString()}`} />
                    <Stat icon={BookOpen} label="Model" value={fmtModel(product.interestModel)} />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <button onClick={onEdit}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit">
                    <Pencil size={14} />
                </button>
                <button onClick={onToggle} disabled={toggling}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                        title={product.isActive ? 'Deactivate' : 'Activate'}>
                    {toggling
                        ? <Loader2 size={20} className="animate-spin" />
                        : product.isActive
                            ? <ToggleRight size={24} className="text-emerald-500" />
                            : <ToggleLeft size={24} />
                    }
                </button>
            </div>
        </div>
    );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Icon size={12} className="text-slate-400 shrink-0" />
            <span className="text-[10px] text-slate-400">{label}:</span>
            <span className="text-xs font-semibold text-slate-700">{value}</span>
        </div>
    );
}