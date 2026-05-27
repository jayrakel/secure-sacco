import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { Loader2 } from 'lucide-react';
import { PRIMITIVE_TOKENS } from '@/shared/design';

export default function GuestRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    // 1. Wait for session check to finish
    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--page-bg)',
                color: 'var(--text-secondary)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
                <Loader2 style={{
                    marginBottom: PRIMITIVE_TOKENS.spacing[4],
                    color: 'var(--brand-primary)',
                    animation: 'spin 1s linear infinite',
                }} size={40} />
                <p style={{
                    fontWeight: 'medium',
                    color: 'var(--text-primary)',
                }}>Checking session...</p>
            </div>
        );
    }

    // 2. If user already exists, bounce them to the dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    // 3. Render the login page
    return <>{children}</>;
}