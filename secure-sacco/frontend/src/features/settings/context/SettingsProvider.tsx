import React, { useEffect, useState, useCallback } from 'react';
import { settingsApi } from '../api/settings-api';
import type { SaccoSettings } from '../api/settings-api';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSetup } from '../../setup/context/useSetup';
import { SettingsContext } from './SettingsContext';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SaccoSettings | null>(null);
    const { isAuthenticated } = useAuth();
    const { isComplete: setupComplete, isLoading: setupLoading } = useSetup();

    const refreshSettings = useCallback(async () => {
        if (!setupComplete) return;

        try {
            const data = await settingsApi.getSettings();
            setSettings(data);
        } catch (error: unknown) {
            const status =
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof (error as { response?: unknown }).response === 'object' &&
                (error as { response?: { status?: number } }).response !== null
                    ? (error as { response?: { status?: number } }).response?.status
                    : undefined;

            if (status !== 403 && status !== 401) {
                console.error('Failed to load global SACCO settings', error);
            }
        }
    }, [setupComplete]);

    useEffect(() => {
        if (isAuthenticated && !setupLoading && setupComplete) {
            void refreshSettings();
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