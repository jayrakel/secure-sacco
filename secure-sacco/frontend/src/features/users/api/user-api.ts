import apiClient from '../../../shared/api/api-client';

export interface UserDTO {
    id: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
}

export const userApi = {
    getAllUsers: () => apiClient.get<UserDTO[]>('/users'),
    createUser: (data: any) => apiClient.post('/users', data),
    updateUser: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
    deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};