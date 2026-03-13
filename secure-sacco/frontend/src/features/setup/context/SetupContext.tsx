import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setupApi, type SetupPhase, type SetupStatus } from '../api/setup-api';

interface SetupContextType {
    phase: SetupPhase | null;
    isComplete: boolean;
    missingOfficerRoles: string[];
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const useSetup = (): SetupContextType => {
    const ctx = useContext(SetupContext);
    if (!ctx) throw new Error('useSetup must be used within a SetupProvider');
    return ctx;
};

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus]   = useState<SetupStatus | null>(null);
    const [isLoading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const data = await setupApi.getStatus();
            setStatus(data);
        } catch {
            // If the status endpoint fails, assume setup is complete so we
            // don't block a running system on a transient network error.
            setStatus({ phase: 'COMPLETE', complete: true, missingOfficerRoles: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return (
        <SetupContext.Provider value={{
            phase:               status?.phase ?? null,
            isComplete:          status?.complete ?? false,
            missingOfficerRoles: status?.missingOfficerRoles ?? [],
            isLoading,
            refresh,
        }}>
            {children}
        </SetupContext.Provider>
    );
};