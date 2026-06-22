import { createContext } from 'react';
import type { SaccoSettings } from '../api/settings-api';

export interface SettingsContextType {
    settings: SaccoSettings | null;
    isLoading: boolean;
    refreshSettings: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextType>({
    settings: null,
    isLoading: true,
    refreshSettings: async () => {},
});