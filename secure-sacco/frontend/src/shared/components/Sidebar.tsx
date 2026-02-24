import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import {
    LayoutDashboard,
    Users,
    ShieldCheck,
    UserCircle,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'; // Standard feather-style icons
import { useState } from 'react';

export const Sidebar = () => {
    const { user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'User Management', path: '/users', icon: Users },
        { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck },
        { label: 'Members', path: '/members', icon: UserCircle },
    ];

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white transition-all duration-300 min-h-screen flex flex-col relative`}>
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-10 bg-blue-600 rounded-full p-1 hover:bg-blue-500 border-2 border-slate-900"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Logo Area */}
            <div className="p-6 font-bold text-xl border-b border-slate-800 flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">S</div>
                {!isCollapsed && <span>Secure SACCO</span>}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 mt-6 px-3 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center gap-4 px-3 py-3 rounded-lg transition-colors
                            ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                        `}
                    >
                        <item.icon size={20} />
                        {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* User Footer */}
            {!isCollapsed && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Logged in as</p>
                    <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                </div>
            )}
        </aside>
    );
};