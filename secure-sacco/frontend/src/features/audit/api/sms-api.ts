import apiClient from '../../../shared/api/api-client';

export interface SmsLog {
    id: string;
    phoneNumber: string;
    message: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    providerResponse?: string;
    cost?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SmsLogPage {
    content: SmsLog[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
}

export interface GetSmsLogsParams {
    page?: number;
    size?: number;
    status?: string;
    search?: string;
}

export const smsApi = {
    getSmsLogs: async (params: GetSmsLogsParams): Promise<SmsLogPage> => {
        const queryParams = new URLSearchParams();
        if (params.page !== undefined) queryParams.set('page', String(params.page));
        if (params.size !== undefined) queryParams.set('size', String(params.size));
        if (params.status) queryParams.set('status', params.status);
        if (params.search) queryParams.set('search', params.search);
        
        const qs = queryParams.toString() ? `?${queryParams}` : '';
        const response = await apiClient.get<SmsLogPage>(`/sms-logs${qs}`);
        return response.data;
    },

    retrySms: async (id: string): Promise<void> => {
        const response = await apiClient.post<void>(`/sms-logs/${id}/retry`);
        return response.data;
    }
};
