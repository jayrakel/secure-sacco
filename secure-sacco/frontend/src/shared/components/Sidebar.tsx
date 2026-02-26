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

// 🛡️ 1. Define the TypeScript Interface so TS knows these optional fields exist
interface NavItem {
    label: string;
    path: string;
    icon: React.ElementType;
    module?: string;
    adminOnly?: boolean;
    requiredPermission?: string;
}

export const Sidebar = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isStaff = user?.roles?.some(role => role !== 'MEMBER');

    // 🛡️ 2. Apply the Type here
    const staffNavItems: NavItem[] = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'User Management', path: '/users', icon: Users, requiredPermission: 'USER_READ' },
        { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, requiredPermission: 'ROLE_READ' },

        { label: 'Members', path: '/members', icon: UserCircle, module: 'members', requiredPermission: 'MEMBERS_READ' },
        { label: 'Loans', path: '/loans', icon: Coins, module: 'loans' },
        { label: 'Savings', path: '/savings', icon: PiggyBank, module: 'savings' },
        { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports' },

        { label: 'Security', path: '/security', icon: Shield },
        { label: 'Platform Settings', path: '/settings', icon: Settings, adminOnly: true },
    ];

    // 🛡️ 3. Apply the Type here too
    const memberNavItems: NavItem[] = [
        { label: 'My Portal', path: '/member/dashboard', icon: LayoutDashboard },
        { label: 'Security', path: '/security', icon: Shield },
    ];

    const activeNavList = isStaff ? staffNavItems : memberNavItems;

    const navItems = activeNavList.filter(item => {
        // Now TypeScript knows these properties are perfectly safe to check!
        if (item.adminOnly && !user?.roles?.includes('ROLE_SYSTEM_ADMIN')) return false;

        if (item.requiredPermission && !user?.permissions?.includes(item.requiredPermission)) return false;

        if (item.module) {
            if (!settings?.initialized) return false;
            return settings.enabledModules?.[item.module as keyof typeof settings.enabledModules] === true;
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
                    {user?.memberNumber && (
                        <p className="text-xs font-mono text-emerald-400 mt-1">{user.memberNumber}</p>
                    )}
                </div>
            )}
        </aside>
    );
};