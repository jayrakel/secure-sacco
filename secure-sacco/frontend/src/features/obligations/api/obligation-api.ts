import apiClient from '../../../shared/api/api-client';

export type ObligationFrequency = 'WEEKLY' | 'MONTHLY';
export type ObligationStatus    = 'ACTIVE' | 'PAUSED';

/**
 * UPCOMING  — savings deadline hasn't arrived yet this period (computed by API, not stored)
 * DUE       — within the deadline window; member should save now
 * COVERED   — member has met the required amount for this period
 * OVERDUE   — deadline passed without full payment; penalty was created
 */
export type PeriodStatus = 'UPCOMING' | 'DUE' | 'COVERED' | 'OVERDUE';

export interface ObligationPeriodResponse {
    id: string;
    obligationId: string;
    periodStart: string;
    periodEnd: string;
    requiredAmount: number;
    paidAmount: number;
    remaining: number;
    /** Raw DB status — use computedStatus for display */
    status: PeriodStatus;
    /** Display status — may be UPCOMING even when DB stores DUE */
    computedStatus: PeriodStatus;
    createdAt: string;

    // ── Penalty linked to this period (present only if OVERDUE with penalty) ─
    penaltyId?: string;
    penaltyAmount?: number;
    penaltyOutstanding?: number;
    /** 'OPEN' | 'PAID' | 'WAIVED' */
    penaltyStatus?: string;
}

export interface ObligationResponse {
    id: string;
    memberId: string;
    frequency: ObligationFrequency;
    amountDue: number;
    startDate: string;
    graceDays: number;
    status: ObligationStatus;
    createdAt: string;
    currentPeriod?: ObligationPeriodResponse;
}

export interface ObligationComplianceEntry {
    memberId: string;
    memberNumber: string;
    memberName: string;
    frequency: ObligationFrequency;
    amountDue: number;
    totalOverduePeriods: number;
    totalShortfall: number;
    totalPenalties: number;
    worstStatus: PeriodStatus;
}

export interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
}

export interface CreateObligationRequest {
    memberId: string;
    frequency: ObligationFrequency;
    amountDue: number;
    startDate: string;
    graceDays?: number;
}

export interface UpdateObligationRequest {
    amountDue?: number;
    startDate?: string;
    graceDays?: number;
}

export const obligationsApi = {
    // ── Member ───────────────────────────────────────────────
    getMyObligations: async (): Promise<ObligationResponse[]> => {
        const res = await apiClient.get('/obligations/my');
        return res.data;
    },

    getMyHistory: async (page = 0, size = 20): Promise<PagedResponse<ObligationPeriodResponse>> => {
        const res = await apiClient.get('/obligations/my/history', { params: { page, size } });
        return res.data;
    },

    // ── Staff ────────────────────────────────────────────────
    getComplianceReport: async (page = 0, size = 20): Promise<PagedResponse<ObligationComplianceEntry>> => {
        const res = await apiClient.get('/obligations/compliance', { params: { page, size } });
        return res.data;
    },

    createObligation: async (data: CreateObligationRequest): Promise<ObligationResponse> => {
        const res = await apiClient.post('/obligations', data);
        return res.data;
    },

    updateObligation: async (id: string, data: UpdateObligationRequest): Promise<ObligationResponse> => {
        const res = await apiClient.put(`/obligations/${id}`, data);
        return res.data;
    },

    updateStatus: async (id: string, status: ObligationStatus): Promise<ObligationResponse> => {
        const res = await apiClient.patch(`/obligations/${id}/status`, { status });
        return res.data;
    },

    getObligationsByMemberId: async (memberId: string): Promise<ObligationResponse[]> => {
        const res = await apiClient.get(`/obligations/member/${memberId}`);
        return res.data;
    },

    getHistoryByMemberId: async (memberId: string, page = 0, size = 20): Promise<PagedResponse<ObligationPeriodResponse>> => {
        const res = await apiClient.get(`/obligations/member/${memberId}/history`, { params: { page, size } });
        return res.data;
    },

    triggerEvaluation: async (): Promise<{ message: string }> => {
        const res = await apiClient.post('/obligations/evaluate');
        return res.data;
    },
};