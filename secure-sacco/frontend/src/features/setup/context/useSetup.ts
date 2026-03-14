import { useContext } from 'react';
import { SetupContext, type SetupContextType } from './SetupContext';

export const useSetup = (): SetupContextType => {
    const ctx = useContext(SetupContext);
    if (!ctx) {
        throw new Error('useSetup must be used within a SetupProvider');
    }
    return ctx;
};