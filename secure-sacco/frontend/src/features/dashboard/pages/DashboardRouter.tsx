import { useAuth } from '../../auth/context/AuthProvider';
import AdminDashboardPage from './AdminDashboardPage';
import MemberDashboardPage from './MemberDashboardPage';

/**
 * Renders the correct dashboard based on whether the logged-in user
 * is a member-only user or a staff/admin user.
 *
 * Staff roles:  ROLE_SYSTEM_ADMIN, ROLE_LOAN_OFFICER, ROLE_TREASURER, etc.
 * Member role:  ROLE_MEMBER (exclusively)
 */
const DashboardRouter = () => {
    const { user } = useAuth();

    const isMemberOnly =
        !!user?.roles?.length &&
        user.roles.every(r => r === 'ROLE_MEMBER');

    return isMemberOnly ? <MemberDashboardPage /> : <AdminDashboardPage />;
};

export default DashboardRouter;