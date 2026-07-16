import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';

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
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="relative flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-full border-4 border-slate-200" />
                    <div className="absolute w-14 h-14 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                    <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500 opacity-80" />
                </div>
                <p className="text-slate-400 text-sm tracking-wide animate-pulse">Verifying access…</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
        const hasAccess = requireAll
            ? requiredPermissions.every(p => user.permissions?.includes(p))
            : requiredPermissions.some(p => user.permissions?.includes(p));

        if (!hasAccess) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}