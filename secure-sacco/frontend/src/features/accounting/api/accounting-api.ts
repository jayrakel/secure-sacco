import apiClient from '../../../shared/api/api-client';

// MUST HAVE "export" HERE
export interface Account {
    id: string;
    accountCode: string;
    accountName: string;
    description: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    isActive: boolean;
    isSystemAccount: boolean;
    parentAccountId: string | null;
}

export interface JournalEntryLine {
    id: string;
    accountCode: string;
    accountName: string;
    memberId: string | null;
    debitAmount: number;
    creditAmount: number;
    description: string;
}

export interface JournalEntry {
    id: string;
    transactionDate: string;
    referenceNumber: string;
    description: string;
    status: string;
    lines: JournalEntryLine[];
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

export interface TrialBalanceLine {
    accountCode: string;
    accountName: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    totalDebits: number;
    totalCredits: number;
    netBalance: number;
}

export interface TrialBalanceResponse {
    asOfDate: string;
    lines: TrialBalanceLine[];
    grandTotalDebits: number;
    grandTotalCredits: number;
    balanced: boolean;
}

// ─── Manual GL Posting ────────────────────────────────────────────────────────

export interface ManualJournalLineRequest {
    accountCode: string;
    debitAmount: number;
    creditAmount: number;
    description: string;
}

export interface CreateManualJournalRequest {
    transactionDate: string;         // YYYY-MM-DD
    referenceNumber: string;
    description: string;
    lines: ManualJournalLineRequest[];
}

export const accountingApi = {
    getAccounts: async (): Promise<Account[]> => {
        const response = await apiClient.get<Account[]>('/accounting/accounts');
        return Array.isArray(response.data) ? response.data : [];
    },

    getJournalEntries: async (page = 0, size = 20): Promise<PagedResponse<JournalEntry>> => {
        const response = await apiClient.get<PagedResponse<JournalEntry>>(
            `/accounting/journals?page=${page}&size=${size}&sort=transactionDate,desc`
        );
        return response.data;
    },

    getTrialBalance: async (asOfDate?: string): Promise<TrialBalanceResponse> => {
        const qs = asOfDate ? `?asOfDate=${asOfDate}` : '';
        const response = await apiClient.get<TrialBalanceResponse>(`/accounting/trial-balance${qs}`);
        return response.data;
    },

    postManualJournalEntry: async (request: CreateManualJournalRequest): Promise<JournalEntry> => {
        const response = await apiClient.post<JournalEntry>('/accounting/journals', request);
        return response.data;
    },
};