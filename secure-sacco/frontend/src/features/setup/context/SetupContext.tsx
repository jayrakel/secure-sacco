import { createContext } from 'react';
import type { SetupPhase } from '../api/setup-api';

export interface SetupContextType {
    phase: SetupPhase | null;
    isComplete: boolean;
    missingOfficerRoles: string[];
    isLoading: boolean;
    refresh: () => Promise<void>;
}

export const SetupContext = createContext<SetupContextType | undefined>(undefined);