import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsApi } from '../api/settings-api';
import type { SaccoSettings } from '../api/settings-api';
import { useAuth } from '../../auth/context/AuthProvider';

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

    const refreshSettings = async () => {
        try {
            const data = await settingsApi.getSettings();
            setSettings(data);
        } catch (error) {
            console.error("Failed to load global SACCO settings", error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            refreshSettings();
        } else {
            setSettings(null);
        }
    }, [isAuthenticated]);

    return (
        <SettingsContext.Provider value={{ settings, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);