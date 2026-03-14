import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../api/settings-api';
import type { SaccoSettings } from '../api/settings-api';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSetup } from '../../setup/context/SetupContext';

interface SettingsContextType {
    settings: SaccoSettings | null;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: null,
    refreshSettings: async () => {}
});

export const SettingsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [settings, setSettings] = useState<SaccoSettings | null>(null);
    const { isAuthenticated } = useAuth();
    const { isComplete: setupComplete, isLoading: setupLoading } = useSetup();

    // Wrapped in useCallback so the function reference is stable across renders.
    // Without this, the useEffect below would need refreshSettings in its dependency
    // array but the function would re-create on every render, causing an infinite loop.
    // eslint-plugin-react-hooks / exhaustive-deps also requires stable references.
    const refreshSettings = useCallback(async () => {
        // Don't attempt to load settings until the setup wizard is fully complete.
        // During setup the sacco_settings row does not exist yet, and the
        // ContactVerificationFilter may block the request with a 403.
        if (!setupComplete) return;

        try {
            const data = await settingsApi.getSettings();
            setSettings(data);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            // 403 / 401 during setup transitions are expected — don't log noise.
            if (status !== 403 && status !== 401) {
                console.error('Failed to load global SACCO settings', err);
            }
        }
    }, [setupComplete]);

    useEffect(() => {
        if (isAuthenticated && !setupLoading && setupComplete) {
            refreshSettings();
        } else if (!isAuthenticated) {
            setSettings(null);
        }
    }, [isAuthenticated, setupComplete, setupLoading, refreshSettings]);

    return (
        <SettingsContext.Provider value={{ settings, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);