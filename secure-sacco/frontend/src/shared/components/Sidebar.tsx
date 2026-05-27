import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { useSettings } from '../../features/settings/context/useSettings';
import { DarkModeToggle } from './DarkModeToggle';
import { PRIMITIVE_TOKENS } from '@/shared/design';
import {
    LayoutDashboard, BookOpen, FileText, Users, ShieldCheck,
    UserCircle, Coins, PiggyBank, BarChart3, Shield, Settings,
    ChevronLeft, ChevronRight, ChevronDown, AlertCircle, CalendarDays, Scale, PenLine, X, Database, Receipt, Package,
} from 'lucide-react';
import { useState, useMemo } from 'react';

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

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

export const Sidebar = ({ mobileOpen = false, onMobileClose }: SidebarProps) => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [menuOverrides, setMenuOverrides] = useState<Record<string, boolean>>({});

    const expandedMenus = useMemo<Record<string, boolean>>(() => ({
        ...menuOverrides,
        Accounting: 'Accounting' in menuOverrides
            ? menuOverrides['Accounting']
            : location.pathname.startsWith('/accounting') && !isCollapsed,
    }), [menuOverrides, location.pathname, isCollapsed]);

    const isStaff = user?.roles?.some(role => role !== 'ROLE_MEMBER');

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
                { label: 'Loans', path: '/loans', icon: Coins, module: 'loans', requiredPermission: 'LOANS_READ' },
                { label: 'Savings', path: '/savings', icon: PiggyBank, module: 'savings', requiredPermission: 'SAVINGS_READ' },
                { label: 'Savings Compliance', path: '/savings/obligations', icon: ShieldCheck, module: 'savings', requiredPermission: 'SAVINGS_OBLIGATIONS_MANAGE' },
                { label: 'Meetings', path: '/meetings', icon: CalendarDays, requiredPermission: 'MEETINGS_READ' },
                { label: 'Penalties', path: '/staff/penalties', icon: AlertCircle, requiredPermission: 'PENALTIES_WAIVE_ADJUST' },
                { label: 'Expense Claims', path: '/expense/claims', icon: Receipt, requiredPermission: 'EXPENSE_CLAIMS_APPROVE' },
                { label: 'Asset Register',  path: '/assets',         icon: Package, requiredPermission: 'ASSET_READ' },
            ],
        },
        {
            sectionLabel: 'Finance',
            items: [
                { label: 'Chart of Accounts', path: '/accounting/accounts',      icon: BookOpen, requiredPermission: 'ACCOUNTING_READ' },
                { label: 'Journal Entries',   path: '/accounting/journals',      icon: FileText, requiredPermission: 'ACCOUNTING_READ' },
                { label: 'Manual GL Posting', path: '/accounting/gl-posting',    icon: PenLine,  requiredPermission: 'ACCOUNTING_JOURNAL_POST' },
                { label: 'Trial Balance',     path: '/accounting/trial-balance', icon: Scale,    requiredPermission: 'GL_TRIAL_BALANCE' },
                { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports', requiredPermission: 'REPORTS_READ' },
            ],
        },
        {
            sectionLabel: 'System',
            items: [
                { label: 'Audit Log', path: '/audit/logs', icon: Shield, requiredPermission: 'AUDIT_LOG_READ' },
                { label: 'My Profile', path: '/profile',   icon: UserCircle },
                { label: 'Settings',  path: '/settings',   icon: Settings, requiredPermission: 'PENALTIES_MANAGE_RULES' },
                { label: 'Migration',             path: '/migration',             icon: Database, requiredPermission: 'DATA_MIGRATION' },
                { label: 'Permissions Registry', path: '/permissions-registry', icon: Shield,   adminOnly: true },
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
                { label: 'Savings Vault', path: '/savings',           icon: PiggyBank,  module: 'savings' },
                { label: 'My Loans',      path: '/my-loans',          icon: Coins,      module: 'loans' },
                { label: 'Penalties',     path: '/my-penalties',      icon: AlertCircle },
                { label: 'My Meetings',   path: '/my-meetings',       icon: CalendarDays },
                { label: 'Expense Claims', path: '/my-expense-claims', icon: Receipt },
            ],
        },
        {
            sectionLabel: 'Account',
            items: [
                { label: 'My Reports', path: '/my-reports', icon: BarChart3 },
                { label: 'My Profile',  path: '/profile',   icon: UserCircle },
            ],
        },
    ];

    const activeSections = isStaff ? staffSections : memberSections;
    const isSystemAdmin = user?.roles?.includes('ROLE_SYSTEM_ADMIN');

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
        setMenuOverrides(prev => ({ ...prev, [label]: !expandedMenus[label] }));
    };

    const handleNavClick = () => {
        // Close mobile sidebar on nav item click
        if (onMobileClose) onMobileClose();
    };

    return (
        <>
            {/* Mobile overlay backdrop */}
            {mobileOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        zIndex: 30,
                        display: window.innerWidth >= 1024 ? 'none' : 'block',
                    }}
                    onClick={onMobileClose}
                />
            )}

            {/* Sidebar */}
            <aside
                style={{
                    width: isCollapsed ? PRIMITIVE_TOKENS.spacing[17] : PRIMITIVE_TOKENS.spacing[60],
                    background: 'var(--sidebar-bg)',
                    color: 'var(--text-inverse)',
                    transition: `all ${PRIMITIVE_TOKENS.transition.base}`,
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    zIndex: 40,
                    position: window.innerWidth < 1024 ? 'fixed' : 'static',
                    inset: window.innerWidth < 1024 ? '0 auto 0 0' : 'auto',
                    transform: window.innerWidth < 1024 ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
                    left: 0,
                }}
            >
                {/* Mobile close button */}
                <button
                    onClick={onMobileClose}
                    style={{
                        position: 'absolute',
                        top: PRIMITIVE_TOKENS.spacing[3],
                        right: PRIMITIVE_TOKENS.spacing[3],
                        display: window.innerWidth >= 1024 ? 'none' : 'block',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        padding: PRIMITIVE_TOKENS.spacing[1],
                        borderRadius: PRIMITIVE_TOKENS.radius.lg,
                        cursor: 'pointer',
                        transition: PRIMITIVE_TOKENS.transition.fast,
                        zIndex: 50,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--sidebar-active)';
                        e.currentTarget.style.color = 'var(--text-inverse)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                >
                    <X size={18} />
                </button>

                {/* Desktop collapse toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        position: 'absolute',
                        right: `calc(-${PRIMITIVE_TOKENS.spacing[3]})`,
                        top: PRIMITIVE_TOKENS.spacing[13],
                        background: 'var(--brand-primary)',
                        borderRadius: PRIMITIVE_TOKENS.radius.full,
                        padding: PRIMITIVE_TOKENS.spacing[0.5],
                        border: `2px solid var(--sidebar-bg)`,
                        cursor: 'pointer',
                        transition: PRIMITIVE_TOKENS.transition.fast,
                        zIndex: 50,
                        display: window.innerWidth >= 1024 ? 'block' : 'none',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                    }}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Logo */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: PRIMITIVE_TOKENS.spacing[3],
                        borderBottom: `1px solid var(--sidebar-active)`,
                        flexShrink: 0,
                        padding: isCollapsed ? PRIMITIVE_TOKENS.spacing[4] : PRIMITIVE_TOKENS.spacing[5],
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                    }}
                >
                    {settings?.logoUrl ? (
                        <img
                            key={settings.logoUrl}
                            src={settings.logoUrl}
                            alt="Logo"
                            style={{
                                objectFit: 'contain',
                                flexShrink: 0,
                                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                                transition: `all ${PRIMITIVE_TOKENS.transition.base}`,
                                width: isCollapsed ? PRIMITIVE_TOKENS.spacing[8] : 'auto',
                                height: PRIMITIVE_TOKENS.spacing[8],
                                maxWidth: isCollapsed ? PRIMITIVE_TOKENS.spacing[8] : '160px',
                                borderRadius: isCollapsed ? PRIMITIVE_TOKENS.radius.lg : '0',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                background: 'var(--brand-primary)',
                                width: PRIMITIVE_TOKENS.spacing[8],
                                height: PRIMITIVE_TOKENS.spacing[8],
                                borderRadius: PRIMITIVE_TOKENS.radius.lg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-inverse)',
                                fontWeight: 'bold',
                                fontSize: PRIMITIVE_TOKENS.fontSize.sm[0],
                                flexShrink: 0,
                            }}
                        >
                            {settings?.saccoName ? settings.saccoName.charAt(0).toUpperCase() : 'S'}
                        </div>
                    )}

                    {!isCollapsed && (
                        <span
                            style={{
                                fontWeight: 'bold',
                                fontSize: PRIMITIVE_TOKENS.fontSize.sm[0],
                                color: 'var(--text-inverse)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {settings?.saccoName || 'Secure SACCO'}
                        </span>
                    )}
                </div>

                {/* Nav */}
                <nav
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingTop: PRIMITIVE_TOKENS.spacing[3],
                        paddingBottom: PRIMITIVE_TOKENS.spacing[3],
                        paddingLeft: PRIMITIVE_TOKENS.spacing[2],
                        paddingRight: PRIMITIVE_TOKENS.spacing[2],
                        display: 'flex',
                        flexDirection: 'column',
                        gap: PRIMITIVE_TOKENS.spacing[4],
                    }}
                >
                    {filteredSections.map(section => (
                        <div key={section.sectionLabel}>
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
                                                                onClick={handleNavClick}
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
                                                onClick={handleNavClick}
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
                    <div
                        style={{
                            padding: PRIMITIVE_TOKENS.spacing[3],
                            borderTop: `1px solid var(--sidebar-active)`,
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: PRIMITIVE_TOKENS.spacing[2.5],
                                padding: PRIMITIVE_TOKENS.spacing[2],
                                borderRadius: PRIMITIVE_TOKENS.radius.lg,
                                background: 'var(--sidebar-active)',
                            }}
                        >
                            <div
                                style={{
                                    width: PRIMITIVE_TOKENS.spacing[7],
                                    height: PRIMITIVE_TOKENS.spacing[7],
                                    borderRadius: PRIMITIVE_TOKENS.radius.full,
                                    background: 'var(--brand-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-inverse)',
                                    fontSize: PRIMITIVE_TOKENS.fontSize.xs[0],
                                    fontWeight: 'bold',
                                    flexShrink: 0,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div
                                style={{
                                    minWidth: 0,
                                }}
                            >
                                <p
                                    style={{
                                        fontSize: PRIMITIVE_TOKENS.fontSize.xs[0],
                                        fontWeight: 'semibold',
                                        color: 'var(--text-inverse)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        lineHeight: 1,
                                        margin: 0,
                                    }}
                                >
                                    {user?.firstName} {user?.lastName}
                                </p>
                                {user?.memberNumber && (
                                    <p
                                        style={{
                                            fontSize: PRIMITIVE_TOKENS.fontSize.xs[0],
                                            fontFamily: 'monospace',
                                            color: 'var(--brand-primary)',
                                            margin: `${PRIMITIVE_TOKENS.spacing[0.5]} 0 0 0`,
                                        }}
                                    >
                                        {user.memberNumber}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div style={{ marginTop: PRIMITIVE_TOKENS.spacing[3] }}>
                            <DarkModeToggle />
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
};