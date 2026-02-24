import React, { useEffect, useState } from 'react';
import { roleApi, type Role, type Permission } from '../api/role-api';
import { Shield, Plus, Loader2, Save, AlertTriangle, ShieldCheck, X } from 'lucide-react';

export default function RolesPermissionsPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editedPermissionIds, setEditedPermissionIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Create Role Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [rolesData, permsData] = await Promise.all([
                roleApi.getAllRoles(),
                roleApi.getAllPermissions()
            ]);
            setRoles(rolesData);
            setAllPermissions(permsData);
            if (rolesData.length > 0) {
                handleSelectRole(rolesData[0]);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load roles and permissions.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectRole = (role: Role) => {
        setSelectedRole(role);
        setEditedPermissionIds(role.permissions.map(p => p.id));
    };

    const handleTogglePermission = (permissionId: string) => {
        if (selectedRole?.name === 'SYSTEM_ADMIN') return; // Prevent editing SYSTEM_ADMIN

        setEditedPermissionIds(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setIsSaving(true);
        try {
            await roleApi.updateRolePermissions(selectedRole.id, editedPermissionIds);

            // Update local state to reflect changes
            const updatedPermissions = allPermissions.filter(p => editedPermissionIds.includes(p.id));
            const updatedRole = { ...selectedRole, permissions: updatedPermissions };

            setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
            setSelectedRole(updatedRole);
            alert("Permissions updated successfully!");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update permissions.");
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
                permissionIds: []
            });
            setRoles([...roles, newRole]);
            setIsCreateModalOpen(false);
            setNewRoleName('');
            setNewRoleDesc('');
            handleSelectRole(newRole);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to create role.");
        } finally {
            setIsCreating(false);
        }
    };

    // Group permissions by their prefix (e.g., USER_CREATE -> USER)
    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        const group = perm.code.split('_')[0];
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const hasChanges = selectedRole &&
        (selectedRole.permissions.length !== editedPermissionIds.length ||
            !selectedRole.permissions.every(p => editedPermissionIds.includes(p.id)));

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
        return <div className="p-6 text-red-600 bg-red-50 rounded-xl m-6 font-medium">{error}</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans h-[calc(100vh-6rem)] flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Roles & Permissions</h1>
                    <p className="text-slate-500 text-sm mt-1">Configure system access levels and granular permissions.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2"
                >
                    <Plus size={18} /> Add New Role
                </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Left Panel: Roles List */}
                <div className="w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
                        System Roles
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {roles.map(role => (
                            <button
                                key={role.id}
                                onClick={() => handleSelectRole(role)}
                                className={`w-full text-left p-4 rounded-xl transition border-2 ${
                                    selectedRole?.id === role.id
                                        ? 'border-emerald-500 bg-emerald-50/50'
                                        : 'border-transparent hover:bg-slate-50'
                                }`}
                            >
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    <Shield size={16} className={role.name === 'SYSTEM_ADMIN' ? 'text-red-500' : 'text-emerald-600'} />
                                    {role.name.replace(/_/g, ' ')}
                                </div>
                                {role.description && (
                                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{role.description}</div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Permission Matrix */}
                <div className="w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    {selectedRole ? (
                        <>
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        {selectedRole.name.replace(/_/g, ' ')} Matrix
                                        {isSystemAdmin && (
                                            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                <AlertTriangle size={12} /> Immutable
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-slate-500 text-sm mt-1">Select the permissions granted to this role.</p>
                                </div>
                                <button
                                    onClick={handleSavePermissions}
                                    disabled={!hasChanges || isSaving || isSystemAdmin}
                                    className={`px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2 ${
                                        hasChanges && !isSystemAdmin
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save Changes
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {isSystemAdmin && (
                                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3 text-sm">
                                        <ShieldCheck className="mt-0.5 shrink-0" size={18} />
                                        <p>The <strong>SYSTEM_ADMIN</strong> role is a master role with implicit access to all operations. Its permissions cannot be modified to prevent system lockouts.</p>
                                    </div>
                                )}

                                <div className="space-y-8">
                                    {Object.entries(groupedPermissions).map(([group, perms]) => (
                                        <div key={group}>
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                                                {group} Management
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {perms.map(perm => (
                                                    <label
                                                        key={perm.id}
                                                        className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                                                            isSystemAdmin ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-emerald-300'
                                                        } ${editedPermissionIds.includes(perm.id) ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}
                                                    >
                                                        <div className="mt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                disabled={isSystemAdmin}
                                                                checked={editedPermissionIds.includes(perm.id) || isSystemAdmin}
                                                                onChange={() => handleTogglePermission(perm.id)}
                                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 disabled:opacity-50"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">{perm.code}</div>
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
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            Select a role to view its permissions
                        </div>
                    )}
                </div>
            </div>

            {/* Create Role Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full">
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
                                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="What can this role do?"
                                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                    value={newRoleDesc}
                                    onChange={e => setNewRoleDesc(e.target.value)}
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