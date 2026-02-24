import React from 'react';
import { useAuth } from '../../features/auth/context/AuthProvider';

interface HasPermissionProps {
    permission?: string;        // Check a single permission (e.g., 'USER_CREATE')
    permissions?: string[];     // Check multiple permissions
    requireAll?: boolean;       // If true, user needs ALL permissions in the array
    children: React.ReactNode;  // What to render if authorized
    fallback?: React.ReactNode; // Optional: What to render if unauthorized (e.g., a disabled button)
}

export default function HasPermission({
                                          permission,
                                          permissions,
                                          requireAll = false,
                                          children,
                                          fallback = null
                                      }: HasPermissionProps) {
    const { user } = useAuth();

    // 1. No user or no permissions array = Deny
    if (!user || !user.permissions) return <>{fallback}</>;

    // 2. System Admin Implicit Grant (Optional safety net)
    if (user.permissions.includes('ROLE_SYSTEM_ADMIN')) {
        return <>{children}</>;
    }

    // 3. Determine which permissions we are checking
    const permsToCheck = permissions || (permission ? [permission] : []);
    if (permsToCheck.length === 0) return <>{children}</>;

    // 4. Evaluate access
    const hasAccess = requireAll
        ? permsToCheck.every(p => user.permissions.includes(p))
        : permsToCheck.some(p => user.permissions.includes(p));

    return hasAccess ? <>{children}</> : <>{fallback}</>;
}