import apiClient from '../../../shared/api/api-client';

// ─── Response shape from GET /settings/sacco ─────────────────────────────────

export interface SaccoSettings {
    initialized: boolean;

    // Identity
    saccoName?: string;
    prefix?: string;
    padLength?: number;
    registrationFee?: number;
    logoUrl?: string;
    faviconUrl?: string;

    // Communication
    smtpFromName?: string;
    supportEmail?: string;

    // Security policy
    maxLoginAttempts?: number;
    lockoutDurationMinutes?: number;
    sessionTimeoutMinutes?: number;
    passwordResetExpiryMin?: number;
    mfaTokenExpiryMinutes?: number;
    emailVerifyExpiryHours?: number;
    minPasswordLength?: number;
    contactVerifyRateLimit?: number;
    contactVerifyWindowMin?: number;
    rateLimitGeneralPerMin?: number;

    // Feature flags
    enabledModules?: Record<string, boolean>;
}

// ─── Request payloads ─────────────────────────────────────────────────────────

export interface CoreSettingsPayload {
    saccoName: string;
    prefix: string;
    padLength: number;
    registrationFee: number;
    logoUrl?: string;
    faviconUrl?: string;
}

export interface SecurityPolicyPayload {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutMinutes: number;
    passwordResetExpiryMin: number;
    mfaTokenExpiryMinutes: number;
    emailVerifyExpiryHours: number;
    minPasswordLength: number;
    contactVerifyRateLimit: number;
    contactVerifyWindowMin: number;
    rateLimitGeneralPerMin: number;
}

export interface CommunicationPayload {
    smtpFromName: string;
    supportEmail: string;
}

export interface UpdateFlagsPayload {
    flags: Record<string, boolean>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const settingsApi = {

    /** Fetch all settings (identity + security + communication + modules) */
    getSettings: async (): Promise<SaccoSettings> => {
        const res = await apiClient.get<SaccoSettings>('/settings/sacco');
        return res.data;
    },

    /** One-time initialization */
    initializeSettings: async (payload: CoreSettingsPayload) => {
        const res = await apiClient.post('/settings/sacco/initialize', payload);
        return res.data;
    },

    /** Update identity, branding and registration fee */
    updateCoreSettings: async (payload: CoreSettingsPayload) => {
        const res = await apiClient.put('/settings/sacco', payload);
        return res.data;
    },

    /** Update security policy (login protection, token expiry, password rules, rate limits) */
    updateSecurityPolicy: async (payload: SecurityPolicyPayload) => {
        const res = await apiClient.put('/settings/sacco/security', payload);
        return res.data;
    },

    /** Update communication / email sender settings */
    updateCommunication: async (payload: CommunicationPayload) => {
        const res = await apiClient.put('/settings/sacco/communication', payload);
        return res.data;
    },

    /** Enable or disable system modules */
    updateFeatureFlags: async (payload: UpdateFlagsPayload) => {
        const res = await apiClient.put('/settings/sacco/flags', payload);
        return res.data;
    },

    /** Auto-generate a 3-letter prefix suggestion from the SACCO name */
    generatePrefix: async (name: string): Promise<{ prefix: string }> => {
        const res = await apiClient.get<{ prefix: string }>(
            `/settings/sacco/generate-prefix?name=${encodeURIComponent(name)}`
        );
        return res.data;
    },
};