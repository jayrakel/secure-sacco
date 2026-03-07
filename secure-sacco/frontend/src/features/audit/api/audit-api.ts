import apiClient from '../../../shared/api/api-client';

export interface AuditLogDTO {
    id: string;
    actor: string;
    action: string;
    target: string | null;
    ipAddress: string | null;
    details: string | null;
    createdAt: string; // ISO instant
}

export interface AuditLogPage {
    content: AuditLogDTO[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
}

export interface AuditLogFilters {
    page?: number;
    size?: number;
    actorEmail?: string;
    eventType?: string;
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
}

export const AUDIT_EVENT_TYPES = [
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'MEETING_COMPLETED',
    'MEETING_CANCELED',
    'LOAN_DISBURSED',
    'PENALTY_WAIVED',
    'SESSION_KILLED',
    'PASSWORD_RESET',
] as const;

export const auditApi = {
    getLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogPage> => {
        const params = new URLSearchParams();
        if (filters.page !== undefined) params.set('page', String(filters.page));
        if (filters.size !== undefined) params.set('size', String(filters.size));
        if (filters.actorEmail)         params.set('actorEmail', filters.actorEmail);
        if (filters.eventType)          params.set('eventType', filters.eventType);
        if (filters.from)               params.set('from', filters.from);
        if (filters.to)                 params.set('to', filters.to);

        const qs = params.toString() ? `?${params}` : '';
        const res = await apiClient.get<AuditLogPage>(`/audit/logs${qs}`);
        return res.data;
    },
};