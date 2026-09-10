import React, { useEffect, useState } from 'react';
import { accountingApi, type Account, type UpdateAccountRequest } from '../api/accounting-api';
import { BookOpen, Lock, CheckCircle2, XCircle, Plus, X, Edit2, AlertCircle } from 'lucide-react';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

const ChartOfAccountsPage: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Create modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ accountCode: '', accountName: '', description: '', accountType: 'ASSET' });
    const [createError, setCreateError] = useState('');

    // Edit modal
    const [editTarget, setEditTarget] = useState<Account | null>(null);
    const [editForm, setEditForm] = useState<UpdateAccountRequest>({
        accountName: '',
        description: '',
        isActive: true,
        parentAccountId: null,
    });
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');

    const fetchAccounts = async () => {
        try {
            const data = await accountingApi.getAccounts();
            const list = Array.isArray(data) ? data : [];
            setAccounts(list.sort((a, b) => a.accountCode.localeCompare(b.accountCode)));
        } catch (error) {
            console.error('Failed to load accounts', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAccounts(); }, []);

    // Create
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setCreateError('');
        try {
            await accountingApi.createAccount({
                accountCode: formData.accountCode,
                accountName: formData.accountName,
                description: formData.description,
                accountType: formData.accountType as Account['accountType'],
                parentAccountId: null,
            });
            setIsAddModalOpen(false);
            setFormData({ accountCode: '', accountName: '', description: '', accountType: 'ASSET' });
            await fetchAccounts();
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setCreateError(msg || 'Failed to create account. Please check your inputs.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit
    const openEditModal = (account: Account) => {
        setEditTarget(account);
        setEditForm({
            accountName: account.accountName,
            description: account.description || '',
            isActive: account.isActive,
            parentAccountId: account.parentAccountId,
        });
        setEditError('');
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        setEditSubmitting(true);
        setEditError('');
        try {
            await accountingApi.updateAccount(editTarget.id, editForm);
            setEditTarget(null);
            await fetchAccounts();
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setEditError(msg || 'Failed to update account.');
        } finally {
            setEditSubmitting(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ASSET':     return 'bg-blue-100 text-blue-800';
            case 'LIABILITY': return 'bg-orange-100 text-orange-800';
            case 'EQUITY':    return 'bg-purple-100 text-purple-800';
            case 'REVENUE':   return 'bg-emerald-100 text-emerald-800';
            case 'EXPENSE':   return 'bg-red-100 text-red-800';
            default:          return 'bg-slate-100 text-slate-800';
        }
    };

    const parentOptions = editTarget ? accounts.filter(a => a.id !== editTarget.id) : accounts;

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="text-blue-600" />
                        Chart of Accounts
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage the ledger accounts and their hierarchy.</p>
                </div>
                <button
                    onClick={() => { setIsAddModalOpen(true); setCreateError(''); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                    <Plus size={18} />
                    Add Account
                </button>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Add GL Account</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Code</label>
                                <input required type="text" value={formData.accountCode}
                                    onChange={e => setFormData({ ...formData, accountCode: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 2195" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                                <input required type="text" value={formData.accountName}
                                    onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Member Welfare Fund" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                                <select required value={formData.accountType}
                                    onChange={e => setFormData({ ...formData, accountType: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                <input type="text" value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            {createError && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    {createError}
                                </div>
                            )}
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Save Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Edit Account</h2>
                                <p className="text-xs text-slate-500 mt-0.5 font-mono">{editTarget.accountCode} &mdash; {editTarget.accountType}</p>
                            </div>
                            <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
                                <input required type="text" value={editForm.accountName}
                                    onChange={e => setEditForm(f => ({ ...f, accountName: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea value={editForm.description ?? ''}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Account</label>
                                <select
                                    value={editForm.parentAccountId ?? ''}
                                    onChange={e => setEditForm(f => ({ ...f, parentAccountId: e.target.value || null }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">(None &mdash; top-level account)</option>
                                    {parentOptions.map(a => (
                                        <option key={a.id} value={a.id}>{a.accountCode} &mdash; {a.accountName}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">Assigning a parent groups this account under it in financial reports.</p>
                            </div>
                            <div className="pt-1">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={editForm.isActive}
                                        disabled={editTarget.isSystemAccount}
                                        onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50" />
                                    <div>
                                        <span className="text-sm font-medium text-slate-800">Active</span>
                                        {editTarget.isSystemAccount && (
                                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                                <Lock size={11} /> System accounts cannot be deactivated.
                                            </p>
                                        )}
                                    </div>
                                </label>
                            </div>
                            {editError && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    {editError}
                                </div>
                            )}
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditTarget(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={editSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Accounts Table */}
            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : (
                <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Account Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Parent</th>
                                <th className="px-6 py-4 text-center">System</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {accounts.map(account => {
                                const parent = account.parentAccountId
                                    ? accounts.find(a => a.id === account.parentAccountId)
                                    : null;
                                return (
                                    <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium text-slate-700">{account.accountCode}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-800">{account.accountName}</p>
                                            {account.description && (
                                                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{account.description}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${getTypeColor(account.accountType)}`}>
                                                {account.accountType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {parent ? (
                                                <span className="font-mono">{parent.accountCode} &mdash; {parent.accountName}</span>
                                            ) : (
                                                <span className="text-slate-300">&mdash;</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                {account.isSystemAccount
                                                    ? <span title="System Locked"><Lock size={16} className="text-slate-400" /></span>
                                                    : <span className="text-slate-300">&mdash;</span>
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                {account.isActive
                                                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                                                    : <XCircle size={18} className="text-red-500" />
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button onClick={() => openEditModal(account)} title="Edit account"
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChartOfAccountsPage;
