import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { useSettings } from '../../features/settings/context/SettingsContext';
import {
    LayoutDashboard,
    Users,
    ShieldCheck,
    UserCircle,
    Coins,
    PiggyBank,
    BarChart3,
    Shield,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export const Sidebar = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const allNavItems = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'User Management', path: '/users', icon: Users },
        { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck },

        // Modules dependent on Feature Flags
        { label: 'Members', path: '/members', icon: UserCircle, module: 'members' },
        { label: 'Loans', path: '/loans', icon: Coins, module: 'loans' },
        { label: 'Savings', path: '/savings', icon: PiggyBank, module: 'savings' },
        { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports' },

        { label: 'Security', path: '/security', icon: Shield },
        { label: 'Platform Settings', path: '/settings', icon: Settings, adminOnly: true },
    ];

    const navItems = allNavItems.filter(item => {
        // 1. Check Admin Roles
        if (item.adminOnly && !user?.roles?.includes('ROLE_SYSTEM_ADMIN')) return false;

        // 2. Check Feature Flags for dynamic modules
        if (item.module) {
            if (!settings?.initialized) return false; // Hide completely if system isn't setup
            return settings.enabledModules?.[item.module] === true;
        }

        return true;
    });

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white transition-all duration-300 h-screen flex flex-col relative shrink-0 z-20`}>
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-10 bg-emerald-600 rounded-full p-1 hover:bg-emerald-500 border-2 border-slate-900 z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <div className="p-6 font-bold text-xl border-b border-slate-800 flex items-center gap-3 shrink-0">
                <div className="bg-emerald-600 p-2 rounded-lg text-white flex items-center justify-center w-10 h-10">S</div>
                {!isCollapsed && <span className="whitespace-nowrap">{settings?.saccoName || 'Secure SACCO'}</span>}
            </div>

            <nav className="flex-1 mt-6 px-3 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center gap-4 px-3 py-3 rounded-lg transition-colors
                            ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                        `}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <item.icon size={20} className="shrink-0" />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {!isCollapsed && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Logged in as</p>
                    <p className="text-sm font-medium truncate mt-0.5">{user?.firstName} {user?.lastName}</p>
                </div>
            )}
        </aside>
    );
};