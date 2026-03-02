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
import MemberDashboardPage from "./features/members/pages/MemberDashboardPage";
import { SettingsProvider } from "./features/settings/context/SettingsContext";
import ChartOfAccountsPage from './features/accounting/pages/ChartOfAccountsPage';
import JournalEntriesPage from './features/accounting/pages/JournalEntriesPage';

// --- NEW WRAPPER COMPONENT ---
// This safely accesses the user context because it will be rendered INSIDE the AuthProvider
const SavingsRouteWrapper = () => {
    const { user } = useAuth();

    // A pure ROLE_MEMBER user has exactly that one role and no staff/admin permissions
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

                        {/* All routes inside here will render with the Dashboard Sidebar/Header */}
                        <Route element={<DashboardLayout />}>

                            <Route path="/dashboard" element={
                                <ProtectedRoute>
                                    <MemberDashboardPage />
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

                            {/* --- UPDATED SAVINGS ROUTE --- */}
                            <Route path="savings" element={<SavingsRouteWrapper />} />

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