import apiClient from '../../../shared/api/api-client';

export interface LoanArrearsDTO {
    memberNumber: string;
    memberName: string;
    loanId: string;
    productName: string;
    amountOverdue: number;
    daysOverdue: number;
    bucket: string;
}

export interface StatementItemDTO {
    date: string;
    module: string;
    type: string;
    amount: number;
    reference: string;
    description: string;
}

export interface MemberMiniSummaryDTO {
    savingsBalance: number;
    loanArrears: number;
    penaltyOutstanding: number;
    activeLoanStatus: string;
    nextDueDate: string | null;
}

export const ARREARS_BUCKETS = ['1-7 Days', '8-30 Days', '31-60 Days', '61-90 Days', '90+ Days'] as const;
export type ArrearsBucket = typeof ARREARS_BUCKETS[number];

export const reportApi = {
    // Fetch all loan arrears records (bucket filtering is done client-side
    // so summary cards always reflect live totals across all buckets).
    getLoanArrears: async (): Promise<LoanArrearsDTO[]> => {
        const res = await apiClient.get<LoanArrearsDTO[]>('/reports/loans/arrears');
        return res.data;
    },

    getMemberStatement: async (memberId: string, from?: string, to?: string): Promise<StatementItemDTO[]> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const res = await apiClient.get<StatementItemDTO[]>(`/reports/members/${memberId}/statement?${params}`);
        return res.data;
    },

    getMySummary: async (): Promise<MemberMiniSummaryDTO> => {
        const res = await apiClient.get<MemberMiniSummaryDTO>('/reports/me/summary');
        return res.data;
    },
};