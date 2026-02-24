import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from "./features/auth/context/AuthProvider";
import LoginPage from "./features/auth/pages/LoginPage";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";
import { DashboardLayout } from "./shared/layouts/DashboardLayout";
import UserListPage from "./features/users/pages/UserListPage";
import RolesPermissionsPage from "./features/users/pages/RolesPermissionsPage";

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
                    <Route path="/login" element={<LoginPage />} />

                    <Route element={<ProtectedRoute />}>
                        <Route element={<DashboardLayout />}>
                            <Route path="/dashboard" element={<DashboardOverview />} />
                            <Route path="/users" element={<UserListPage />} />
                            <Route path="/roles" element={<RolesPermissionsPage />} />
                        </Route>
                    </Route>

                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;