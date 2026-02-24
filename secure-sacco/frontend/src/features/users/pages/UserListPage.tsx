import { useEffect, useState } from 'react';
import { userApi, type User } from '../api/user-api';
import { roleApi, type Role } from '../api/role-api';
import HasPermission from '../../../shared/components/HasPermission';
import { Plus, Edit2, Trash2, Shield, Search, Loader2, ShieldAlert, X, Save } from 'lucide-react';

export default function UserListPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [isSavingRoles, setIsSavingRoles] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetch users and roles in parallel for performance
            const [usersData, rolesData] = await Promise.all([
                userApi.getAllUsers(),
                roleApi.getAllRoles()
            ]);
            setUsers(usersData);
            setAvailableRoles(rolesData);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load system data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Actions ---

    const handleStatusToggle = async (userId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
            await userApi.updateUserStatus(userId, newStatus);
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } catch (err) {
            alert("Failed to update user status");
        }
    };

    const handleDelete = async (userId: string) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await userApi.deleteUser(userId);
            setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
            alert("Failed to delete user");
        }
    };

    // --- Role Modal Logic ---

    const openRoleModal = (user: User) => {
        setSelectedUser(user);

        // Map the user's string roles (e.g. "SYSTEM_ADMIN") to the available UUIDs
        const userRoleIds = availableRoles
            .filter(role => user.roles.includes(role.name))
            .map(role => role.id);

        setSelectedRoleIds(userRoleIds);
        setIsRoleModalOpen(true);
    };

    const toggleRoleSelection = (roleId: string) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId)
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    const handleSaveRoles = async () => {
        if (!selectedUser) return;
        if (selectedRoleIds.length === 0) {
            alert("A user must have at least one role.");
            return;
        }

        setIsSavingRoles(true);
        try {
            await userApi.updateUserRoles(selectedUser.id, selectedRoleIds);

            // Map saved UUIDs back to role names for immediate UI update
            const updatedRoleNames = availableRoles
                .filter(role => selectedRoleIds.includes(role.id))
                .map(role => role.name);

            setUsers(users.map(u =>
                u.id === selectedUser.id ? { ...u, roles: updatedRoleNames } : u
            ));

            setIsRoleModalOpen(false);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update roles");
        } finally {
            setIsSavingRoles(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage system access, roles, and security.</p>
                </div>

                {/* SHIELDED: Only users with USER_CREATE can see this button */}
                <HasPermission permission="USER_CREATE">
                    <button className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-sm">
                        <Plus size={18} />
                        Add New User
                    </button>
                </HasPermission>
            </div>

            {/* Toolbar Section */}
            <div className="bg-white p-4 rounded-t-2xl border border-slate-200 border-b-0 flex justify-between items-center">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-b-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4 font-bold">User Details</th>
                            <th className="p-4 font-bold">Roles</th>
                            <th className="p-4 font-bold">Status</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-slate-500">
                                    <Loader2 className="animate-spin mx-auto mb-3 text-emerald-600" size={32} />
                                    <p className="font-medium">Loading system data...</p>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-red-500 bg-red-50 font-medium">
                                    <ShieldAlert className="mx-auto mb-2" size={24} />
                                    {error}
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                                    No users found matching "{searchTerm}".
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                                                {user.firstName[0]}{user.lastName[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{user.firstName} {user.lastName}</div>
                                                <div className="text-slate-500 text-xs font-medium mt-0.5">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.roles.map(role => (
                                                <span key={role} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                                        <Shield size={12} />
                                                    {role.replace('ROLE_', '').replace('_', ' ')}
                                                    </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                                                user.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-red-100 text-red-700 border border-red-200'
                                            }`}>
                                                {user.status}
                                            </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">

                                            {/* SHIELDED: Status Toggle */}
                                            <HasPermission permission="USER_UPDATE">
                                                <button
                                                    onClick={() => handleStatusToggle(user.id, user.status)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                    title={user.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                                                >
                                                    <ShieldAlert size={18} />
                                                </button>
                                            </HasPermission>

                                            {/* SHIELDED: Role Assignment */}
                                            <HasPermission permission="USER_UPDATE">
                                                <button
                                                    onClick={() => openRoleModal(user)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Assign Roles"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </HasPermission>

                                            {/* SHIELDED: Delete User */}
                                            <HasPermission permission="USER_UPDATE">
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </HasPermission>

                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- ROLE ASSIGNMENT MODAL --- */}
            {isRoleModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Assign Roles</h3>
                                <p className="text-slate-500 text-sm mt-1 font-medium">
                                    Modifying access for <span className="text-slate-700 font-bold">{selectedUser.firstName} {selectedUser.lastName}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setIsRoleModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body - Checkbox List */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-3">
                                {availableRoles.map(role => (
                                    <label
                                        key={role.id}
                                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                                            selectedRoleIds.includes(role.id)
                                                ? 'border-emerald-500 bg-emerald-50/50'
                                                : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                                checked={selectedRoleIds.includes(role.id)}
                                                onChange={() => toggleRoleSelection(role.id)}
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {role.name.replace('_', ' ')}
                                                {role.name === 'SYSTEM_ADMIN' && (
                                                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">High Risk</span>
                                                )}
                                            </div>
                                            <div className="text-slate-500 text-sm mt-1">{role.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsRoleModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveRoles}
                                disabled={isSavingRoles || selectedRoleIds.length === 0}
                                className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingRoles ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Save Role Assignments
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}