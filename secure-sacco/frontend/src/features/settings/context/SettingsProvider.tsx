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
        }
    }, [isAuthenticated, setupComplete, setupLoading, refreshSettings]);

    // ─── DYNAMIC FAVICON UPDATE ──────────────────────────────────────────────
    useEffect(() => {
        if (settings?.faviconUrl) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = settings.faviconUrl;
        }
    }, [settings?.faviconUrl]);
    // ──────────────────────────────────────────────────────────────────────────

    return (
        <SettingsContext.Provider value={{ settings: isAuthenticated ? settings : null, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};