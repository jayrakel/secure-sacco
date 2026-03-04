import apiClient from '../../../shared/api/api-client';

export interface PenaltySummary {
    id: string;
    ruleCode: string;
    ruleName: string;
    originalAmount: number;
    outstandingAmount: number;
    principalPaid: number;
    interestPaid: number;
    amountWaived: number;
    status: string;
    createdAt: string;
}

export const penaltyApi = {
    getMyOpenPenalties: () =>
        apiClient.get<PenaltySummary[]>('/penalties/my').then(res => res.data),

    repayPenalty: (data: { phoneNumber: string; amount: number; penaltyId?: string | null }) =>
        apiClient.post<{ checkoutRequestID: string }>('/penalties/repay', data).then(res => res.data),
};