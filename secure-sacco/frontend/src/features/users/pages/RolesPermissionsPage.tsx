import React, { useCallback, useEffect, useState } from 'react';
import { roleApi, type Role, type Permission } from '../api/role-api';
import { Shield, Plus, Loader2, Save, AlertTriangle, ShieldCheck, X, ChevronDown, CheckCircle } from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

export default function RolesPermissionsPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editedPermissionIds, setEditedPermissionIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showRoleList, setShowRoleList] = useState(false); // mobile toggle

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleSelectRole = useCallback((role: Role) => {
        setSelectedRole(role);
        setEditedPermissionIds(role.permissions.map((p) => p.id));
        setShowRoleList(false); // close mobile dropdown after selecting
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [rolesData, permsData] = await Promise.all([
                roleApi.getAllRoles(),
                roleApi.getAllPermissions(),
            ]);
            setRoles(rolesData);
            setAllPermissions(permsData);
            if (rolesData.length > 0) handleSelectRole(rolesData[0]);
        } catch (error: unknown) {
            setError(getApiErrorMessage(error, 'Failed to load roles and permissions.'));
        } finally {
            setIsLoading(false);
        }
    }, [handleSelectRole]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const handleTogglePermission = (permissionId: string) => {
        if (selectedRole?.name === 'SYSTEM_ADMIN') return;
        setEditedPermissionIds((prev) =>
            prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setIsSaving(true);
        setSuccessMessage('');
        try {
            const result = await roleApi.updateRolePermissions(selectedRole.id, editedPermissionIds);
            const updatedPermissions = allPermissions.filter((p) => editedPermissionIds.includes(p.id));
            const updatedRole: Role = { ...selectedRole, permissions: updatedPermissions };
            setRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? updatedRole : r)));
            setSelectedRole(updatedRole);

            // Show notification about affected users and re-login requirement
            const affectedUsers = (result as any)?.affectedUsers || 0;
            const message = affectedUsers > 0
                ? `✅ Permissions updated successfully! ${affectedUsers} user(s) will need to re-authenticate on their next action.`
                : '✅ Permissions updated successfully!';
            setSuccessMessage(message);

            // Auto-clear success message after 6 seconds
            setTimeout(() => setSuccessMessage(''), 6000);
        } catch (error: unknown) {
            alert(getApiErrorMessage(error, 'Failed to update permissions.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        setIsCreating(true);
        try {
            const newRole = await roleApi.createRole({
                name: newRoleName.toUpperCase().replace(/\s+/g, '_'),
                description: newRoleDesc,
                permissionIds: [],
            });
            setRoles((prev) => [...prev, newRole]);
            setIsCreateModalOpen(false);
            setNewRoleName('');
            setNewRoleDesc('');
            handleSelectRole(newRole);
        } catch (error: unknown) {
            alert(getApiErrorMessage(error, 'Failed to create role.'));
        } finally {
            setIsCreating(false);
        }
    };

    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        const group = perm.code.split('_')[0];
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const hasChanges =
        selectedRole &&
        (selectedRole.permissions.length !== editedPermissionIds.length ||
            !selectedRole.permissions.every((p) => editedPermissionIds.includes(p.id)));

    const isSystemAdmin = selectedRole?.name === 'SYSTEM_ADMIN';

    if (isLoading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-4 text-emerald-600" size={40} />
                <p>Loading security matrices...</p>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 sm:p-6 text-red-600 bg-red-50 rounded-xl m-4 sm:m-6 font-medium">{error}</div>;
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Roles & Permissions</h1>
                    <p className="text-slate-500 text-sm mt-1">Configure system access levels and granular permissions.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 text-sm"
                >
                    <Plus size={16} /> Add New Role
                </button>
            </div>

            {/* ── Success Message ── */}
            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3">
                    <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* ── Mobile: role selector dropdown ── */}
            <div className="md:hidden">
                <button
                    onClick={() => setShowRoleList(!showRoleList)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-semibold text-slate-700"
                >
                    <div className="flex items-center gap-2">
                        <Shield size={15} className={selectedRole?.name === 'SYSTEM_ADMIN' ? 'text-red-500' : 'text-emerald-600'} />
                        {selectedRole ? selectedRole.name.replace(/_/g, ' ') : 'Select a role'}
                    </div>
                    <ChevronDown size={16} className={`transition-transform ${showRoleList ? 'rotate-180' : ''}`} />
                </button>

                {showRoleList && (
                    <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => handleSelectRole(role)}
                                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-b border-slate-100 last:border-0 transition-colors ${
                                    selectedRole?.id === role.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'hover:bg-slate-50'
                                }`}
                            >
                                <Shield size={14} className={role.name === 'SYSTEM_ADMIN' ? 'text-red-500' : 'text-emerald-600'} />
                                {role.name.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Desktop: two-column layout / Mobile: stacked ── */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6">

                {/* Roles list — hidden on mobile (use dropdown above) */}
                <div className="hidden md:flex w-72 bg-white rounded-2xl border border-slate-200 shadow-sm flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 text-sm">
                        System Roles
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => handleSelectRole(role)}
                                className={`w-full text-left p-3 rounded-xl transition border-2 ${
                                    selectedRole?.id === role.id
                                        ? 'border-emerald-500 bg-emerald-50/50'
                                        : 'border-transparent hover:bg-slate-50'
                                }`}
                            >
                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Shield size={14} className={role.name === 'SYSTEM_ADMIN' ? 'text-red-500' : 'text-emerald-600'} />
                                    {role.name.replace(/_/g, ' ')}
                                </div>
                                {role.description && (
                                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{role.description}</div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Permissions panel */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-w-0">
                    {selectedRole ? (
                        <>
                            {/* Panel header */}
                            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                        {selectedRole.name.replace(/_/g, ' ')} Matrix
                                        {isSystemAdmin && (
                                            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                <AlertTriangle size={12} /> Immutable
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-slate-500 text-xs sm:text-sm mt-1">Select the permissions granted to this role.</p>
                                </div>
                                <button
                                    onClick={handleSavePermissions}
                                    disabled={!hasChanges || isSaving || isSystemAdmin}
                                    className={`self-start sm:self-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold transition flex items-center gap-2 text-sm ${
                                        hasChanges && !isSystemAdmin
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </div>

                            {/* Permissions grid */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                {isSystemAdmin && (
                                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3 text-sm">
                                        <ShieldCheck className="mt-0.5 shrink-0" size={18} />
                                        <p>
                                            The <strong>SYSTEM_ADMIN</strong> role is a master role with implicit access to all operations.
                                            Its permissions cannot be modified to prevent system lockouts.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-6 sm:space-y-8">
                                    {Object.entries(groupedPermissions).map(([group, perms]) => (
                                        <div key={group}>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4 pb-2 border-b border-slate-100">
                                                {group} Management
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                {perms.map((perm) => (
                                                    <label
                                                        key={perm.id}
                                                        className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                                                            isSystemAdmin ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-emerald-300'
                                                        } ${
                                                            editedPermissionIds.includes(perm.id) ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
                                                        }`}
                                                    >
                                                        <div className="mt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                disabled={isSystemAdmin}
                                                                checked={editedPermissionIds.includes(perm.id)}
                                                                onChange={() => handleTogglePermission(perm.id)}
                                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 disabled:opacity-50"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-700 text-xs sm:text-sm break-all">{perm.code}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">{perm.description}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 p-12">
                            Select a role to view its permissions
                        </div>
                    )}
                </div>
            </div>

            {/* Create Role Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-slate-800 mb-1">Create New Role</h3>
                        <p className="text-slate-500 text-sm mb-6">Define a new security profile for the SACCO.</p>

                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Role Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. HR_MANAGER"
                                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase text-sm"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="What can this role do?"
                                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
                                    value={newRoleDesc}
                                    onChange={(e) => setNewRoleDesc(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 mt-2"
                            >
                                {isCreating ? <Loader2 className="animate-spin" size={18} /> : 'Create Role'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}