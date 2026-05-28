import { useAuth } from '../../auth/context/AuthProvider';
import MemberDashboardPage  from './MemberDashboardPage';
import UnifiedStaffDashboard from './UnifiedStaffDashboard';

/**
 * Routes to the correct dashboard based on account type only.
 *
 * SYSTEM_ADMIN and all staff roles → UnifiedStaffDashboard
 *   The unified dashboard reads user.permissions[] directly and renders
 *   only the sections that match. No role-based hardcoding.
 *   Grant or revoke a permission → that section appears or disappears
 *   on next page load. No code change required.
 *
 * ROLE_MEMBER exclusively → MemberDashboardPage (personal account view)
 */
const DashboardRouter = () => {
    const { user } = useAuth();
    const roles = user?.roles ?? [];

    const isMemberOnly = roles.length > 0 && roles.every(r => r === 'ROLE_MEMBER');
    if (isMemberOnly) return <MemberDashboardPage />;

    // All staff (any non-member role) → unified permission-driven dashboard
    return <UnifiedStaffDashboard />;
};

export default DashboardRouter;