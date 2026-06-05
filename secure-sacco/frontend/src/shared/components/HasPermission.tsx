import React from 'react';
import { useAuth } from '../../features/auth/context/AuthProvider';

interface HasPermissionProps {
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function HasPermission({
                                          permission,
                                          permissions,
                                          requireAll = false,
                                          children,
                                          fallback = null
                                      }: HasPermissionProps) {
    const { user } = useAuth();

    if (!user) return <>{fallback}</>;

    if (!user.permissions) return <>{fallback}</>;

    const permsToCheck = permissions || (permission ? [permission] : []);
    if (permsToCheck.length === 0) return <>{children}</>;

    const hasAccess = requireAll
        ? permsToCheck.every(p => user.permissions.includes(p))
        : permsToCheck.some(p => user.permissions.includes(p));

    return hasAccess ? <>{children}</> : <>{fallback}</>;
}