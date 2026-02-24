import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermissions?: string[]; // Optional array of permissions required to hit this route
    requireAll?: boolean;
}

export default function ProtectedRoute({
                                           children,
                                           requiredPermissions,
                                           requireAll = false
                                       }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    // 1. Wait for session check to finish
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-sans">
                <Loader2 className="animate-spin mb-4 text-emerald-600" size={40} />
                <p className="font-medium">Verifying access...</p>
            </div>
        );
    }

    // 2. If completely unauthenticated, boot to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. Route-level RBAC enforcement
    if (requiredPermissions && requiredPermissions.length > 0) {

        // System Admins bypass route guards
        if (user.permissions?.includes('ROLE_SYSTEM_ADMIN')) {
            return <>{children}</>;
        }

        const hasAccess = requireAll
            ? requiredPermissions.every(p => user.permissions?.includes(p))
            : requiredPermissions.some(p => user.permissions?.includes(p));

        if (!hasAccess) {
            // Redirect unauthorized users to their dashboard
            return <Navigate to="/dashboard" replace />;
        }
    }

    // 4. Authorized!
    return <>{children}</>;
}