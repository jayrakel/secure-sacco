import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { LogOut } from 'lucide-react';

export const DashboardLayout = () => {
    const { user, logout } = useAuth();

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">

                    {/* Left Side: Empty for now */}
                    <div></div>

                    {/* Right Side: User Profile & Actions */}
                    <div className="flex items-center gap-4">

                        {/* User Info */}
                        {user && (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-slate-800 leading-none">
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {user.roles?.[0]?.replace('ROLE_', '').replace('_', ' ') || 'User'}
                                    </p>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200 uppercase">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                </div>
                            </div>
                        )}

                        {/* Vertical Divider */}
                        <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                        {/* Logout Button (Fixed width) */}
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition font-medium text-sm"
                            title="Sign out"
                        >
                            <LogOut size={18} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>

                    </div>
                </header>

                {/* Page Content (Scrollable) */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};