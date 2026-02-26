import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from "./features/auth/context/AuthProvider";
import LoginPage from "./features/auth/pages/LoginPage";
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
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
import ActivationPage from "./features/auth/pages/ActivationPage";

// Temporary Placeholder to fix the ReferenceError
const DashboardOverview = () => (
    <div className="bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold text-gray-800">System Dashboard</h2>
        <p className="mt-2 text-gray-600">Welcome to the Secure SACCO management portal.</p>
    </div>
);

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

                        <Route path="/activate" element={
                            <GuestRoute>
                                <ActivationPage />
                            </GuestRoute>
                        } />

                        {/* All routes inside here will render with the Dashboard Sidebar/Header */}
                        <Route element={<DashboardLayout />}>

                            {/* Standard logged-in user protection (No specific permission needed) */}
                            <Route path="/dashboard" element={
                                <ProtectedRoute>
                                    <DashboardOverview />
                                </ProtectedRoute>
                            } />

                            {/* Member Portal Route */}
                            <Route path="/member/dashboard" element={
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
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </SettingsProvider>
        </AuthProvider>
    );
}

export default App;