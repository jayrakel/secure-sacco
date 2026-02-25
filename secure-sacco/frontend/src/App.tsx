import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from "./features/auth/context/AuthProvider";
import LoginPage from "./features/auth/pages/LoginPage";
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import { DashboardLayout } from "./shared/layouts/DashboardLayout";
import UserListPage from "./features/users/pages/UserListPage";
import RolesPermissionsPage from "./features/users/pages/RolesPermissionsPage";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import SecuritySettingsPage from "./features/auth/pages/SecuritySettingsPage";
import GuestRoute from "./shared/components/GuestRoute";

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

                    {/* All routes inside here will render with the Dashboard Sidebar/Header */}
                    <Route element={<DashboardLayout />}>

                        {/* Standard logged-in user protection (No specific permission needed) */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <DashboardOverview />
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

                        <Route path="/security" element={
                            <ProtectedRoute>
                                <SecuritySettingsPage />
                            </ProtectedRoute>
                        } />

                    </Route>

                    {/* Fallback route */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;