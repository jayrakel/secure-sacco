// SAC-269: TEMPORARY — see backend package comment. Delete this whole
// frontend feature folder alongside the backend module before go-live.
import apiClient from '../../../shared/api/api-client';

export interface HistoricalTransactionItem {
    transactionId: string;
    type: string;
    channel: string;
    amount: number;
    reference: string;
    status: string;
    postedAt: string;
    linkedToJournalEntry: boolean;
}

export interface EditTransactionRequest {
    transactionId: string;
    newAmount?: number | null;
    newPostedAt?: string | null;
    newReference?: string | null;
    reason: string;
}

export interface EditTransactionResponse {
    transactionId: string;
    previousAmount: number;
    newAmount: number;
    previousReference: string;
    newReference: string;
    glAdjusted: boolean;
    message: string;
}

export const historicalEditApi = {
    search: async (memberId: string, from?: string, to?: string): Promise<HistoricalTransactionItem[]> => {
        const params = new URLSearchParams({ memberId });
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const res = await apiClient.get(`/admin/historical-edit/savings?${params.toString()}`);
        return res.data;
    },

    edit: async (request: EditTransactionRequest): Promise<EditTransactionResponse> => {
        const res = await apiClient.post('/admin/historical-edit/savings/edit', request);
        return res.data;
    },
};