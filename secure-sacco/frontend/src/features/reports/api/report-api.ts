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

export interface StatementSummaryDTO {
    loanDisbursed: number;
    loanRepaid: number;
    loanOutstanding: number;
    savingsDeposited: number;
    savingsWithdrawn: number;
    penaltiesCharged: number;
    penaltiesPaid: number;
    penaltiesOutstanding: number;
}

export interface StatementResponseDTO {
    items: StatementItemDTO[];
    summary: StatementSummaryDTO;
}

export interface MemberMiniSummaryDTO {
    savingsBalance: number;
    loanArrears: number;
    penaltyOutstanding: number;
    activeLoanStatus: string;
    nextDueDate: string | null;
}

export interface DailyCollectionDTO {
    date: string;
    totalCollected: number;
    byChannel: Record<string, number>; // e.g. { MPESA: 45000, BANK_TRANSFER: 12000 }
    byType:    Record<string, number>; // e.g. { STK_PUSH: 30000, C2B: 27000 }
}

export interface PaymentLineDTO {
    id: string;
    transactionRef:    string | null; // M-Pesa receipt, e.g. NLJ7RT615V
    internalRef:       string;
    amount:            number;
    paymentMethod:     string;        // MPESA, BANK_TRANSFER
    paymentType:       string;        // C2B, STK_PUSH
    accountReference:  string | null; // Member number typed by payer
    senderName:        string | null;
    senderPhoneNumber: string | null;
    status:            string;
    createdAt:         string;
}

export const ARREARS_BUCKETS = ['1-7 Days', '8-30 Days', '31-60 Days', '61-90 Days', '90+ Days'] as const;
export type ArrearsBucket = typeof ARREARS_BUCKETS[number];

// Matches backend ReportDTOs.IncomeCategoryDTO exactly
export interface IncomeCategoryDTO {
    category: string;   // account_name from the journal (e.g. "Interest Income")
    amount:   number;   // net CREDIT − DEBIT for that account
}

// Matches backend ReportDTOs.IncomeReportDTO exactly
export interface IncomeReportDTO {
    fromDate:    string;              // "YYYY-MM-DD"
    toDate:      string;              // "YYYY-MM-DD"
    totalIncome: number;
    categories:  IncomeCategoryDTO[];
}

export const reportApi = {
    getLoanArrears: async (): Promise<LoanArrearsDTO[]> => {
        const res = await apiClient.get<LoanArrearsDTO[]>('/reports/loans/arrears');
        return res.data;
    },

    getDailyCollections: async (date?: string): Promise<DailyCollectionDTO> => {
        const params = date ? `?date=${date}` : '';
        const res = await apiClient.get<DailyCollectionDTO>(`/reports/collections/daily${params}`);
        return res.data;
    },

    getDailyCollectionLines: async (date?: string): Promise<PaymentLineDTO[]> => {
        const params = date ? `?date=${date}` : '';
        const res = await apiClient.get<PaymentLineDTO[]>(`/reports/collections/daily/lines${params}`);
        return res.data;
    },

    getMemberStatement: async (memberId: string, from?: string, to?: string): Promise<StatementResponseDTO> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to)   params.append('to',   to);
        const qs = params.toString() ? `?${params}` : '';
        const res = await apiClient.get<StatementResponseDTO>(`/reports/members/${memberId}/statement${qs}`);
        return res.data;
    },

    getMySummary: async (): Promise<MemberMiniSummaryDTO> => {
        const res = await apiClient.get<MemberMiniSummaryDTO>('/reports/me/summary');
        return res.data;
    },

    getIncomeReport: async (from: string, to: string): Promise<IncomeReportDTO> => {
        const res = await apiClient.get<IncomeReportDTO>(`/reports/income?from=${from}&to=${to}`);
        return res.data;
    },
};