import { useState, useEffect, useCallback } from 'react';
import {
    getAssets, registerAsset, updateAssetStatus,
    type AssetResponse, type AssetCategory, type AssetStatus,
} from '../api/asset-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const CATEGORIES: { value: AssetCategory; label: string; color: string; gl: string }[] = [
    { value: 'COMPUTER',  label: '💻 Computer / Software', color: 'bg-blue-100 text-blue-800',   gl: '1340' },
    { value: 'FURNITURE', label: '🪑 Furniture & Fittings', color: 'bg-purple-100 text-purple-800', gl: '1330' },
    { value: 'EQUIPMENT', label: '🖨️ Office Equipment',     color: 'bg-amber-100 text-amber-800',  gl: '1320' },
    { value: 'VEHICLE',   label: '🚗 Vehicle',              color: 'bg-green-100 text-green-800',  gl: '1320' },
    { value: 'OTHER',     label: '📦 Other',                color: 'bg-slate-100 text-slate-700',  gl: '1300' },
];

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
    { value: 'UNDER_MAINTENANCE', label: '🔧 Under Maintenance' },
    { value: 'DISPOSED',          label: '🗑️ Disposed' },
    { value: 'WRITTEN_OFF',       label: '❌ Written Off' },
];

const CategoryBadge = ({ category }: { category: AssetCategory }) => {
    const c = CATEGORIES.find(x => x.value === category);
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c?.color ?? 'bg-slate-100 text-slate-700'}`}>{c?.label ?? category}</span>;
};

const StatusBadge = ({ status }: { status: AssetStatus }) => {
    const styles: Record<AssetStatus, string> = {
        ACTIVE:            'bg-emerald-100 text-emerald-800 border border-emerald-200',
        UNDER_MAINTENANCE: 'bg-amber-100 text-amber-800 border border-amber-200',
        DISPOSED:          'bg-slate-100 text-slate-600 border border-slate-200',
        WRITTEN_OFF:       'bg-red-100 text-red-800 border border-red-200',
    };
    const labels: Record<AssetStatus, string> = {
        ACTIVE: '✅ Active', UNDER_MAINTENANCE: '🔧 Maintenance',
        DISPOSED: '🗑️ Disposed', WRITTEN_OFF: '❌ Written Off',
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
};

const inp = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1.5';

const BLANK_FORM = { assetName: '', category: '' as AssetCategory, purchaseDate: '', purchaseCost: '', serialNumber: '', description: '', location: '', supplier: '', warrantyExpiry: '' };

export default function StaffAssetsPage() {
    const [assets, setAssets]       = useState<AssetResponse[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Register modal
    const [showRegister, setShowRegister] = useState(false);
    const [form, setForm]   = useState(BLANK_FORM);
    const [saving, setSaving] = useState(false);

    // Status modal
    const [statusTarget, setStatusTarget]   = useState<AssetResponse | null>(null);
    const [newStatus, setNewStatus]         = useState<AssetStatus>('UNDER_MAINTENANCE');
    const [disposalNotes, setDisposalNotes] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const fetchAssets = useCallback(async () => {
        try { setLoading(true); setError(null); setAssets(await getAssets()); }
        catch (e) { setError(getApiErrorMessage(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAssets(); }, [fetchAssets]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setActionError(null);
        try {
            await registerAsset({
                assetName:    form.assetName.trim(),
                category:     form.category,
                purchaseDate: form.purchaseDate,
                purchaseCost: parseFloat(form.purchaseCost),
                serialNumber:   form.serialNumber.trim()   || undefined,
                description:    form.description.trim()   || undefined,
                location:       form.location.trim()      || undefined,
                supplier:       form.supplier.trim()      || undefined,
                warrantyExpiry: form.warrantyExpiry       || undefined,
            });
            setShowRegister(false);
            setForm(BLANK_FORM);
            await fetchAssets();
        } catch (e) { setActionError(getApiErrorMessage(e)); }
        finally { setSaving(false); }
    };

    const openStatusModal = (asset: AssetResponse) => {
        setStatusTarget(asset);
        setNewStatus('UNDER_MAINTENANCE');
        setDisposalNotes('');
        setActionError(null);
    };

    const handleStatusUpdate = async () => {
        if (!statusTarget) return;
        setUpdatingStatus(true); setActionError(null);
        try {
            await updateAssetStatus(statusTarget.id, {
                newStatus,
                disposalNotes: disposalNotes.trim() || undefined,
            });
            setStatusTarget(null);
            await fetchAssets();
        } catch (e) { setActionError(getApiErrorMessage(e)); }
        finally { setUpdatingStatus(false); }
    };

    const isTerminal = (s: AssetStatus) => s === 'DISPOSED' || s === 'WRITTEN_OFF';
    const totalValue = assets.filter(a => !isTerminal(a.status)).reduce((s, a) => s + Number(a.purchaseCost), 0);
    const active     = assets.filter(a => a.status === 'ACTIVE').length;
    const disposed   = assets.filter(a => isTerminal(a.status)).length;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Asset Register</h1>
                        <p className="text-slate-500 text-sm mt-1">SACCO-owned fixed assets — no deletions, status changes only</p>
                    </div>
                    <button id="btn-register-asset" onClick={() => { setShowRegister(true); setActionError(null); }}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-95">
                        <span className="text-lg leading-none">+</span> Register Asset
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    {[
                        { label: 'Total Assets',   value: assets.length,                                                      color: 'text-slate-800' },
                        { label: 'Book Value (KES)',value: totalValue.toLocaleString('en-KE', { minimumFractionDigits: 2 }), color: 'text-emerald-600' },
                        { label: 'Active',          value: active,                                                             color: 'text-emerald-600' },
                        { label: 'Disposed / W/Off',value: disposed,                                                          color: 'text-red-500' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                            <p className={`text-2xl font-bold mt-1 ${color} truncate`}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-700">All Assets ({assets.length})</h2>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />Loading assets…
                    </div>
                ) : assets.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="text-5xl mb-3">📦</div>
                        <p className="text-slate-500 font-medium">No assets registered yet</p>
                        <p className="text-slate-400 text-sm mt-1">Click "Register Asset" to add the first one</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    {['Asset Name', 'Category', 'Status', 'Cost (KES)', 'Purchase Date', 'Location', 'GL Ref', 'Actions'].map(h => (
                                        <th key={h} className={`px-6 py-3 font-semibold ${h === 'Cost (KES)' ? 'text-right' : h === 'Status' || h === 'Actions' ? 'text-center' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {assets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-800">{asset.assetName}</p>
                                            {asset.serialNumber && <p className="text-xs text-slate-400 font-mono">S/N: {asset.serialNumber}</p>}
                                        </td>
                                        <td className="px-6 py-4"><CategoryBadge category={asset.category} /></td>
                                        <td className="px-6 py-4 text-center"><StatusBadge status={asset.status} /></td>
                                        <td className="px-6 py-4 text-right font-semibold text-slate-800">
                                            {Number(asset.purchaseCost).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                                            {new Date(asset.purchaseDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">{asset.location ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-emerald-600">{asset.journalReference ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-6 py-4 text-center">
                                            {!isTerminal(asset.status) ? (
                                                <button id={`btn-status-${asset.id}`} onClick={() => openStatusModal(asset)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
                                                    Change Status
                                                </button>
                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Register Asset Modal */}
            {showRegister && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Register New Asset</h3>
                            <p className="text-sm text-slate-500 mt-1">A GL journal entry will be posted automatically on registration</p>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{actionError}</div>}

                            <div>
                                <label className={lbl}>Asset Name *</label>
                                <input id="input-asset-name" required placeholder="e.g. HP LaserJet Pro M404n" value={form.assetName}
                                    onChange={e => setForm(f => ({ ...f, assetName: e.target.value }))} className={inp} />
                            </div>

                            <div>
                                <label className={lbl}>Category *</label>
                                <select id="input-asset-category" required value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value as AssetCategory }))} className={inp}>
                                    <option value="">Select category…</option>
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label} (GL {c.gl})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Purchase Date *</label>
                                    <input id="input-purchase-date" type="date" required value={form.purchaseDate}
                                        onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className={inp} />
                                </div>
                                <div>
                                    <label className={lbl}>Purchase Cost (KES) *</label>
                                    <input id="input-purchase-cost" type="number" required min="0.01" step="0.01" placeholder="e.g. 45000"
                                        value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} className={inp} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Serial Number</label>
                                    <input id="input-serial-number" placeholder="e.g. SN123456" value={form.serialNumber}
                                        onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} className={inp} />
                                </div>
                                <div>
                                    <label className={lbl}>Location</label>
                                    <input id="input-asset-location" placeholder="e.g. Head Office" value={form.location}
                                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inp} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Supplier</label>
                                    <input id="input-supplier" placeholder="e.g. Computer Palace Ltd" value={form.supplier}
                                        onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className={inp} />
                                </div>
                                <div>
                                    <label className={lbl}>Warranty Expiry</label>
                                    <input id="input-warranty-expiry" type="date" value={form.warrantyExpiry}
                                        onChange={e => setForm(f => ({ ...f, warrantyExpiry: e.target.value }))} className={inp} />
                                </div>
                            </div>

                            <div>
                                <label className={lbl}>Description</label>
                                <textarea id="input-asset-description" rows={2} placeholder="Optional notes about the asset…"
                                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className={`${inp} resize-none`} />
                            </div>

                            {form.category && (
                                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-xl font-mono space-y-0.5">
                                    <p className="font-semibold text-sm text-emerald-800">GL entry on registration:</p>
                                    <p>DR {CATEGORIES.find(c => c.value === form.category)?.gl} Fixed Asset Account</p>
                                    <p>CR 1110 Main Bank Account</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowRegister(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button id="btn-confirm-register" type="submit" disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                                    {saving ? 'Registering…' : 'Register Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            {statusTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Change Asset Status</h3>
                            <p className="text-sm text-slate-500 mt-1">{statusTarget.assetName}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{actionError}</div>}
                            <div>
                                <label className={lbl}>New Status *</label>
                                <select id="input-new-status" value={newStatus}
                                    onChange={e => setNewStatus(e.target.value as AssetStatus)} className={inp}>
                                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>Notes {(newStatus === 'DISPOSED' || newStatus === 'WRITTEN_OFF') ? '*' : '(optional)'}</label>
                                <textarea id="input-disposal-notes" rows={3}
                                    placeholder={newStatus === 'UNDER_MAINTENANCE' ? 'e.g. Sent for screen repair…' : 'e.g. Sold for KES 5,000 to vendor…'}
                                    value={disposalNotes} onChange={e => setDisposalNotes(e.target.value)}
                                    className={`${inp} resize-none`} />
                            </div>
                            {(newStatus === 'DISPOSED' || newStatus === 'WRITTEN_OFF') && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                    ⚠️ This is a <strong>terminal action</strong> — the asset cannot be reactivated. Post the disposal GL entry manually via the Manual GL Posting page.
                                </p>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setStatusTarget(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button id="btn-confirm-status" onClick={handleStatusUpdate}
                                    disabled={updatingStatus || ((newStatus === 'DISPOSED' || newStatus === 'WRITTEN_OFF') && !disposalNotes.trim())}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                                    {updatingStatus ? 'Updating…' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
