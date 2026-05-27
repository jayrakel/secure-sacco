import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { useSetup } from '../../features/setup/context/useSetup';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { PRIMITIVE_TOKENS } from '@/shared/design';

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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--page-bg)',
            }}>
                <Loader2 style={{
                    width: PRIMITIVE_TOKENS.spacing[8],
                    height: PRIMITIVE_TOKENS.spacing[8],
                    color: 'var(--brand-primary)',
                    animation: 'spin 1s linear infinite',
                }} />
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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--page-bg)',
            }}>
                <div style={{
                    maxWidth: '28rem',
                    width: '100%',
                    textAlign: 'center',
                    background: 'var(--surface-primary)',
                    borderRadius: PRIMITIVE_TOKENS.radius['3xl'],
                    boxShadow: PRIMITIVE_TOKENS.shadow.xl,
                    border: `1px solid var(--border-light)`,
                    padding: PRIMITIVE_TOKENS.spacing[10],
                }}>
                    <div style={{
                        margin: '0 auto',
                        width: PRIMITIVE_TOKENS.spacing[16],
                        height: PRIMITIVE_TOKENS.spacing[16],
                        background: 'color-mix(in srgb, var(--brand-warning) 15%, white)',
                        borderRadius: PRIMITIVE_TOKENS.radius['2xl'],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: PRIMITIVE_TOKENS.spacing[6],
                    }}>
                        <ShieldCheck style={{
                            width: PRIMITIVE_TOKENS.spacing[8],
                            height: PRIMITIVE_TOKENS.spacing[8],
                            color: 'var(--brand-warning)',
                        }} />
                    </div>
                    <h1 style={{
                        fontSize: PRIMITIVE_TOKENS.fontSize.xl[0],
                        fontWeight: 'bold',
                        color: 'var(--text-primary)',
                        marginBottom: PRIMITIVE_TOKENS.spacing[3],
                    }}>System Initializing</h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: PRIMITIVE_TOKENS.fontSize.sm[0],
                        lineHeight: 1.5,
                    }}>
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