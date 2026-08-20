import apiClient from '../../../shared/api/api-client';

export interface ShareProductDTO {
    name: string;
    code: string;
}

export interface AdminShareAccountDTO {
    id: string;
    memberId: string;
    memberName: string;
    memberNumber: string;
    balance: number;
    status: string;
    product: ShareProductDTO;
    createdAt: string;
}

export interface ShareTransactionDTO {
    id: string;
    amount: number;
    type: string;
    reference: string;
    createdAt: string;
}

export const sharesApi = {
    getAllAccounts: async (): Promise<AdminShareAccountDTO[]> => {
        const response = await apiClient.get('/admin/shares');
        return response.data;
    },
    getAccountTransactions: async (accountId: string): Promise<ShareTransactionDTO[]> => {
        const response = await apiClient.get(`/admin/shares/${accountId}/transactions`);
        return response.data;
    }
};
