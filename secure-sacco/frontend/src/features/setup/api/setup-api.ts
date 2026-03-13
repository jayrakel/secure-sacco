import apiClient from '../../../shared/api/api-client';

export type SetupPhase =
    | 'CHANGE_PASSWORD'
    | 'VERIFY_CONTACT'
    | 'CREATE_OFFICERS'
    | 'CONFIGURE_PLATFORM'
    | 'COMPLETE';

export interface SetupStatus {
    phase: SetupPhase;
    complete: boolean;
    missingOfficerRoles: string[];
}

export const setupApi = {
    /** Public — no auth required. Used by SetupContext on every page load. */
    getStatus: async (): Promise<SetupStatus> => {
        const res = await apiClient.get<SetupStatus>('/setup/status');
        return res.data;
    },

    // ── Contact verification ─────────────────────────────────────────────────

    sendEmailVerification: async (): Promise<void> => {
        await apiClient.post('/auth/verify/email/send');
    },
    confirmEmail: async (token: string): Promise<void> => {
        await apiClient.post('/auth/verify/email/confirm', { token });
    },

    sendPhoneOtp: async (): Promise<void> => {
        await apiClient.post('/auth/verify/phone/send');
    },
    confirmPhone: async (token: string): Promise<void> => {
        await apiClient.post('/auth/verify/phone/confirm', { token });
    },
};