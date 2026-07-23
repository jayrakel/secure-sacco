import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { useSettings } from '../../features/settings/context/useSettings';
import { LogOut, ChevronRight, Menu, UserCircle } from 'lucide-react';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const PAGE_LABELS: Record<string, string> = {
    '/dashboard':                  'Dashboard',
    '/users':                      'User Management',
    '/roles':                      'Roles & Permissions',
    '/members':                    'Member Directory',
    '/savings':                    'Savings Management',
    '/loans':                      'Loan Management',
    '/my-loans':                   'My Loans',
    '/my-savings':                 'My Savings',
    '/my-penalties':               'My Penalties',
    '/my-reports':                 'My Reports',
    '/my-meetings':                'My Meetings',
    '/meetings':                   'Meetings',
    '/reports':                    'Reports & Analytics',
    '/reports/statements':         'Member Statements',
    '/reports/arrears':            'Loan Arrears',
    '/reports/collections':        'Daily Collections',
    '/reports/income':             'Income Report',
    '/accounting/accounts':        'Chart of Accounts',
    '/accounting/journals':        'Journal Entries',
    '/accounting/trial-balance':   'GL Trial Balance',
    '/audit/logs':                 'Security Audit Log',
    '/security':                   'Security Settings',
    '/settings':                   'Platform Settings',
    '/admin/time-machine':            'System Time Machine',
    '/profile':                    'My Profile',
};

export const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const { isLoading: settingsLoading } = useSettings();
    const location = useLocation();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Gate: hold the entire dashboard until settings (branding) have resolved.
    // This prevents the sidebar from flashing the default logo/name even for a frame.
    if (settingsLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="relative flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-full border-4 border-slate-200" />
                    <div className="absolute w-14 h-14 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                    <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500 opacity-80" />
                </div>
                <p className="text-slate-400 text-sm tracking-wide animate-pulse">Loading&hellip;</p>
            </div>
        );
    }

    const pathLabel = PAGE_LABELS[location.pathname] ?? 'Dashboard';

    const parts = location.pathname.split('/').filter(Boolean);
    const breadcrumb = parts.length > 1
        ? [PAGE_LABELS[`/${parts[0]}`] ?? parts[0], pathLabel]
        : null;

    const roleName = user?.roles?.[0]?.replace('ROLE_', '').replace(/_/g, ' ') ?? 'User';

    return (
        <div className="flex h-screen print:h-auto print:overflow-visible bg-slate-50 font-sans overflow-hidden print:bg-white">
            <Sidebar
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Main content — add left margin on desktop to account for fixed sidebar space */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-0">

                {/* ── Top Header ── */}
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-10">

                    {/* Left: hamburger (mobile) + breadcrumb */}
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Hamburger — only visible on mobile */}
                        <button
                            onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-lg transition-colors shrink-0"
                            aria-label="Open navigation"
                        >
                            <Menu size={20} />
                        </button>

                        {breadcrumb ? (
                            <>
                                <span className="text-sm text-slate-400 font-medium truncate hidden sm:inline">{breadcrumb[0]}</span>
                                <ChevronRight size={14} className="text-slate-300 shrink-0 hidden sm:inline" />
                                <span className="text-sm font-semibold text-slate-700 truncate">{breadcrumb[1]}</span>
                            </>
                        ) : (
                            <span className="text-sm font-semibold text-slate-700">{pathLabel}</span>
                        )}
                    </div>

                    {/* Right: user pill + logout */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {user && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center gap-2.5 cursor-pointer">
                                        <div className="text-right hidden sm:block leading-none">
                                            <p className="text-xs font-semibold text-slate-800">{user.firstName} {user.lastName}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{roleName}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold border border-emerald-200 uppercase shrink-0">
                                            {user.profilePhotoUrl ? (
                                                <img src={user.profilePhotoUrl} alt="profile" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                `${user.firstName?.[0]}${user.lastName?.[0]}`
                                            )}
                                        </div>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link to="/profile">
                                            <UserCircle className="mr-2 h-4 w-4" />
                                            <span>My Profile</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={logout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 sm:px-2.5 py-1.5 rounded-lg transition text-xs font-medium"
                            title="Sign out"
                        >
                            <LogOut size={15} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </header>

                {/* ── Page content ── */}
                <main className="flex-1 overflow-y-auto print:overflow-visible p-4 sm:p-6 md:p-8 print:p-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};