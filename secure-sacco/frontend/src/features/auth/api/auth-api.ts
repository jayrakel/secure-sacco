import apiClient from '../../../shared/api/api-client';

export const authApi = {
    // ... existing auth methods

    verifyActivationEmail: async (token: string) => {
        const response = await apiClient.post('/auth/activation/verify-email', { token });
        return response.data;
    },

    completeActivation: async (data: { token: string; otp: string; newPassword: string }) => {
        const response = await apiClient.post('/auth/activation/complete', data);
        return response.data;
    }
};