import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { Loader2 } from 'lucide-react';
import { PRIMITIVE_TOKENS } from '@/shared/design';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermissions?: string[];
    requireAll?: boolean;
}

export default function ProtectedRoute({
                                           children,
                                           requiredPermissions,
                                           requireAll = false
                                       }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

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
                }}>Verifying access...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
        // FIX: Check roles[] for ROLE_SYSTEM_ADMIN, NOT permissions[]
        if (user.roles?.includes('ROLE_SYSTEM_ADMIN')) {
            return <>{children}</>;
        }

        const hasAccess = requireAll
            ? requiredPermissions.every(p => user.permissions?.includes(p))
            : requiredPermissions.some(p => user.permissions?.includes(p));

        if (!hasAccess) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}