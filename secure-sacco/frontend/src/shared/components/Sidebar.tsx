import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { useSettings } from '../../features/settings/context/SettingsContext';
import {
    LayoutDashboard, BookOpen, FileText, Users, ShieldCheck,
    UserCircle, Coins, PiggyBank, BarChart3, Shield, Settings,
    ChevronLeft, ChevronRight, Calculator, ChevronDown, AlertCircle, CalendarDays, Scale,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
    label: string;
    path?: string;
    icon: React.ElementType;
    module?: string;
    adminOnly?: boolean;
    requiredPermission?: string;
    subItems?: NavItem[];
}

interface NavSection {
    sectionLabel: string;
    items: NavItem[];
    staffOnly?: boolean;
}

export const Sidebar = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ 'Accounting': false });

    const isStaff = user?.roles?.some(role => role !== 'ROLE_MEMBER');

    useEffect(() => {
        if (location.pathname.startsWith('/accounting') && !isCollapsed) {
            setExpandedMenus(prev => ({ ...prev, 'Accounting': true }));
        }
    }, [location.pathname, isCollapsed]);

    // ── Section-grouped nav ──────────────────────────────────────────────────
    const staffSections: NavSection[] = [
        {
            sectionLabel: 'Overview',
            items: [
                { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            ],
        },
        {
            sectionLabel: 'Administration',
            items: [
                { label: 'Users', path: '/users', icon: Users, requiredPermission: 'USER_READ' },
                { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, requiredPermission: 'ROLE_READ' },
            ],
        },
        {
            sectionLabel: 'Operations',
            items: [
                { label: 'Members', path: '/members', icon: UserCircle, module: 'members', requiredPermission: 'MEMBERS_READ' },
                { label: 'Loans', path: '/loans', icon: Coins, module: 'loans' },
                { label: 'Savings', path: '/savings', icon: PiggyBank, module: 'savings' },
                { label: 'Savings Compliance', path: '/savings/obligations', icon: ShieldCheck, module: 'savings', requiredPermission: 'SAVINGS_OBLIGATIONS_MANAGE' },
                { label: 'Meetings', path: '/meetings', icon: CalendarDays, requiredPermission: 'MEETINGS_READ' },
            ],
        },
        {
            sectionLabel: 'Finance',
            items: [
                {
                    label: 'Accounting',
                    icon: Calculator,
                    adminOnly: true,
                    subItems: [
                        { label: 'Chart of Accounts', path: '/accounting/accounts',       icon: BookOpen,  adminOnly: true },
                        { label: 'Journal Entries',   path: '/accounting/journals',       icon: FileText,  adminOnly: true },
                        { label: 'Trial Balance',     path: '/accounting/trial-balance',  icon: Scale,     requiredPermission: 'GL_TRIAL_BALANCE' },
                    ],
                },
                { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports', requiredPermission: 'REPORTS_READ' },
            ],
        },
        {
            sectionLabel: 'System',
            items: [
                { label: 'Audit Log', path: '/audit/logs', icon: Shield, adminOnly: true },
                { label: 'Security', path: '/security', icon: Shield },
                { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
            ],
        },
    ];

    const memberSections: NavSection[] = [
        {
            sectionLabel: 'Overview',
            items: [
                { label: 'My Portal', path: '/dashboard', icon: LayoutDashboard },
            ],
        },
        {
            sectionLabel: 'My Accounts',
            items: [
                { label: 'Savings Vault', path: '/savings', icon: PiggyBank, module: 'savings' },
                { label: 'My Loans', path: '/my-loans', icon: Coins, module: 'loans' },
                { label: 'Penalties', path: '/my-penalties', icon: AlertCircle },
                { label: 'My Meetings', path: '/my-meetings', icon: CalendarDays },
            ],
        },
        {
            sectionLabel: 'Account',
            items: [
                { label: 'My Reports', path: '/my-reports', icon: BarChart3 },
                { label: 'Security',   path: '/security',   icon: Shield    },
            ],
        },
    ];

    const activeSections = isStaff ? staffSections : memberSections;

    // ── Filter items for permissions/modules ─────────────────────────────────
    const isSystemAdmin = user?.permissions?.includes('ROLE_SYSTEM_ADMIN');

    const filterItems = (items: NavItem[]): NavItem[] =>
        items.filter(item => {
            if (item.adminOnly && !isSystemAdmin) return false;
            if (item.requiredPermission && !isSystemAdmin && !user?.permissions?.includes(item.requiredPermission)) return false;
            if (item.module) {
                if (!settings?.initialized) return false;
                return settings.enabledModules?.[item.module as keyof typeof settings.enabledModules] === true;
            }
            return true;
        }).map(item => item.subItems ? { ...item, subItems: filterItems(item.subItems) } : item);

    const filteredSections = activeSections
        .map(s => ({ ...s, items: filterItems(s.items) }))
        .filter(s => s.items.length > 0);

    const toggleMenu = (label: string) => {
        if (isCollapsed) setIsCollapsed(false);
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <aside className={`${isCollapsed ? 'w-[68px]' : 'w-60'} bg-slate-900 text-white transition-all duration-300 h-screen flex flex-col relative shrink-0 z-20`}>

            {/* Collapse toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-[52px] bg-emerald-600 rounded-full p-0.5 hover:bg-emerald-500 border-2 border-slate-900 z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo */}
            <div className={`flex items-center gap-3 border-b border-slate-800 shrink-0 ${isCollapsed ? 'p-4 justify-center' : 'p-5'}`}>
                <div className="bg-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">S</div>
                {!isCollapsed && (
                    <span className="font-bold text-sm text-white truncate">{settings?.saccoName || 'Secure SACCO'}</span>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
                {filteredSections.map(section => (
                    <div key={section.sectionLabel}>
                        {/* Section label */}
                        {!isCollapsed && (
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                                {section.sectionLabel}
                            </p>
                        )}
                        {isCollapsed && <div className="my-1 mx-2 h-px bg-slate-800" />}

                        <div className="space-y-0.5">
                            {section.items.map(item => (
                                <div key={item.label}>
                                    {item.subItems && item.subItems.length > 0 ? (
                                        <div>
                                            <button
                                                onClick={() => toggleMenu(item.label)}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm ${
                                                    expandedMenus[item.label] && !isCollapsed
                                                        ? 'bg-slate-800 text-white'
                                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                }`}
                                                title={isCollapsed ? item.label : undefined}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon size={17} className="shrink-0" />
                                                    {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                                </div>
                                                {!isCollapsed && (
                                                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus[item.label] ? 'rotate-180' : ''}`} />
                                                )}
                                            </button>

                                            {expandedMenus[item.label] && !isCollapsed && (
                                                <div className="ml-3 pl-4 mt-0.5 space-y-0.5 border-l border-slate-700/60">
                                                    {item.subItems.map(sub => (
                                                        <NavLink
                                                            key={sub.path}
                                                            to={sub.path!}
                                                            className={({ isActive }) =>
                                                                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                                                                    isActive
                                                                        ? 'bg-emerald-600/20 text-emerald-400 font-medium'
                                                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                                }`
                                                            }
                                                        >
                                                            <sub.icon size={15} className="shrink-0" />
                                                            <span>{sub.label}</span>
                                                        </NavLink>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <NavLink
                                            to={item.path!}
                                            end={item.path === '/dashboard'}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                                                    isActive
                                                        ? 'bg-emerald-600 text-white font-semibold'
                                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                }`
                                            }
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <item.icon size={17} className="shrink-0" />
                                            {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                        </NavLink>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User footer */}
            {!isCollapsed && (
                <div className="p-3 border-t border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-slate-800/50">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate leading-none">{user?.firstName} {user?.lastName}</p>
                            {user?.memberNumber && (
                                <p className="text-[10px] font-mono text-emerald-400 mt-0.5">{user.memberNumber}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};