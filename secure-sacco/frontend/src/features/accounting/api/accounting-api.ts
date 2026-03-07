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

export const accountingApi = {
    getAccounts: async (): Promise<Account[]> => {
        const response = await apiClient.get<Account[]>('/accounting/accounts');
        return response.data;
    },

    getJournalEntries: async (): Promise<JournalEntry[]> => {
        const response = await apiClient.get<JournalEntry[]>('/accounting/journals');
        return response.data;
    },

    getTrialBalance: async (asOfDate?: string): Promise<TrialBalanceResponse> => {
        const qs = asOfDate ? `?asOfDate=${asOfDate}` : '';
        const response = await apiClient.get<TrialBalanceResponse>(`/accounting/trial-balance${qs}`);
        return response.data;
    },
};