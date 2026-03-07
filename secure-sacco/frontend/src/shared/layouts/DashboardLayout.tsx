import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { LogOut, ChevronRight } from 'lucide-react';

// ─── Derive a readable page title from the current path ─────────────────────
const PAGE_LABELS: Record<string, string> = {
    '/dashboard':              'Dashboard',
    '/users':                  'User Management',
    '/roles':                  'Roles & Permissions',
    '/members':                'Member Directory',
    '/savings':                'Savings Management',
    '/loans':                  'Loan Management',
    '/my-loans':               'My Loans',
    '/my-savings':             'My Savings',
    '/my-penalties':           'My Penalties',
    '/my-reports':             'My Reports',
    '/my-meetings':            'My Meetings',
    '/meetings':               'Meetings',
    '/reports':                'Reports & Analytics',
    '/reports/statements':     'Member Statements',
    '/reports/arrears':        'Loan Arrears',
    '/reports/collections':    'Daily Collections',
    '/reports/income':         'Income Report',
    '/accounting/accounts':    'Chart of Accounts',
    '/accounting/journals':    'Journal Entries',
    '/security':               'Security Settings',
    '/settings':               'Platform Settings',
};

export const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const pathLabel = PAGE_LABELS[location.pathname] ?? 'Dashboard';

    // Build a simple breadcrumb: "Reports / Income Report"
    const parts = location.pathname.split('/').filter(Boolean);
    const breadcrumb = parts.length > 1
        ? [PAGE_LABELS[`/${parts[0]}`] ?? parts[0], pathLabel]
        : null;

    const roleName = user?.roles?.[0]?.replace('ROLE_', '').replace(/_/g, ' ') ?? 'User';

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">

                {/* ── Top Header ── */}
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">

                    {/* Left: breadcrumb / page title */}
                    <div className="flex items-center gap-2 min-w-0">
                        {breadcrumb ? (
                            <>
                                <span className="text-sm text-slate-400 font-medium truncate">{breadcrumb[0]}</span>
                                <ChevronRight size={14} className="text-slate-300 shrink-0" />
                                <span className="text-sm font-semibold text-slate-700 truncate">{breadcrumb[1]}</span>
                            </>
                        ) : (
                            <span className="text-sm font-semibold text-slate-700">{pathLabel}</span>
                        )}
                    </div>

                    {/* Right: user pill + logout */}
                    <div className="flex items-center gap-3 shrink-0">
                        {user && (
                            <div className="flex items-center gap-2.5">
                                <div className="text-right hidden sm:block leading-none">
                                    <p className="text-xs font-semibold text-slate-800">{user.firstName} {user.lastName}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{roleName}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold border border-emerald-200 uppercase shrink-0">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                </div>
                            </div>
                        )}

                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition text-xs font-medium"
                            title="Sign out"
                        >
                            <LogOut size={15} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </header>

                {/* ── Page content ── */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};