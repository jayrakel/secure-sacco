import React, { useEffect, useState, useCallback } from 'react';
import { settingsApi } from '../api/settings-api';
import type { SaccoSettings } from '../api/settings-api';
import { useAuth } from '../../auth/context/AuthProvider';
import { useSetup } from '../../setup/context/useSetup';
import { SettingsContext } from './SettingsContext';

const STORAGE_KEY = 'saccoSettingsCache';

/** Best-effort read of a previously cached settings snapshot, for instant-paint on revisit. */
function readCachedSettings(): SaccoSettings | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as SaccoSettings) : null;
    } catch {
        return null;
    }
}

function applyTitleAndFavicon(settings: SaccoSettings | null) {
    if (settings?.saccoName) {
        document.title = `${settings.saccoName} - Secure SACCO`;
    }
    if (settings?.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = settings.faviconUrl;
    }
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Seed from cache instead of null — kills the "default logo/name" flash on revisit.
    // A genuinely first-ever visit still shows a brief loading state (no cache exists yet),
    // handled by isLoading rather than a hardcoded fallback name/logo.
    const [settings, setSettings] = useState<SaccoSettings | null>(() => readCachedSettings());
    const [isLoading, setIsLoading] = useState(true);
    const { isAuthenticated } = useAuth();
    const { isComplete: setupComplete, isLoading: setupLoading } = useSetup();

    const refreshSettings = useCallback(async () => {
        if (!setupComplete) {
            setIsLoading(false);
            return;
        }

        try {
            const data = await settingsApi.getSettings();
            setSettings(data);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch {
                // localStorage unavailable (private mode, quota) — non-fatal, just no instant-paint next time.
            }
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
        } finally {
            setIsLoading(false);
        }
    }, [setupComplete]);

    useEffect(() => {
        if (!isAuthenticated) {
            // Not logged in — nothing more to load on this provider's behalf;
            // LoginPage fetches branding itself via the public settings endpoint.
            setIsLoading(false);
            return;
        }
        if (!setupLoading && setupComplete) {
            void refreshSettings();
        }
    }, [isAuthenticated, setupComplete, setupLoading, refreshSettings]);

    // Keep the browser tab title and favicon in sync everywhere in the app,
    // not just on the login page — previously only LoginPage's own effect set
    // document.title, so it reverted to the static index.html default ("Secure
    // SACCO System") on every other authenticated page.
    useEffect(() => {
        if (isAuthenticated) applyTitleAndFavicon(settings);
    }, [isAuthenticated, settings?.saccoName, settings?.faviconUrl]);

    return (
        <SettingsContext.Provider value={{ settings: isAuthenticated ? settings : null, isLoading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};