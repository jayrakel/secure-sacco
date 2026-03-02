import apiClient from '../../../shared/api/api-client';

export interface StatementTransactionResponse {
    transactionId: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    channel: 'CASH' | 'MPESA';
    amount: number;
    reference: string;
    status: 'PENDING' | 'POSTED' | 'FAILED' | 'REVERSED';
    postedAt: string;
    runningBalance: number;
}

export interface SavingsBalanceResponse {
    availableBalance: number;
    accountStatus: string;
}

export const savingsApi = {
    manualDeposit: async (data: { memberId: string; amount: number; referenceNotes?: string }) => {
        const response = await apiClient.post('/savings/deposits/manual', data);
        return response.data;
    },

    manualWithdrawal: async (data: { memberId: string; amount: number; referenceNotes?: string }) => {
        const response = await apiClient.post('/savings/withdrawals/manual', data);
        return response.data;
    },

    getMemberStatement: async (memberId: string, from?: string, to?: string): Promise<StatementTransactionResponse[]> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const url = `/savings/members/${memberId}/statement${params.toString() ? '?' + params.toString() : ''}`;
        const response = await apiClient.get<StatementTransactionResponse[]>(url);
        return response.data;
    },

    getMyBalance: async (): Promise<SavingsBalanceResponse> => {
        const response = await apiClient.get('/savings/me/balance');
        return response.data;
    },

    getMyStatement: async (from?: string, to?: string): Promise<StatementTransactionResponse[]> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const url = `/savings/me/statement${params.toString() ? '?' + params.toString() : ''}`;
        const response = await apiClient.get<StatementTransactionResponse[]>(url);
        return response.data;
    },

    initiateMpesaDeposit: async (data: { phoneNumber: string; amount: number }) => {
        const response = await apiClient.post('/savings/deposits/mpesa/initiate', data);
        return response.data;
    }
};