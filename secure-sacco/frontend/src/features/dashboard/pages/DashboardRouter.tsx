import { useAuth } from '../../auth/context/AuthProvider';
import AdminDashboardPage     from './AdminDashboardPage';
import MemberDashboardPage    from './MemberDashboardPage';
import ChairpersonDashboard   from './ChairpersonDashboardPage';
import SecretaryDashboard     from './SecretaryDashboardPage';
import TreasurerDashboard     from './TreasurerDashboardPage';
import LoanOfficerDashboard   from './LoanOfficerDashboardPage';
import CashierDashboard       from './CashierDashboardPage';

/**
 * Routes the logged-in user to the dashboard that matches their primary role.
 *
 * Priority order (first match wins):
 *   SYSTEM_ADMIN                            → AdminDashboardPage  (full access)
 *   CHAIRPERSON | DEPUTY_CHAIRPERSON        → ChairpersonDashboard
 *   SECRETARY   | DEPUTY_SECRETARY          → SecretaryDashboard
 *   TREASURER   | DEPUTY_TREASURER | ACCOUNTANT | DEPUTY_ACCOUNTANT → TreasurerDashboard
 *   LOAN_OFFICER | DEPUTY_LOAN_OFFICER      → LoanOfficerDashboard
 *   CASHIER     | DEPUTY_CASHIER            → CashierDashboard
 *   MEMBER (exclusively)                    → MemberDashboardPage
 *   (any other staff role)                  → AdminDashboardPage  (safe fallback)
 */
const DashboardRouter = () => {
    const { user } = useAuth();
    const roles = user?.roles ?? [];

    const has = (...r: string[]) => r.some(role => roles.includes(role));

    // Member-only check (no staff roles at all)
    const isMemberOnly = roles.length > 0 && roles.every(r => r === 'ROLE_MEMBER');
    if (isMemberOnly) return <MemberDashboardPage />;

    // Staff role routing — ordered from most privileged to most specific
    if (has('ROLE_SYSTEM_ADMIN'))                                                   return <AdminDashboardPage />;
    if (has('ROLE_CHAIRPERSON', 'ROLE_DEPUTY_CHAIRPERSON'))                        return <ChairpersonDashboard />;
    if (has('ROLE_SECRETARY', 'ROLE_DEPUTY_SECRETARY'))                            return <SecretaryDashboard />;
    if (has('ROLE_TREASURER', 'ROLE_DEPUTY_TREASURER', 'ROLE_ACCOUNTANT', 'ROLE_DEPUTY_ACCOUNTANT')) return <TreasurerDashboard />;
    if (has('ROLE_LOAN_OFFICER', 'ROLE_DEPUTY_LOAN_OFFICER'))                      return <LoanOfficerDashboard />;
    if (has('ROLE_CASHIER', 'ROLE_DEPUTY_CASHIER'))                                return <CashierDashboard />;

    // Fallback: unknown staff role — show full admin dashboard
    return <AdminDashboardPage />;
};

export default DashboardRouter;