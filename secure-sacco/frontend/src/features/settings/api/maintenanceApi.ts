import api from '../../../shared/api/api-client';

export interface MaintenanceEvent {
    id: string;
    title: string;
    description: string;
    maintenanceStartTime: string;
    maintenanceEndTime: string;
    notifyMembersApp: boolean;
    notifyMembersSms: boolean;
    notifyMembersEmail: boolean;
    membersNotified: boolean;
    adminReminded: boolean;
}

export interface CreateMaintenanceRequest {
    title: string;
    description: string;
    maintenanceStartTime: string; // ISO String
    maintenanceEndTime: string;   // ISO String
    notifyMembersApp: boolean;
    notifyMembersSms: boolean;
    notifyMembersEmail: boolean;
}

export const maintenanceApi = {
    getAll: async () => {
        const response = await api.get<MaintenanceEvent[]>('/maintenance');
        return response.data;
    },

    getActiveOrUpcoming: async () => {
        const response = await api.get<MaintenanceEvent[]>('/maintenance/active');
        return response.data;
    },

    schedule: async (data: CreateMaintenanceRequest) => {
        const response = await api.post<MaintenanceEvent>('/maintenance', data);
        return response.data;
    }
};
