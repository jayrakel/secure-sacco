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
    const permissions = user?.permissions ?? [];

    // Permission-based routing — no role name checks
    // Member-only users have MEMBER_DASHBOARD_VIEW but no staff permissions
    const isMemberOnly = permissions.includes('MEMBER_DASHBOARD_VIEW')
        && !permissions.some(p => ['MEMBERS_READ','SAVINGS_READ','LOANS_READ',
            'ACCOUNTING_READ','REPORTS_READ','SAVINGS_MANUAL_POST'].includes(p));
    if (isMemberOnly) return <MemberDashboardPage />;

    // All staff (any staff permission) → unified permission-driven dashboard
    return <UnifiedStaffDashboard />;
};

export default DashboardRouter;