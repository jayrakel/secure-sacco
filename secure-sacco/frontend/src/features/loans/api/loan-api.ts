import apiClient from '../../../shared/api/api-client';

export interface LoanProduct {
    id: string;
    name: string;
    description: string;
    repaymentFrequency: string;
    termWeeks: number;
    interestModel: string;
    interestRate: number;
    applicationFee: number;
    gracePeriodDays: number;
    isActive: boolean;
}

export interface LoanGuarantor {
    id: string;
    guarantorMemberId: string;
    guarantorMemberNumber: string;
    guarantorName: string;
    guaranteedAmount: number;
    status: string;
}

// THIS is the export that was missing!
export interface LoanApplication {
    id: string;
    memberId: string;
    productId: string;
    productName: string;
    termWeeks: number;
    gracePeriodDays: number;
    principalAmount: number;
    applicationFee: number;
    applicationFeePaid: boolean;
    status: string;
    purpose: string;
    createdAt: string;
    guarantors: LoanGuarantor[];
}

export interface LoanSummary {
    applicationId: string;
    productName: string;
    principalAmount: number;
    totalOutstanding: number;
    totalArrears: number;
    prepaymentCredit: number;
    nextDueDate: string | null;
    nextDueAmount: number;
    status: string;
}

export const loanApi = {
    // --- MEMBER ENDPOINTS ---
    getProducts: () =>
        apiClient.get<LoanProduct[]>('/loans/products?activeOnly=true').then(res => res.data),

    getMyApplications: () =>
        apiClient.get<LoanApplication[]>('/loans/applications/my').then(res => res.data),

    createApplication: (data: { productId: string; principalAmount: number; purpose: string }) =>
        apiClient.post<LoanApplication>('/loans/applications', data).then(res => res.data),

    payFee: (id: string, data: { phoneNumber: string }) =>
        apiClient.post<{ checkoutRequestID: string }>(`/loans/applications/${id}/pay-fee`, data).then(res => res.data),

    addGuarantor: (id: string, data: { memberNumber: string; guaranteedAmount: number }) =>
        apiClient.post<LoanGuarantor>(`/loans/applications/${id}/guarantors`, data).then(res => res.data),

    getLoanSummary: (id: string) =>
        apiClient.get<LoanSummary>(`/loans/reports/${id}/summary/member`).then(res => res.data),

    repayLoan: (id: string, data: { phoneNumber: string; amount: number }) =>
        apiClient.post<{ checkoutRequestID: string }>(`/loans/applications/${id}/repay`, data).then(res => res.data),

    // --- STAFF ENDPOINTS ---
    getAllApplications: () =>
        apiClient.get<LoanApplication[]>('/loans/applications/all').then(res => res.data),

    verifyApplication: (id: string, data: { notes: string }) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/verify`, data).then(res => res.data),

    committeeApprove: (id: string, data: { notes: string }) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/approve`, data).then(res => res.data),

    rejectApplication: (id: string, data: { notes: string }) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/reject`, data).then(res => res.data),

    disburseLoan: (id: string) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/disburse`).then(res => res.data),
};