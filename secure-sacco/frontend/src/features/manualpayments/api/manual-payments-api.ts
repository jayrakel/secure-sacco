import apiClient from '../../../shared/api/api-client';

export type ManualPaymentType = 'SAVINGS' | 'PENALTY' | 'LOAN' | 'CUSTOM';
export type FundingSource = 'CASH' | 'SAVINGS_TRANSFER';

export interface OpenPenaltyOption {
    penaltyId: string;
    ruleName: string;
    outstandingAmount: number;
}

export interface CustomProductOption {
    productId: string;
    name: string;
    code: string;
}

export interface ManualPaymentContext {
    savingsBalance: number;
    openPenalties: OpenPenaltyOption[];
    hasActiveLoan: boolean;
    loanOutstandingBalance: number | null;
    customProducts: CustomProductOption[];
}

export interface ManualPaymentRequest {
    memberId: string;
    paymentType: ManualPaymentType;
    fundingSource?: FundingSource; // defaults to CASH server-side; irrelevant for SAVINGS type
    targetPenaltyId?: string | null;
    payAllPenalties?: boolean;
    customProductId?: string | null;
    amount: number;
    channel?: string;
    externalReference?: string;
    notes?: string;
}

export interface ManualPaymentResponse {
    paymentType: string;
    targetDescription: string;
    amountPosted: number;
    remainingBalance: number | null;
    reference: string;
}

export const manualPaymentsApi = {
    getContext: async (memberId: string): Promise<ManualPaymentContext> => {
        const res = await apiClient.get(`/staff/manual-payments/context/${memberId}`);
        return res.data;
    },

    recordPayment: async (request: ManualPaymentRequest): Promise<ManualPaymentResponse> => {
        const res = await apiClient.post('/staff/manual-payments', request);
        return res.data;
    },
};