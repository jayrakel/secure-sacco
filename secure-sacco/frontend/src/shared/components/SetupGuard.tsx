import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { useSetup } from '../../features/setup/context/useSetup';
import { ShieldCheck, Loader2 } from 'lucide-react';

/**
 * SetupGuard wraps the entire authenticated app shell.
 *
 * Rules:
 * - If setup is not complete AND the user is SYSTEM_ADMIN  → redirect to /setup
 * - If setup is not complete AND the user is NOT an admin   → show "system not ready" screen
 * - If setup is complete                                    → render children normally
 * - While loading                                           → render spinner
 */
const SetupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const { isComplete, isLoading: setupLoading } = useSetup();
    const location = useLocation();

    // Don't block while either auth or setup is loading
    if (setupLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    // Setup is done — let everything through normally
    if (isComplete) return <>{children}</>;

    // Not authenticated yet — let ProtectedRoute handle the redirect to /login
    if (!isAuthenticated) return <>{children}</>;

    const isAdmin = user?.roles?.includes('ROLE_SYSTEM_ADMIN');

    // Admin who hasn't finished setup → wizard
    if (isAdmin && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    // Non-admin visiting while system isn't ready yet
    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
                    <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-3">System Initializing</h1>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        The system administrator is completing the initial setup.
                        Please check back shortly — your account will be ready once the setup is complete.
                    </p>
                </div>
            </div>
        );
    }

    // Admin is on /setup — let them through
    return <>{children}</>;
};

export default SetupGuard;