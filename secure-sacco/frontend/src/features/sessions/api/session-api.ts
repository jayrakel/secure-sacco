import apiClient from '../../../shared/api/api-client';

export interface SessionResponse {
    sessionId: string;
    creationTime: string; // ISO String
    lastAccessedTime: string; // ISO String
    isExpired: boolean;
}

export const sessionApi = {
    getUserSessions: async (userId: string) => {
        const response = await apiClient.get<SessionResponse[]>(`/sessions/user/${userId}`);
        return response.data;
    },
    revokeAllUserSessions: async (userId: string) => {
        const response = await apiClient.delete(`/sessions/user/${userId}`);
        return response.data;
    },
    revokeSpecificSession: async (sessionId: string) => {
        const response = await apiClient.delete(`/sessions/${sessionId}`);
        return response.data;
    }
};