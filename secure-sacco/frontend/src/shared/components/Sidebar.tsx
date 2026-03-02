import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { useSettings } from '../../features/settings/context/SettingsContext';
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    Users,
    ShieldCheck,
    UserCircle,
    Coins,
    PiggyBank,
    BarChart3,
    Shield,
    Settings,
    ChevronLeft,
    ChevronRight,
    Calculator,
    ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
    label: string;
    path?: string; // Optional because parent tabs don't need a path
    icon: React.ElementType;
    module?: string;
    adminOnly?: boolean;
    requiredPermission?: string;
    subItems?: NavItem[]; // Array for nested sub-tabs
}

export const Sidebar = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // State to track which dropdowns are open
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        'Accounting': false // Default state
    });

    const isStaff = user?.roles?.some(role => role !== 'MEMBER');

    // Auto-expand the Accounting menu if we are on an accounting page
    useEffect(() => {
        if (location.pathname.startsWith('/accounting') && !isCollapsed) {
            setExpandedMenus(prev => ({ ...prev, 'Accounting': true }));
        }
    }, [location.pathname, isCollapsed]);

    const staffNavItems: NavItem[] = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'User Management', path: '/users', icon: Users, requiredPermission: 'USER_READ' },
        { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, requiredPermission: 'ROLE_READ' },

        { label: 'Members', path: '/members', icon: UserCircle, module: 'members', requiredPermission: 'MEMBERS_READ' },
        { label: 'Loans', path: '/loans', icon: Coins, module: 'loans' },
        { label: 'Savings', path: '/savings', icon: PiggyBank, module: 'savings' },

        // --- NEW NESTED ACCOUNTING TAB ---
        {
            label: 'Accounting',
            icon: Calculator,
            adminOnly: true,
            subItems: [
                { label: 'Chart of Accounts', path: '/accounting/accounts', icon: BookOpen, adminOnly: true },
                { label: 'Journal Entries', path: '/accounting/journals', icon: FileText, adminOnly: true },
            ]
        },

        { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports' },

        { label: 'Security', path: '/security', icon: Shield },
        { label: 'Platform Settings', path: '/settings', icon: Settings, adminOnly: true },
    ];

    const memberNavItems: NavItem[] = [
        { label: 'My Portal', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Security', path: '/security', icon: Shield },
    ];

    const activeNavList = isStaff ? staffNavItems : memberNavItems;

    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items.filter(item => {
            if (item.adminOnly && !user?.roles?.includes('ROLE_SYSTEM_ADMIN')) return false;
            if (item.requiredPermission && !user?.permissions?.includes(item.requiredPermission)) return false;
            if (item.module) {
                if (!settings?.initialized) return false;
                return settings.enabledModules?.[item.module as keyof typeof settings.enabledModules] === true;
            }
            return true;
        }).map(item => {
            // Recursively filter subItems if they exist
            if (item.subItems) {
                return { ...item, subItems: filterNavItems(item.subItems) };
            }
            return item;
        });
    };

    const navItems = filterNavItems(activeNavList);

    const toggleMenu = (label: string) => {
        if (isCollapsed) setIsCollapsed(false); // Auto-expand sidebar if trying to open a menu
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

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
                    <div key={item.label}>
                        {item.subItems && item.subItems.length > 0 ? (
                            // Parent Tab (Dropdown)
                            <div>
                                <button
                                    onClick={() => toggleMenu(item.label)}
                                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                                        expandedMenus[item.label] && !isCollapsed ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <div className="flex items-center gap-4">
                                        <item.icon size={20} className="shrink-0" />
                                        {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                                    </div>
                                    {!isCollapsed && (
                                        <ChevronDown size={16} className={`transition-transform duration-200 ${expandedMenus[item.label] ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {/* Sub Items */}
                                {expandedMenus[item.label] && !isCollapsed && (
                                    <div className="ml-4 pl-4 mt-1 space-y-1 border-l border-slate-700">
                                        {item.subItems.map((subItem) => (
                                            <NavLink
                                                key={subItem.path}
                                                to={subItem.path!}
                                                className={({ isActive }) => `
                                                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
                                                    ${isActive ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                                `}
                                            >
                                                <subItem.icon size={16} className="shrink-0" />
                                                <span className="whitespace-nowrap">{subItem.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Standard Link
                            <NavLink
                                to={item.path!}
                                className={({ isActive }) => `
                                    flex items-center gap-4 px-3 py-3 rounded-lg transition-colors
                                    ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                `}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon size={20} className="shrink-0" />
                                {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                            </NavLink>
                        )}
                    </div>
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