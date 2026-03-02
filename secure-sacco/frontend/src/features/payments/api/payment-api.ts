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

export const paymentApi = {
    initiateStkPush: async (data: InitiateStkRequest): Promise<InitiateStkResponse> => {
        const response = await apiClient.post<InitiateStkResponse>('/payments/stk-push', data);
        return response.data;
    }
};