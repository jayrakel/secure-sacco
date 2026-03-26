import React, { useEffect, useState, useCallback } from 'react';
import { setupApi, type SetupStatus } from '../api/setup-api';
import { SetupContext } from './SetupContext';

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<SetupStatus | null>(null);
    const [isLoading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const data = await setupApi.getStatus();
            setStatus(data);
        } catch {
            // On error, assume setup is NOT complete so the user
            // is never silently bypassed into a broken state.
            setStatus({ phase: 'CHANGE_PASSWORD', complete: false, missingOfficerRoles: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return (
        <SetupContext.Provider
            value={{
                phase: status?.phase ?? null,
                isComplete: status?.complete ?? false,
                missingOfficerRoles: status?.missingOfficerRoles ?? [],
                isLoading,
                refresh,
            }}
        >
            {children}
        </SetupContext.Provider>
    );
};