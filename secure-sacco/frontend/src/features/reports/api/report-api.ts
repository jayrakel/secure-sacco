import apiClient from '../../../shared/api/api-client';

export interface StatementItemDTO {
    date: string;
    module: string;
    type: string;
    amount: number;
    reference: string;
    description: string;
}

export const reportApi = {
    getMemberStatement: async (memberId: string, fromDate?: string, toDate?: string) => {
        const params = new URLSearchParams();
        if (fromDate) params.append('from', fromDate + "T00:00:00");
        if (toDate) params.append('to', toDate + "T23:59:59");

        const response = await apiClient.get<StatementItemDTO[]>(`/reports/members/${memberId}/statement?${params.toString()}`);
        return response.data;
    }
};