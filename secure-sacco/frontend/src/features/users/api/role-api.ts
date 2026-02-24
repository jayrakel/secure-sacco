import apiClient from '../../../shared/api/api-client';

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

export interface CreateRoleRequest {
    name: string;
    description?: string;
    permissionIds?: string[];
}

export const roleApi = {
    getAllRoles: async () => {
        const response = await apiClient.get<Role[]>('/roles');
        return response.data;
    },

    getAllPermissions: async () => {
        const response = await apiClient.get<Permission[]>('/permissions');
        return response.data;
    },

    createRole: async (data: CreateRoleRequest) => {
        const response = await apiClient.post<Role>('/roles', data);
        return response.data;
    },

    updateRolePermissions: async (roleId: string, permissionIds: string[]) => {
        const response = await apiClient.put(`/roles/${roleId}/permissions`, { permissionIds });
        return response.data;
    }
};