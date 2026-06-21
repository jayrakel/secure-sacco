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
    transactionRef:    string | null; // Co-op CBS TransactionId (e.g. CB1287153_05062026_2) — for idempotency
    mpesaRef:          string | null; // M-Pesa receipt code (e.g. UF5BY709I7) — shown in UI
    internalRef:       string;
    amount:            number;
    paymentMethod:     string;        // MPESA_COOP_IPN, MPESA_COOP
    paymentType:       string;        // PAYBILL_DEPOSIT, STK_PUSH
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

export interface GeneralStatementLineDTO {
    transactionDate: string;
    reference: string;
    description: string;
    accountCode: string;
    accountName: string;
    accountType: string; // ASSET, LIABILITY, REVENUE, EXPENSE, EQUITY
    debitAmount: number;
    creditAmount: number;
    runningBalance: number;
}

export interface GeneralStatementDTO {
    fromDate: string | null;
    toDate: string | null;
    totalDebits: number;
    totalCredits: number;
    lines: GeneralStatementLineDTO[];
}

// ── Payment Lookup (SAC-264) ──────────────────────────────────────────────

export interface RouteItem {
    productName: string;
    moduleType: 'SAVINGS' | 'PENALTY' | 'LOAN' | 'CUSTOM';
    amount: number;
    status: 'PENDING' | 'ROUTED' | 'FAILED';
    failureReason: string | null;
    routedAt: string | null;
}

export interface PaymentRouteLookupResponse {
    paymentId: string;
    mpesaRef: string | null;
    internalRef: string | null;
    memberNumber: string | null;
    memberName: string;
    senderPhoneNumber: string | null;
    totalAmount: number;
    paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
    failureReason: string | null;
    createdAt: string;
    isSplitDeposit: boolean;
    routes: RouteItem[];
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

    // ── General Statement (SAC-263) — true system-wide financial position ──
    getGeneralStatement: async (from?: string, to?: string, accountCode?: string): Promise<GeneralStatementDTO> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (accountCode) params.append('accountCode', accountCode);
        const qs = params.toString() ? `?${params}` : '';
        const res = await apiClient.get<GeneralStatementDTO>(`/reports/general-statement${qs}`);
        return res.data;
    },

    downloadGeneralStatement: async (from?: string, to?: string, accountCode?: string): Promise<void> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (accountCode) params.append('accountCode', accountCode);
        const qs = params.toString() ? `?${params}` : '';
        const res = await apiClient.get(`/reports/general-statement/download${qs}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `general_statement${from ? '_' + from : ''}${to ? '_' + to : ''}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // SAC-264: search by M-Pesa/internal reference, see every route it touched.
    // Returns null (not an error) when nothing matches — lets the UI show a
    // friendly "no payment found" instead of an error banner.
    lookupPayment: async (reference: string): Promise<PaymentRouteLookupResponse | null> => {
        try {
            const res = await apiClient.get<PaymentRouteLookupResponse>('/reports/payment-lookup', {
                params: { reference },
            });
            return res.data;
        } catch (e: unknown) {
            if (typeof e === 'object' && e !== null && 'response' in e) {
                const response = (e as { response?: { status?: number } }).response;
                if (response?.status === 404) return null;
            }
            throw e;
        }
    },
};