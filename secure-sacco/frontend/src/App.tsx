import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SavingsManagementPage from './features/savings/pages/SavingsManagementPage';
import MemberSavingsPage from './features/savings/pages/MemberSavingsPage';
import { AuthProvider, useAuth } from "./features/auth/context/AuthProvider";
import LoginPage from "./features/auth/pages/LoginPage";
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import ChangePasswordPage from './features/auth/pages/ChangePasswordPage';
import ActivationPage from './features/auth/pages/ActivationPage';
import { DashboardLayout } from "./shared/layouts/DashboardLayout";
import UserListPage from "./features/users/pages/UserListPage";
import RolesPermissionsPage from "./features/users/pages/RolesPermissionsPage";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import SetupGuard from "./shared/components/SetupGuard";
import SecuritySettingsPage from "./features/auth/pages/SecuritySettingsPage";
import ProfilePage from "./features/auth/pages/ProfilePage";
import SaccoSettingsPage from './features/settings/pages/SaccoSettingsPage';
import GuestRoute from "./shared/components/GuestRoute";
import HasPermission from "./shared/components/HasPermission";
import MemberListPage from "./features/members/pages/MemberListPage";
import DashboardRouter from "./features/dashboard/pages/DashboardRouter";
import { SettingsProvider } from "./features/settings/context/SettingsProvider";
import { SetupProvider } from "./features/setup/context/SetupProvider";
import SetupWizardPage from "./features/setup/pages/SetupWizardPage";
import VerifyContactPage from './features/auth/pages/VerifyContactPage';
import ChartOfAccountsPage from './features/accounting/pages/ChartOfAccountsPage';
import JournalEntriesPage from './features/accounting/pages/JournalEntriesPage';
import TrialBalancePage from './features/accounting/pages/TrialBalancePage';
import ManualGlPostingPage from './features/accounting/pages/ManualGlPostingPage';
import MyLoansPage from './features/loans/pages/MyLoansPage';
import LoanManagementPage from './features/loans/pages/LoanManagementPage';
import MemberPenaltiesPage from './features/penalties/pages/MemberPenaltiesPage';
import { ReportsHubPage } from './features/reports/pages/ReportsHubPage';
import { LoanArrearsPage } from './features/reports/pages/LoanArrearsPage';
import { DailyCollectionsPage } from './features/reports/pages/DailyCollectionsPage';
import { MemberStatementPage } from './features/reports/pages/MemberStatementPage';
import { IncomeReportPage } from './features/reports/pages/IncomeReportPage';
import { GeneralStatementPage } from './features/reports/pages/GeneralStatementPage';
import { PaymentLookupPage } from './features/reports/pages/PaymentLookupPage';
import MemberPersonalReportsPage from './features/reports/pages/MemberPersonalReportsPage';
import MeetingsManagementPage from './features/meetings/pages/MeetingsManagementPage';
import MeetingCheckInPage from './features/meetings/pages/MeetingCheckInPage';
import MyMeetingsPage from './features/meetings/pages/MyMeetingsPage';
import ObligationsCompliancePage from './features/obligations/pages/ObligationsCompliancePage';
import AuditLogPage from './features/audit/pages/AuditLogPage';
import StaffPenaltiesPage from './features/penalties/pages/StaffPenaltiesPage';
import PermissionsRegistryPage from './features/users/pages/PermissionsRegistryPage';
import MigrationPage from './features/migration/pages/MigrationPage';
import PrivacyPolicyPage from './features/legal/pages/PrivacyPolicyPage';
import TermsOfServicePage from './features/legal/pages/TermsOfServicePage';
import SupportPage from './features/legal/pages/SupportPage';
import StaffExpenseClaimsPage from './features/expense/pages/StaffExpenseClaimsPage';
import MyExpenseClaimsPage from './features/expense/pages/MyExpenseClaimsPage';
import StaffAssetsPage from './features/assets/pages/StaffAssetsPage';
import LoanProductsPage from './features/loans/pages/LoanProductsPage';
import LandingPage from './features/public/pages/LandingPage';
import SecretaryPortalPage from './features/public/pages/SecretaryPortalPage';

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
        <BrowserRouter>
            <AuthProvider>
                <SetupProvider>
                    <SettingsProvider>

                        <Routes>

                            <Route path="/" element={<LandingPage />} />

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

                            {/*
                          Change Password — accessible to authenticated users with must_change_password=true.
                          Lives OUTSIDE DashboardLayout so it shows as a full-page form with no sidebar.
                          The api-client intercepts 403 PASSWORD_CHANGE_REQUIRED and redirects here.
                        */}
                            <Route path="/change-password" element={
                                <ProtectedRoute>
                                    <ChangePasswordPage />
                                </ProtectedRoute>
                            } />

                            {/*
                          Setup Wizard — full-page wizard for first-run initialization.
                          Lives OUTSIDE DashboardLayout (no sidebar during setup).
                          SetupGuard redirects SYSTEM_ADMIN here automatically when setup is incomplete.
                        */}
                            <Route path="/setup" element={
                                <ProtectedRoute>
                                    <SetupWizardPage />
                                </ProtectedRoute>
                            } />
                            {/*
                          Contact Verification — full-page form for staff who must verify
                          email + phone after their first password change. Lives OUTSIDE
                          DashboardLayout. The api-client intercepts 403 CONTACT_VERIFICATION_REQUIRED
                          and redirects here for all authenticated staff.
                        */}
                            <Route path="/verify-contact" element={
                                <ProtectedRoute>
                                    <VerifyContactPage />
                                </ProtectedRoute>
                            } />

                            {/* Legal pages - public, accessible without authentication */}
                            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                            <Route path="/support" element={<SupportPage />} />
                            <Route path="/meetings/checkin/:token" element={<MeetingCheckInPage />} />

                            {/* All routes inside here will render with the Dashboard Sidebar/Header */}
                            <Route element={
                                <SetupGuard>
                                    <DashboardLayout />
                                </SetupGuard>
                            }>

                                <Route path="/secretary-portal" element={
                                    <ProtectedRoute requiredPermissions={['MEETINGS_MANAGE']}>
                                        <SecretaryPortalPage />
                                    </ProtectedRoute>
                                } />

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
                                    <ProtectedRoute requiredPermissions={['ACCOUNTING_READ']}>
                                        <ChartOfAccountsPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/accounting/journals" element={
                                    <ProtectedRoute requiredPermissions={['ACCOUNTING_READ']}>
                                        <JournalEntriesPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/accounting/trial-balance" element={
                                    <ProtectedRoute requiredPermissions={['GL_TRIAL_BALANCE']}>
                                        <TrialBalancePage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/accounting/gl-posting" element={
                                    <ProtectedRoute requiredPermissions={['ACCOUNTING_JOURNAL_POST']}>
                                        <ManualGlPostingPage />
                                    </ProtectedRoute>
                                } />

                                {/* --- SAVINGS ROUTE --- */}
                                <Route path="savings" element={<SavingsRouteWrapper />} />

                                {/* --- SAVINGS COMPLIANCE (staff: obligations management) --- */}
                                <Route path="savings/obligations" element={
                                    <ProtectedRoute requiredPermissions={['SAVINGS_OBLIGATIONS_MANAGE']}>
                                        <ObligationsCompliancePage />
                                    </ProtectedRoute>
                                } />

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
                                    <ProtectedRoute requiredPermissions={['LOANS_READ']}>
                                        <LoanManagementPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/loans/products" element={
                                    <ProtectedRoute requiredPermissions={['LOANS_READ']}>
                                        <LoanProductsPage />
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

                                {/* --- GENERAL STATEMENT ROUTE (SAC-263) --- */}
                                <Route path="/reports/general-statement" element={
                                    <ProtectedRoute requiredPermissions={['REPORTS_READ']}>
                                        <GeneralStatementPage />
                                    </ProtectedRoute>
                                } />

                                {/* --- PAYMENT LOOKUP ROUTE (SAC-264) --- */}
                                <Route path="/reports/payment-lookup" element={
                                    <ProtectedRoute requiredPermissions={['REPORTS_READ']}>
                                        <PaymentLookupPage />
                                    </ProtectedRoute>
                                } />


                                {/* Staff Penalty Management */}
                                <Route path="/staff/penalties" element={
                                    <ProtectedRoute requiredPermissions={['PENALTIES_WAIVE_ADJUST']}>
                                        <StaffPenaltiesPage />
                                    </ProtectedRoute>
                                } />

                                {/* Permissions Registry */}
                                <Route path="/permissions-registry" element={
                                    <ProtectedRoute requiredPermissions={['SETTINGS_EDIT']}>
                                        <PermissionsRegistryPage />
                                    </ProtectedRoute>
                                } />

                                {/* Shielded: Requires SETTINGS_EDIT */}
                                <Route path="/audit/logs" element={
                                    <ProtectedRoute requiredPermissions={['AUDIT_LOG_READ']}>
                                        <AuditLogPage />
                                    </ProtectedRoute>
                                } />

                                {/* Historical data migration — SYSTEM_ADMIN only */}
                                <Route path="/migration" element={
                                    <ProtectedRoute requiredPermissions={['DATA_MIGRATION']}>
                                        <MigrationPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/profile" element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/security" element={
                                    <ProtectedRoute>
                                        <SecuritySettingsPage />
                                    </ProtectedRoute>
                                } />

                                {/* SAC-220: Expense Reimbursement Module */}
                                <Route path="/expense/claims" element={
                                    <ProtectedRoute>
                                        <HasPermission permissions={['EXPENSE_CLAIMS_APPROVE']} fallback={
                                            <div className="p-8 text-center text-red-600 font-semibold bg-white rounded shadow m-6">
                                                Access Denied: You need the EXPENSE_CLAIMS_APPROVE permission.
                                            </div>
                                        }>
                                            <StaffExpenseClaimsPage />
                                        </HasPermission>
                                    </ProtectedRoute>
                                } />

                                <Route path="/my-expense-claims" element={
                                    <ProtectedRoute>
                                        <MyExpenseClaimsPage />
                                    </ProtectedRoute>
                                } />

                                {/* SAC-221: Asset Management Module */}
                                <Route path="/assets" element={
                                    <ProtectedRoute>
                                        <HasPermission permissions={['ASSET_READ']} fallback={
                                            <div className="p-8 text-center text-red-600 font-semibold bg-white rounded shadow m-6">
                                                Access Denied: You need the ASSET_READ permission.
                                            </div>
                                        }>
                                            <StaffAssetsPage />
                                        </HasPermission>
                                    </ProtectedRoute>
                                } />

                                {/* Shielded: Requires SETTINGS_EDIT */}
                                <Route path="/settings" element={
                                    <ProtectedRoute>
                                        <HasPermission permissions={['SETTINGS_EDIT', 'PENALTIES_MANAGE_RULES']} fallback={
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

                    </SettingsProvider>
                </SetupProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;