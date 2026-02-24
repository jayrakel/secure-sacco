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

export const roleApi = {
    getAllRoles: async () => {
        const response = await apiClient.get<Role[]>('/roles');
        return response.data;
    }
};