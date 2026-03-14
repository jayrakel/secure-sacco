import { createContext } from 'react';
import type { SaccoSettings } from '../api/settings-api';

export interface SettingsContextType {
    settings: SaccoSettings | null;
    refreshSettings: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextType>({
    settings: null,
    refreshSettings: async () => {},
});