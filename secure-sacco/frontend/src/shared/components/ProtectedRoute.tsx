import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';

export const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return <div>Loading Session...</div>;

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};