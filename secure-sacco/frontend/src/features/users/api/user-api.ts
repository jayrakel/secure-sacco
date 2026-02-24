import apiClient from '../../../shared/api/api-client';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    officialEmail: string | null;
    phoneNumber: string | null;
    status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
    roles: string[];
}

export interface CreateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    roleIds: string[];
}

export const userApi = {
    getAllUsers: async () => {
        const response = await apiClient.get<User[]>('/users');
        return response.data;
    },

    createUser: async (data: CreateUserRequest) => {
        const response = await apiClient.post<User>('/users', data);
        return response.data;
    },

    updateUserStatus: async (id: string, status: 'ACTIVE' | 'DISABLED' | 'LOCKED') => {
        const response = await apiClient.patch(`/users/${id}/status`, { status });
        return response.data;
    },

    deleteUser: async (id: string) => {
        const response = await apiClient.delete(`/users/${id}`);
        return response.data;
    }
};