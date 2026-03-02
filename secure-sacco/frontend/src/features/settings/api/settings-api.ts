import apiClient from '../../../shared/api/api-client';

export interface SaccoSettings {
    initialized: boolean;
    saccoName?: string;
    prefix?: string;
    padLength?: number;
    registrationFee?: number; // <--- NEW FIELD ADDED
    enabledModules?: Record<string, boolean>;
}

export interface CoreSettingsPayload {
    saccoName: string;
    prefix: string;
    padLength: number;
    registrationFee: number; // <--- NEW FIELD ADDED
}

export interface UpdateFlagsPayload {
    flags: Record<string, boolean>;
}

export const settingsApi = {
    getSettings: async () => {
        const response = await apiClient.get<SaccoSettings>('/settings/sacco');
        return response.data;
    },

    initializeSettings: async (payload: CoreSettingsPayload) => {
        const response = await apiClient.post('/settings/sacco/initialize', payload);
        return response.data;
    },

    updateCoreSettings: async (payload: CoreSettingsPayload) => {
        const response = await apiClient.put('/settings/sacco', payload);
        return response.data;
    },

    updateFeatureFlags: async (payload: UpdateFlagsPayload) => {
        const response = await apiClient.put('/settings/sacco/flags', payload);
        return response.data;
    },

    generatePrefix: async (name: string) => {
        const response = await apiClient.get<{ prefix: string }>(`/settings/sacco/generate-prefix?name=${encodeURIComponent(name)}`);
        return response.data;
    }
};