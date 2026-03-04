import apiClient from '../../../shared/api/api-client';

export interface LoanProduct {
    id: string;
    name: string;
    minAmount: number;
    maxAmount: number;
    termWeeks: number;
    interestRate: number;
    interestModel: string;
    repaymentFrequency: string;
    gracePeriodDays: number;
    applicationFee: number;
    isActive: boolean;
}

export interface LoanGuarantor {
    id: string;
    guarantorMemberId: string;
    guarantorMemberNumber: string;
    guarantorName: string;
    amountPledged: number;
    status: string;
}

export interface LoanApplication {
    id: string;
    memberId: string;
    loanProduct: LoanProduct;
    principalAmount: number;
    applicationFee: number;
    isApplicationFeePaid: boolean;
    status: string;
    createdAt: string;
    guarantors: LoanGuarantor[];
}

export const loanApi = {
    getProducts: () =>
        apiClient.get<LoanProduct[]>('/api/v1/loans/products?activeOnly=true').then(res => res.data),

    getMyApplications: () =>
        apiClient.get<LoanApplication[]>('/api/v1/loans/applications/my').then(res => res.data),

    createApplication: (data: { loanProductId: string; principalAmount: number }) =>
        apiClient.post<LoanApplication>('/api/v1/loans/applications', data).then(res => res.data),

    payFee: (id: string, data: { phoneNumber: string }) =>
        apiClient.post<{ checkoutRequestID: string }>(`/api/v1/loans/applications/${id}/pay-fee`, data).then(res => res.data),

    addGuarantor: (id: string, data: { guarantorMemberNumber: string; amountPledged: number }) =>
        apiClient.post<LoanGuarantor>(`/api/v1/loans/applications/${id}/guarantors`, data).then(res => res.data),
};