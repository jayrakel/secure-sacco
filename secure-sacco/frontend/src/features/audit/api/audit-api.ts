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
    'ACCOUNT_CREATED',
    'ACCOUNT_UPDATED',
    'ADMIN_EMAIL_CHANGED',
    'ASSET_REGISTERED',
    'ASSET_STATUS_CHANGED',
    'ASSET_UPDATED',
    'ATTENDANCE_RECORDED',
    'COMMUNICATION_SETTINGS_UPDATED',
    'DIVIDEND_DECLARED',
    'EXPENSE_CLAIM_APPROVED',
    'EXPENSE_CLAIM_REJECTED',
    'EXPENSE_CLAIM_SELF_SUBMITTED',
    'EXPENSE_CLAIM_SUBMITTED',
    'FEATURE_FLAGS_UPDATED',
    'FINANCIAL_YEAR_CLOSED',
    'FINANCIAL_YEAR_CREATED',
    'FINANCIAL_YEAR_SET_CURRENT',
    'HISTORICAL_TRANSACTION_EDITED',
    'IPN_DEBIT_RECEIVED',
    'IPN_PAYMENT_RECEIVED',
    'JOURNAL_ENTRY_POSTED',
    'LOAN_APPLICATION_SUBMITTED',
    'LOAN_CLOSED',
    'LOAN_COMMITTEE_APPROVED',
    'LOAN_DISBURSED',
    'LOAN_PRODUCT_CREATED',
    'LOAN_PRODUCT_UPDATED',
    'LOAN_REFINANCED',
    'LOAN_REJECTED',
    'LOAN_REPAYMENT_POSTED',
    'LOAN_VERIFIED',
    'LOGIN_BLOCKED',
    'LOGIN_FAILED',
    'LOGIN_SUCCESS',
    'LOGOUT',
    'MANUAL_PAYMENT_RECORDED',
    'MEETING_AUTO_COMPLETED',
    'MEETING_CANCELED',
    'MEETING_COMPLETED',
    'MEETING_CREATED',
    'MEETING_UPDATED',
    'MEMBER_ACTIVATED',
    'MEMBER_CREATED',
    'MEMBER_DELETED',
    'MEMBER_STATUS_CHANGED',
    'MEMBER_UPDATED',
    'MFA_CHALLENGE_ISSUED',
    'MFA_DISABLED',
    'MFA_ENABLED',
    'MFA_FAILED',
    'OBLIGATION_CREATED',
    'OBLIGATION_STATUS_UPDATED',
    'OBLIGATION_UPDATED',
    'PASSWORD_CHANGED',
    'PASSWORD_CHANGE_FAILED',
    'PASSWORD_RESET_COMPLETED',
    'PASSWORD_RESET_REQUESTED',
    'PAYMENT_PRODUCT_CREATED',
    'PAYMENT_PRODUCT_DELETED',
    'PAYMENT_PRODUCT_UPDATED',
    'PAYMENT_RECEIVED',
    'PENALTY_CREATED',
    'PENALTY_PAYMENT_POSTED',
    'PENALTY_RULE_CREATED',
    'PENALTY_RULE_DELETED',
    'PENALTY_RULE_UPDATED',
    'PERMISSIONS_UPDATED',
    'PROFILE_PHOTO_UPLOADED',
    'PROFILE_UPDATED',
    'PUBLIC_ANNOUNCEMENT_CREATED',
    'PUBLIC_ANNOUNCEMENT_DELETED',
    'PUBLIC_ANNOUNCEMENT_TOGGLED',
    'PUBLIC_ANNOUNCEMENT_UPDATED',
    'PUBLIC_DOCUMENT_CREATED',
    'PUBLIC_DOCUMENT_DELETED',
    'PUBLIC_DOCUMENT_TOGGLED',
    'PUBLIC_DOCUMENT_UPDATED',
    'PUBLIC_PROFILE_UPDATED',
    'PUBLIC_SPOTLIGHT_CREATED',
    'PUBLIC_SPOTLIGHT_DELETED',
    'PUBLIC_SPOTLIGHT_TOGGLED',
    'PUBLIC_SPOTLIGHT_UPDATED',
    'ROLE_CREATED',
    'ROLE_DELETED',
    'ROLE_UPDATED',
    'SACCO_EXPENSE_RECORDED',
    'SAVINGS_DEPOSIT_POSTED',
    'SAVINGS_MPESA_PAYBILL_DEPOSIT',
    'SAVINGS_WITHDRAWAL_POSTED',
    'SECURITY_POLICY_UPDATED',
    'SESSION_REVOKED_ALL',
    'SESSION_REVOKED_SINGLE',
    'SETTINGS_INITIALIZED',
    'SETTINGS_UPDATED',
    'SHARE_DEPOSITED',
    'SHARE_DIVIDEND_RECORDED',
    'SHARE_WITHDRAWN',
    'SPLIT_DEPOSIT_INITIATED',
    'STK_PUSH_INITIATED',
    'USER_CREATED',
    'USER_DELETED',
    'USER_ROLES_UPDATED',
    'USER_STATUS_UPDATED',
    'USER_UPDATED',
    'WAIVE_PENALTY',
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