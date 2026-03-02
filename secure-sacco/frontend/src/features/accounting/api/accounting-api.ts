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

export const accountingApi = {
    getAccounts: async (): Promise<Account[]> => {
        const response = await apiClient.get<Account[]>('/accounting/accounts');
        return response.data;
    },
    getJournalEntries: async (): Promise<JournalEntry[]> => {
        const response = await apiClient.get<JournalEntry[]>('/accounting/journals');
        return response.data;
    }
};