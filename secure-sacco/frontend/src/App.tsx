import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SavingsManagementPage from './features/savings/pages/SavingsManagementPage';
import MemberSavingsPage from './features/savings/pages/MemberSavingsPage';
import { AuthProvider, useAuth } from "./features/auth/context/AuthProvider";
import LoginPage from "./features/auth/pages/LoginPage";
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import ActivationPage from './features/auth/pages/ActivationPage';
import { DashboardLayout } from "./shared/layouts/DashboardLayout";
import UserListPage from "./features/users/pages/UserListPage";
import RolesPermissionsPage from "./features/users/pages/RolesPermissionsPage";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import SecuritySettingsPage from "./features/auth/pages/SecuritySettingsPage";
import SaccoSettingsPage from './features/settings/pages/SaccoSettingsPage';
import GuestRoute from "./shared/components/GuestRoute";
import HasPermission from "./shared/components/HasPermission";
import MemberListPage from "./features/members/pages/MemberListPage";
import DashboardRouter from "./features/dashboard/pages/DashboardRouter";
import { SettingsProvider } from "./features/settings/context/SettingsContext";
import ChartOfAccountsPage from './features/accounting/pages/ChartOfAccountsPage';
import JournalEntriesPage from './features/accounting/pages/JournalEntriesPage';
import TrialBalancePage from './features/accounting/pages/TrialBalancePage';
import MyLoansPage from './features/loans/pages/MyLoansPage';
import LoanManagementPage from './features/loans/pages/LoanManagementPage';
import MemberPenaltiesPage from './features/penalties/pages/MemberPenaltiesPage';
import { ReportsHubPage } from './features/reports/pages/ReportsHubPage';
import { LoanArrearsPage } from './features/reports/pages/LoanArrearsPage';
import { DailyCollectionsPage } from './features/reports/pages/DailyCollectionsPage';
import { MemberStatementPage } from './features/reports/pages/MemberStatementPage';
import { IncomeReportPage } from './features/reports/pages/IncomeReportPage';
import MemberPersonalReportsPage from './features/reports/pages/MemberPersonalReportsPage';
import MeetingsManagementPage from './features/meetings/pages/MeetingsManagementPage';
import MyMeetingsPage from './features/meetings/pages/MyMeetingsPage';
import AuditLogPage from './features/audit/pages/AuditLogPage';
import ChangePasswordPage from './features/auth/pages/ChangePasswordPage';

const SavingsRouteWrapper = () => {
    const { user } = useAuth();

    const isOnlyMember = user?.roles?.includes('ROLE_MEMBER') &&
        !user?.roles?.some(r => r !== 'ROLE_MEMBER');

    return isOnlyMember ? (
        <MemberSavingsPage />
    ) : (
        <HasPermission permission="SAVINGS_READ">
            <SavingsManagementPage />
        </HasPermission>
    );
};

