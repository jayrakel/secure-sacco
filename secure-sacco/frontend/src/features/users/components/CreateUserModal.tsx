import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { userApi, type CreateUserRequest } from '../api/user-api';
import { roleApi, type Role } from '../api/role-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

interface CreateUserModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
    const [formData, setFormData] = useState<CreateUserRequest>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roleIds: [],
    });
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const roles = await roleApi.getAllRoles();
                setAvailableRoles(roles);
            } catch (err) {
                setError('Failed to load roles.');
            } finally {
                setIsLoadingRoles(false);
            }
        };
        void fetchRoles();
    }, []);

    const handleRoleToggle = (roleId: string) => {
        setFormData((prev) => ({
            ...prev,
            roleIds: prev.roleIds.includes(roleId)
                ? prev.roleIds.filter((id) => id !== roleId)
                : [...prev.roleIds, roleId],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.roleIds.length === 0) {
            setError('Please assign at least one role.');
            return;
        }

        setIsSaving(true);
        try {
            await userApi.createUser(formData);
            onSuccess();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to create user.'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Add New User</h3>
                        <p className="text-slate-500 text-sm mt-1 font-medium">
                            Create a new staff or admin account
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Last Name</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                        <input
                            required
                            type="email"
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Temporary Password</label>
                        <input
                            required
                            type="password"
                            minLength={8}
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 mt-4">Assign Roles</label>
                        {isLoadingRoles ? (
                            <div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading roles...</div>
                        ) : (
                            <div className="space-y-2 border border-slate-200 p-3 rounded-xl max-h-48 overflow-y-auto">
                                {availableRoles.map(role => (
                                    <label key={role.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                                        <input
                                            type="checkbox"
                                            className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300"
                                            checked={formData.roleIds.includes(role.id)}
                                            onChange={() => handleRoleToggle(role.id)}
                                        />
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">{role.name.replace('ROLE_', '').replace(/_/g, ' ')}</div>
                                            <div className="text-xs text-slate-500">{role.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Create User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}