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
    minAmount?: number;
    maxAmount?: number;
}

export interface LoanProductRequest {
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

export interface LoanApplication {
    id: string;
    memberId: string;
    memberNumber?: string;
    memberName?: string;
    productId: string;
    productName: string;
    termWeeks: number;
    gracePeriodDays: number;
    principalAmount: number;
    applicationFee: number;
    applicationFeePaid: boolean;
    interestRate?: number;
    status: string;
    purpose: string;
    createdAt: string;
    updatedAt?: string;
    appliedAt?: string;
    comments?: string;
    collateralType?: string;
    collateralValue?: number;
    feePaidAmount?: number;
    guarantors: LoanGuarantor[];
    tenorMonths?: number;
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
    // ── Member endpoints ──────────────────────────────────────────
    getProducts: () =>
        apiClient.get<LoanProduct[]>('/loans/products?activeOnly=true').then(r => r.data),

    getMyApplications: () =>
        apiClient.get<LoanApplication[]>('/loans/applications/my').then(r => r.data),

    createApplication: (data: { productId: string; principalAmount: number; purpose: string }) =>
        apiClient.post<LoanApplication>('/loans/applications', data).then(r => r.data),

    payFee: (id: string, data: { phoneNumber: string }) =>
        apiClient.post<{ checkoutRequestID: string }>(`/loans/applications/${id}/pay-fee`, data).then(r => r.data),

    addGuarantor: (id: string, data: { memberNumber: string; guaranteedAmount: number }) =>
        apiClient.post<LoanGuarantor>(`/loans/applications/${id}/guarantors`, data).then(r => r.data),

    getLoanSummary: (id: string) =>
        apiClient.get<LoanSummary>(`/loans/reports/${id}/summary/member`).then(r => r.data),

    repayLoan: (id: string, data: { phoneNumber: string; amount: number }) =>
        apiClient.post<{ checkoutRequestID: string }>(`/loans/applications/${id}/repay`, data).then(r => r.data),

    // ── Staff: loan applications ───────────────────────────────────
    getAllApplications: () =>
        apiClient.get('/loans/applications/all').then(r => r.data?.content ?? r.data),

    verifyApplication: (id: string, data: { notes: string }) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/verify`, data).then(r => r.data),

    committeeApprove: (id: string, data: { notes: string }) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/approve`, data).then(r => r.data),

    rejectApplication: (id: string, data: { notes: string }) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/reject`, data).then(r => r.data),

    disburseLoan: (id: string) =>
        apiClient.post<LoanApplication>(`/loans/applications/${id}/disburse`).then(r => r.data),

    // ── Staff: loan products ───────────────────────────────────────
    getAllProducts: () =>
        apiClient.get<LoanProduct[]>('/loans/products?activeOnly=false').then(r => r.data),

    createProduct: (data: LoanProductRequest) =>
        apiClient.post<LoanProduct>('/loans/products', data).then(r => r.data),

    updateProduct: (id: string, data: LoanProductRequest) =>
        apiClient.put<LoanProduct>(`/loans/products/${id}`, data).then(r => r.data),

    toggleProduct: (product: LoanProduct) =>
        apiClient.put<LoanProduct>(`/loans/products/${product.id}`, {
            name: product.name,
            description: product.description,
            repaymentFrequency: product.repaymentFrequency,
            termWeeks: product.termWeeks,
            interestModel: product.interestModel,
            interestRate: product.interestRate,
            applicationFee: product.applicationFee,
            gracePeriodDays: product.gracePeriodDays,
            isActive: !product.isActive,
        }).then(r => r.data),
};