function App() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Wrap Login in GuestRoute */}
                        <Route path="/login" element={
                            <GuestRoute>
                                <LoginPage />
                            </GuestRoute>
                        } />

                        <Route path="/reset-password" element={
                            <GuestRoute>
                                <ResetPasswordPage />
                            </GuestRoute>
                        } />

                        {/* Activation Route */}
                        <Route path="/activate" element={
                            <GuestRoute>
                                <ActivationPage />
                            </GuestRoute>
                        } />

                        {/* Force password change — authenticated but restricted */}
                        <Route path="/change-password" element={<ChangePasswordPage />} />

                        {/* All routes inside here will render with the Dashboard Sidebar/Header */}
                        <Route element={<DashboardLayout />}>

                            <Route path="/dashboard" element={
                                <ProtectedRoute>
                                    <DashboardRouter />
                                </ProtectedRoute>
                            } />

                            {/* Shielded: Requires USER_READ */}
                            <Route path="/users" element={
                                <ProtectedRoute requiredPermissions={['USER_READ']}>
                                    <UserListPage />
                                </ProtectedRoute>
                            } />

                            {/* Shielded: Requires ROLE_READ */}
                            <Route path="/roles" element={
                                <ProtectedRoute requiredPermissions={['ROLE_READ']}>
                                    <RolesPermissionsPage />
                                </ProtectedRoute>
                            } />

                            {/* Shielded: Requires MEMBERS_READ */}
                            <Route path="/members" element={
                                <ProtectedRoute requiredPermissions={['MEMBERS_READ']}>
                                    <MemberListPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/accounting/accounts" element={
                                <ProtectedRoute requiredPermissions={['ROLE_SYSTEM_ADMIN']}>
                                    <ChartOfAccountsPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/accounting/journals" element={
                                <ProtectedRoute requiredPermissions={['ROLE_SYSTEM_ADMIN']}>
                                    <JournalEntriesPage />
                                </ProtectedRoute>
                            } />

                            {/* SAC-151: GL Trial Balance — Treasurer + Admin */}
                            <Route path="/accounting/trial-balance" element={
                                <ProtectedRoute requiredPermissions={['GL_TRIAL_BALANCE']}>
                                    <TrialBalancePage />
                                </ProtectedRoute>
                            } />

                            {/* SAC-150: Security Audit Log — Admin only */}
                            <Route path="/audit/logs" element={
                                <ProtectedRoute requiredPermissions={['ROLE_SYSTEM_ADMIN']}>
                                    <AuditLogPage />
                                </ProtectedRoute>
                            } />

                            {/* --- SAVINGS ROUTE --- */}
                            <Route path="savings" element={<SavingsRouteWrapper />} />

                            {/* --- MEMBER LOANS ROUTE --- */}
                            <Route path="my-loans" element={
                                <ProtectedRoute>
                                    <MyLoansPage />
                                </ProtectedRoute>
                            } />

                            {/* --- MEMBER PENALTIES ROUTE --- */}
                            <Route path="my-penalties" element={
                                <ProtectedRoute>
                                    <MemberPenaltiesPage />
                                </ProtectedRoute>
                            } />

                            {/* --- MEETINGS (STAFF) ROUTE --- */}
                            <Route path="meetings" element={
                                <ProtectedRoute requiredPermissions={['MEETINGS_READ']}>
                                    <MeetingsManagementPage />
                                </ProtectedRoute>
                            } />

                            {/* --- MY MEETINGS (MEMBER) ROUTE --- */}
                            <Route path="my-meetings" element={
                                <ProtectedRoute>
                                    <MyMeetingsPage />
                                </ProtectedRoute>
                            } />

                            {/* --- MEMBER PERSONAL REPORTS --- */}
                            <Route path="my-reports" element={
                                <ProtectedRoute>
                                    <MemberPersonalReportsPage />
                                </ProtectedRoute>
                            } />

                            {/* --- STAFF LOANS ROUTE --- */}
                            <Route path="loans" element={
                                <ProtectedRoute>
                                    <LoanManagementPage />
                                </ProtectedRoute>
                            } />

                            {/* --- REPORTS ROUTE --- */}
                            <Route path="/reports" element={
                                <ProtectedRoute requiredPermissions={['REPORTS_READ']}>
                                    <ReportsHubPage />
                                </ProtectedRoute>
                            } />

                            {/* --- LOAN ARREARS REPORT ROUTE --- */}
                            <Route path="/reports/arrears" element={
                                <ProtectedRoute requiredPermissions={['REPORTS_READ']}>
                                    <LoanArrearsPage />
                                </ProtectedRoute>
                            } />

                            {/* --- DAILY COLLECTIONS REPORT ROUTE --- */}
                            <Route path="/reports/collections" element={
                                <ProtectedRoute requiredPermissions={['REPORTS_READ']}>
                                    <DailyCollectionsPage />
                                </ProtectedRoute>
                            } />

                            {/* --- MEMBER STATEMENT ROUTE (staff + member self-view) --- */}
                            <Route path="/reports/statements" element={
                                <ProtectedRoute>
                                    <MemberStatementPage />
                                </ProtectedRoute>
                            } />

                            {/* --- INCOME REPORT ROUTE --- */}
                            <Route path="/reports/income" element={
                                <ProtectedRoute requiredPermissions={['REPORTS_READ']}>
                                    <IncomeReportPage />
                                </ProtectedRoute>
                            } />


                            <Route path="/security" element={
                                <ProtectedRoute>
                                    <SecuritySettingsPage />
                                </ProtectedRoute>
                            } />

                            {/* Shielded: Requires ROLE_SYSTEM_ADMIN */}
                            <Route path="/settings" element={
                                <ProtectedRoute>
                                    <HasPermission permission="ROLE_SYSTEM_ADMIN" fallback={
                                        <div className="p-8 text-center text-red-600 font-semibold bg-white rounded shadow m-6">
                                            Access Denied: You do not have permission to view global settings.
                                        </div>
                                    }>
                                        <SaccoSettingsPage />
                                    </HasPermission>
                                </ProtectedRoute>
                            } />

                        </Route>

                        {/* Fallback route */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </SettingsProvider>
        </AuthProvider>
    );
}

export default App;