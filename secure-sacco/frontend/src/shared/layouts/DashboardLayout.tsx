import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../../features/auth/context/AuthProvider';

export const DashboardLayout = () => {
    const { logout } = useAuth();

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* The Sidebar component we just built */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8">
                    <button
                        onClick={logout}
                        className="text-sm font-medium text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition"
                    >
                        Sign Out
                    </button>
                </header>

                {/* Page Content */}
                <main className="p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};