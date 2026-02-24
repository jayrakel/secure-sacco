import { useEffect, useState } from 'react';
import { roleApi, type Role, type Permission } from '../api/role-api';

export const RolesPermissionsPage = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([roleApi.getRoles(), roleApi.getPermissions()])
            .then(([rolesRes, permRes]) => {
                setRoles(rolesRes.data);
                setAllPermissions(permRes.data);
            })
            .finally(() => setLoading(false));
    }, []);

    const togglePermission = async (role: Role, permissionId: string) => {
        const hasPermission = role.permissions.some(p => p.id === permissionId);
        const newPermissionIds = hasPermission
            ? role.permissions.filter(p => p.id !== permissionId).map(p => p.id)
            : [...role.permissions.map(p => p.id), permissionId];

        try {
            await roleApi.updateRolePermissions(role.id, newPermissionIds);
            // Refresh local state
            setRoles(prev => prev.map(r =>
                r.id === role.id ? { ...r, permissions: allPermissions.filter(p => newPermissionIds.includes(p.id)) } : r
            ));
        } catch (err) {
            alert("Failed to update permissions");
        }
    };

    if (loading) return <div className="p-8">Loading Security Matrix...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Security Matrix</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded shadow">New Role</button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">
                            Permission / Module
                        </th>
                        {roles.map(role => (
                            <th key={role.id} className="p-4 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                                {role.name}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {allPermissions.map(perm => (
                        <tr key={perm.id} className="hover:bg-gray-50">
                            <td className="p-4 sticky left-0 bg-white border-r">
                                <div className="font-medium text-gray-900">{perm.code}</div>
                                <div className="text-xs text-gray-500">{perm.description}</div>
                            </td>
                            {roles.map(role => (
                                <td key={role.id} className="p-4 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        checked={role.permissions.some(p => p.id === perm.id)}
                                        onChange={() => togglePermission(role, perm.id)}
                                        disabled={role.name === 'SYSTEM_ADMIN'} // Protect the superuser
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};