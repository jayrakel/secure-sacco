import apiClient from '../../../shared/api/api-client';

export interface InitiateStkRequest {
    phoneNumber: string;
    amount: number;
    accountReference: string;
}

export interface InitiateStkResponse {
    message: string;
    checkoutRequestID: string;
    customerMessage: string;
}

export interface CoopBalanceResponse {
    MessageReference: string;
    MessageCode: string;
    MessageDescription: string;
    AccountName: string;
    AccountNumber: string;
    Currency: string;
    AvailableBalance: number;
    BookedBalance: number;
    ClearedBalance: number;
}

export const paymentApi = {
    initiateStkPush: async (data: InitiateStkRequest): Promise<InitiateStkResponse> => {
        const response = await apiClient.post<InitiateStkResponse>('/payments/stk-push', data);
        return response.data;
    },

    getCoopBalance: async (): Promise<CoopBalanceResponse> => {
        const response = await apiClient.get<CoopBalanceResponse>('/payments/coop/balance');
        return response.data;
    }
};