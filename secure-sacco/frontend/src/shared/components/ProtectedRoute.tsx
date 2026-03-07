import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { Loader2 } from 'lucide-react';

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
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-sans">
                <Loader2 className="animate-spin mb-4 text-emerald-600" size={40} />
                <p className="font-medium">Verifying access...</p>
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