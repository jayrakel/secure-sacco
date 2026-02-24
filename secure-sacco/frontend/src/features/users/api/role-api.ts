import apiClient from '../../../shared/api/api-client.ts';

export interface Permission {
    id: string;
    code: string;
    description: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
}

export const roleApi = {
    getRoles: () => apiClient.get<Role[]>('/roles'),
    getPermissions: () => apiClient.get<Permission[]>('/roles/permissions'),
    updateRolePermissions: (roleId: string, permissionIds: string[]) =>
        apiClient.put(`/roles/${roleId}/permissions`, { permissionIds }),
    createRole: (data: { name: string; description: string }) =>
        apiClient.post('/roles', data)
};