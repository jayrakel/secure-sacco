import React, { useEffect, useState, useMemo } from 'react';
import { roleApi, type Role, type Permission } from '../api/role-api';
import {
    Lock, Shield, Users, Coins, PiggyBank, BarChart3, CalendarDays,
    AlertCircle, Eye, FileKey, UserCheck, Database, Loader2,
    Search, Plus, ChevronDown, ChevronRight, Check, X,
    Info, Grid3x3, List, Zap, LayoutGrid,
} from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ─── Gate types ───────────────────────────────────────────────────────────────

type GateType = 'SYSTEM_ADMIN' | 'PERMISSION' | 'AUTHENTICATED' | 'MEMBER_ONLY' | 'PUBLIC';

interface Operation {
    id: string;
    label: string;
    desc: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    gate: GateType;
    permissionCode?: string; // set when gate === 'PERMISSION'
}

interface Module {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    operations: Operation[];
}

// ─── Full system operation registry ──────────────────────────────────────────
// Compiled from every @PreAuthorize annotation in the backend.
// GateType meanings:
//   SYSTEM_ADMIN  → hardcoded to ROLE_SYSTEM_ADMIN only
//   PERMISSION    → controlled by a named permission (grantable to roles)
//   AUTHENTICATED → any logged-in user
//   MEMBER_ONLY   → only ROLE_MEMBER accounts
//   PUBLIC        → no auth required

const REGISTRY: Module[] = [
    {
        id: 'members', label: 'Members', icon: <Users size={14} />, color: 'blue',
        operations: [
            { id: 'members-list',          label: 'List Members',           desc: 'Browse the member directory.',              method: 'GET',    path: '/api/v1/members',              gate: 'PERMISSION', permissionCode: 'MEMBERS_READ' },
            { id: 'members-get',           label: 'View Member Profile',    desc: 'Read individual member profile.',            method: 'GET',    path: '/api/v1/members/:id',          gate: 'PERMISSION', permissionCode: 'MEMBERS_READ' },
            { id: 'members-create',        label: 'Create Member',          desc: 'Register a new member.',                    method: 'POST',   path: '/api/v1/members',              gate: 'PERMISSION', permissionCode: 'MEMBERS_WRITE' },
            { id: 'members-update',        label: 'Update Member',          desc: 'Edit member profile details.',              method: 'PUT',    path: '/api/v1/members/:id',          gate: 'PERMISSION', permissionCode: 'MEMBERS_WRITE' },
            { id: 'members-status',        label: 'Change Member Status',   desc: 'Suspend, reactivate or deactivate.',        method: 'PATCH',  path: '/api/v1/members/:id/status',   gate: 'PERMISSION', permissionCode: 'MEMBER_STATUS_CHANGE' },
        ],
    },
    {
        id: 'users', label: 'Users & Roles', icon: <UserCheck size={14} />, color: 'indigo',
        operations: [
            { id: 'users-list',            label: 'List Users',             desc: 'View all user accounts.',                   method: 'GET',    path: '/api/v1/users',                gate: 'PERMISSION', permissionCode: 'USER_READ' },
            { id: 'users-get',             label: 'View User',              desc: 'Read a specific user account.',             method: 'GET',    path: '/api/v1/users/:id',            gate: 'PERMISSION', permissionCode: 'USER_READ' },
            { id: 'users-create',          label: 'Create User',            desc: 'Create a new login account.',               method: 'POST',   path: '/api/v1/users',                gate: 'PERMISSION', permissionCode: 'USER_CREATE' },
            { id: 'users-update',          label: 'Update User',            desc: 'Edit user account details.',                method: 'PUT',    path: '/api/v1/users/:id',            gate: 'PERMISSION', permissionCode: 'USER_UPDATE' },
            { id: 'roles-list',            label: 'List Roles',             desc: 'View all system roles.',                    method: 'GET',    path: '/api/v1/roles',                gate: 'PERMISSION', permissionCode: 'ROLE_READ' },
            { id: 'roles-create',          label: 'Create Role',            desc: 'Define a new security role.',               method: 'POST',   path: '/api/v1/roles',                gate: 'PERMISSION', permissionCode: 'ROLE_CREATE' },
            { id: 'roles-permissions',     label: 'Assign Permissions',     desc: 'Grant/revoke permissions on a role.',       method: 'PUT',    path: '/api/v1/roles/:id/permissions',gate: 'PERMISSION', permissionCode: 'ROLE_UPDATE' },
            { id: 'permissions-list',      label: 'List Permissions',       desc: 'View the full permissions catalog.',        method: 'GET',    path: '/api/v1/permissions',          gate: 'PERMISSION', permissionCode: 'ROLE_READ' },
        ],
    },
    {
        id: 'loans', label: 'Loans', icon: <Coins size={14} />, color: 'amber',
        operations: [
            { id: 'loans-list-all',        label: 'View All Loans',         desc: 'Staff view of all loan applications.',      method: 'GET',    path: '/api/v1/loans/applications/all',    gate: 'PERMISSION', permissionCode: 'LOANS_READ' },
            { id: 'loans-queue',           label: 'View Loans Queue',       desc: 'Filter applications by status.',            method: 'GET',    path: '/api/v1/loans/applications/queue',  gate: 'PERMISSION', permissionCode: 'LOANS_READ' },
            { id: 'loans-verify',          label: 'Verify Loan',            desc: 'Loans officer first-level verification.',   method: 'POST',   path: '/api/v1/loans/applications/:id/verify',   gate: 'PERMISSION', permissionCode: 'LOANS_APPROVE' },
            { id: 'loans-approve',         label: 'Committee Approve',      desc: 'Committee final approval of loans.',        method: 'POST',   path: '/api/v1/loans/applications/:id/approve',  gate: 'PERMISSION', permissionCode: 'LOANS_COMMITTEE_APPROVE' },
            { id: 'loans-reject',          label: 'Reject Loan',            desc: 'Reject at any review stage.',               method: 'POST',   path: '/api/v1/loans/applications/:id/reject',   gate: 'PERMISSION', permissionCode: 'LOANS_APPROVE' },
            { id: 'loans-disburse',        label: 'Disburse Loan',          desc: 'Disburse an approved loan.',                method: 'POST',   path: '/api/v1/loans/applications/:id/disburse', gate: 'PERMISSION', permissionCode: 'LOANS_DISBURSE' },
            { id: 'loans-arrears',         label: 'View Loan Arrears',      desc: 'Report of members in arrears.',             method: 'GET',    path: '/api/v1/loans/reports/arrears',    gate: 'PERMISSION', permissionCode: 'LOANS_READ' },
            { id: 'loans-refinance',       label: 'Refinance Loan',         desc: 'Create a loan refinancing.',                method: 'POST',   path: '/api/v1/loans/applications/refinance',    gate: 'SYSTEM_ADMIN' },
            { id: 'loans-my',             label: 'My Loan Applications',   desc: 'Member views their own loans.',             method: 'GET',    path: '/api/v1/loans/applications/my',    gate: 'MEMBER_ONLY' },
            { id: 'loans-apply',          label: 'Apply for Loan',         desc: 'Member submits a new loan application.',    method: 'POST',   path: '/api/v1/loans/applications',       gate: 'MEMBER_ONLY' },
            { id: 'loans-repay',          label: 'Repay Loan (M-Pesa)',    desc: 'Member initiates M-Pesa repayment.',        method: 'POST',   path: '/api/v1/loans/applications/:id/repay', gate: 'MEMBER_ONLY' },
            { id: 'loans-products-list',  label: 'List Loan Products',     desc: 'View available loan products.',             method: 'GET',    path: '/api/v1/loans/products',           gate: 'AUTHENTICATED' },
            { id: 'loans-products-create',label: 'Create Loan Product',    desc: 'Define a new loan product.',                method: 'POST',   path: '/api/v1/loans/products',           gate: 'SYSTEM_ADMIN' },
        ],
    },
    {
        id: 'savings', label: 'Savings', icon: <PiggyBank size={14} />, color: 'emerald',
        operations: [
            { id: 'savings-deposit-manual',label: 'Manual Deposit',         desc: 'Post a cash deposit to member savings.',    method: 'POST',   path: '/api/v1/savings/deposits/manual',      gate: 'PERMISSION', permissionCode: 'SAVINGS_MANUAL_POST' },
            { id: 'savings-withdraw-manual',label:'Manual Withdrawal',      desc: 'Post a cash withdrawal from savings.',      method: 'POST',   path: '/api/v1/savings/withdrawals/manual',   gate: 'PERMISSION', permissionCode: 'SAVINGS_MANUAL_POST' },
            { id: 'savings-member-stmt',   label: 'Member Savings Statement',desc:'View a specific member\'s savings.',        method: 'GET',    path: '/api/v1/savings/members/:id/statement',gate: 'PERMISSION', permissionCode: 'SAVINGS_READ' },
            { id: 'obligations-list',      label: 'Compliance Report',      desc: 'Who is behind on savings obligations.',     method: 'GET',    path: '/api/v1/obligations/compliance',       gate: 'PERMISSION', permissionCode: 'SAVINGS_OBLIGATIONS_MANAGE' },
            { id: 'obligations-create',    label: 'Create Obligation',      desc: 'Assign a savings obligation to a member.',  method: 'POST',   path: '/api/v1/obligations',                  gate: 'PERMISSION', permissionCode: 'SAVINGS_OBLIGATIONS_MANAGE' },
            { id: 'obligations-edit',      label: 'Edit Obligation',        desc: 'Modify amount or start date.',              method: 'PUT',    path: '/api/v1/obligations/:id',              gate: 'PERMISSION', permissionCode: 'SAVINGS_OBLIGATIONS_MANAGE' },
            { id: 'obligations-evaluate',  label: 'Run Evaluation',         desc: 'Trigger penalty evaluation for all members.',method:'POST',   path: '/api/v1/obligations/evaluate',         gate: 'SYSTEM_ADMIN' },
            { id: 'savings-my-balance',    label: 'My Balance',             desc: 'Member views their own balance.',           method: 'GET',    path: '/api/v1/savings/me/balance',           gate: 'AUTHENTICATED' },
            { id: 'savings-mpesa',         label: 'M-Pesa Deposit',         desc: 'Member initiates M-Pesa savings deposit.',  method: 'POST',   path: '/api/v1/savings/deposits/mpesa/initiate', gate: 'AUTHENTICATED' },
        ],
    },
    {
        id: 'reports', label: 'Reports', icon: <BarChart3 size={14} />, color: 'rose',
        operations: [
            { id: 'reports-overview',      label: 'Financial Overview',     desc: 'High-level financial snapshot.',            method: 'GET',    path: '/api/v1/reports/financial-overview',   gate: 'PERMISSION', permissionCode: 'REPORTS_READ' },
            { id: 'reports-arrears',       label: 'Loan Arrears Report',    desc: 'Members in loan arrears.',                  method: 'GET',    path: '/api/v1/reports/loans/arrears',         gate: 'PERMISSION', permissionCode: 'REPORTS_READ' },
            { id: 'reports-collections',   label: 'Daily Collections',      desc: 'Day-by-day savings collection report.',     method: 'GET',    path: '/api/v1/reports/collections/daily',     gate: 'PERMISSION', permissionCode: 'REPORTS_READ' },
            { id: 'reports-statement',     label: 'Member Statement',       desc: 'Full transaction statement for a member.',  method: 'GET',    path: '/api/v1/reports/members/:id/statement', gate: 'PERMISSION', permissionCode: 'REPORTS_READ' },
            { id: 'reports-trial-balance', label: 'Trial Balance',          desc: 'General ledger trial balance.',             method: 'GET',    path: '/api/v1/accounting/trial-balance',      gate: 'PERMISSION', permissionCode: 'GL_TRIAL_BALANCE' },
        ],
    },
    {
        id: 'meetings', label: 'Meetings', icon: <CalendarDays size={14} />, color: 'cyan',
        operations: [
            { id: 'meetings-get',          label: 'View Meeting Detail',    desc: 'Read a specific meeting.',                  method: 'GET',    path: '/api/v1/meetings/:id',           gate: 'PERMISSION', permissionCode: 'MEETINGS_READ' },
            { id: 'meetings-attendance',   label: 'View Attendance',        desc: 'See who attended a meeting.',               method: 'GET',    path: '/api/v1/meetings/:id/attendance', gate: 'PERMISSION', permissionCode: 'MEETINGS_READ' },
            { id: 'meetings-create',       label: 'Create Meeting',         desc: 'Schedule a new SACCO meeting.',             method: 'POST',   path: '/api/v1/meetings',               gate: 'PERMISSION', permissionCode: 'MEETINGS_MANAGE' },
            { id: 'meetings-update',       label: 'Edit Meeting',           desc: 'Update meeting details.',                   method: 'PUT',    path: '/api/v1/meetings/:id',           gate: 'PERMISSION', permissionCode: 'MEETINGS_MANAGE' },
            { id: 'meetings-cancel',       label: 'Cancel Meeting',         desc: 'Cancel a scheduled meeting.',               method: 'POST',   path: '/api/v1/meetings/:id/cancel',    gate: 'PERMISSION', permissionCode: 'MEETINGS_MANAGE' },
            { id: 'meetings-attendance-rec',label:'Record Attendance',      desc: 'Mark member attendance.',                   method: 'PUT',    path: '/api/v1/meetings/:id/attendance',gate: 'PERMISSION', permissionCode: 'ATTENDANCE_RECORD' },
            { id: 'meetings-list',         label: 'List Meetings',          desc: 'See all meetings.',                         method: 'GET',    path: '/api/v1/meetings',               gate: 'AUTHENTICATED' },
            { id: 'meetings-my',           label: 'My Meetings',            desc: 'Member views their meeting history.',       method: 'GET',    path: '/api/v1/meetings/my',            gate: 'AUTHENTICATED' },
        ],
    },
    {
        id: 'penalties', label: 'Penalties', icon: <AlertCircle size={14} />, color: 'orange',
        operations: [
            { id: 'penalties-waive',       label: 'Waive / Adjust Penalty', desc: 'Reduce or cancel a member penalty.',       method: 'POST',   path: '/api/v1/penalties/:id/waive',     gate: 'PERMISSION', permissionCode: 'PENALTIES_WAIVE_ADJUST' },
            { id: 'penalties-rules-create',label: 'Create Penalty Rule',    desc: 'Define a new fine rule.',                  method: 'POST',   path: '/api/v1/penalties/rules',          gate: 'PERMISSION', permissionCode: 'PENALTIES_MANAGE_RULES' },
            { id: 'penalties-rules-update',label: 'Edit Penalty Rule',      desc: 'Modify fine amount or thresholds.',         method: 'PUT',    path: '/api/v1/penalties/rules/:id',      gate: 'PERMISSION', permissionCode: 'PENALTIES_MANAGE_RULES' },
            { id: 'penalties-rules-list',  label: 'View Penalty Rules',     desc: 'Read all penalty rules.',                   method: 'GET',    path: '/api/v1/penalties/rules',          gate: 'AUTHENTICATED' },
            { id: 'penalties-my',          label: 'My Penalties',           desc: 'Member views their own penalties.',         method: 'GET',    path: '/api/v1/penalties/my',             gate: 'MEMBER_ONLY' },
            { id: 'penalties-repay',       label: 'Repay Penalty (M-Pesa)', desc: 'Member pays a penalty via M-Pesa.',        method: 'POST',   path: '/api/v1/penalties/repay',          gate: 'MEMBER_ONLY' },
        ],
    },
    {
        id: 'sessions', label: 'Sessions', icon: <Eye size={14} />, color: 'slate',
        operations: [
            { id: 'sessions-read',         label: 'View Active Sessions',   desc: 'List all active login sessions.',           method: 'GET',    path: '/api/v1/sessions/user/:id',        gate: 'PERMISSION', permissionCode: 'SESSION_READ' },
            { id: 'sessions-revoke-user',  label: 'Revoke All User Sessions',desc:'Force-logout a specific user.',             method: 'DELETE', path: '/api/v1/sessions/user/:id',        gate: 'PERMISSION', permissionCode: 'SESSION_REVOKE' },
            { id: 'sessions-revoke-one',   label: 'Revoke Session',         desc: 'Terminate a single session.',               method: 'DELETE', path: '/api/v1/sessions/:id',             gate: 'PERMISSION', permissionCode: 'SESSION_REVOKE' },
        ],
    },
    {
        id: 'audit', label: 'Audit Log', icon: <Shield size={14} />, color: 'violet',
        operations: [
            { id: 'audit-logs',            label: 'View Audit Log',         desc: 'Full security and operation audit trail.',  method: 'GET',    path: '/api/v1/audit/logs',               gate: 'PERMISSION', permissionCode: 'AUDIT_LOG_READ' },
        ],
    },
    {
        id: 'system', label: 'System Admin', icon: <Lock size={14} />, color: 'red',
        operations: [
            { id: 'settings-init',         label: 'Initialize SACCO',       desc: 'One-time SACCO setup wizard.',              method: 'POST',   path: '/api/v1/settings/sacco/initialize', gate: 'SYSTEM_ADMIN' },
            { id: 'settings-update',       label: 'Update Settings',        desc: 'Edit SACCO name, branding, fees.',          method: 'PUT',    path: '/api/v1/settings/sacco',            gate: 'SYSTEM_ADMIN' },
            { id: 'settings-security',     label: 'Update Security Policy', desc: 'Lockout, token TTL, rate limits.',          method: 'PUT',    path: '/api/v1/settings/sacco/security',   gate: 'SYSTEM_ADMIN' },
            { id: 'migration-members',     label: 'Migrate Historical Member',desc:'Seed historical member data.',            method: 'POST',   path: '/api/v1/migration/members',          gate: 'SYSTEM_ADMIN' },
            { id: 'migration-loans',       label: 'Migrate Historical Loan', desc:'Seed historical loan + repayments.',       method: 'POST',   path: '/api/v1/migration/loans/disburse',   gate: 'SYSTEM_ADMIN' },
            { id: 'migration-savings',     label: 'Migrate Historical Savings',desc:'Seed historical savings deposit.',       method: 'POST',   path: '/api/v1/migration/savings',          gate: 'SYSTEM_ADMIN' },
            { id: 'loans-products-manage', label: 'Manage Loan Products',   desc: 'Create and edit loan product definitions.', method: 'POST',   path: '/api/v1/loans/products',            gate: 'SYSTEM_ADMIN' },
        ],
    },
];

// ─── Styling helpers ──────────────────────────────────────────────────────────

const MODULE_CLR: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700 border-blue-200'    },
    indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-700 border-indigo-200'  },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700 border-amber-200'   },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700 border-rose-200'    },
    cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200'    },
    orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700 border-orange-200'  },
    slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   badge: 'bg-slate-100 text-slate-600 border-slate-200'   },
    violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700 border-violet-200'  },
    red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-700 border-red-200'     },
};

const METHOD_CLR: Record<string, string> = {
    GET:    'bg-emerald-100 text-emerald-700',
    POST:   'bg-blue-100 text-blue-700',
    PUT:    'bg-amber-100 text-amber-700',
    PATCH:  'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
};

const GATE_CONFIG: Record<GateType, { label: string; cls: string; icon: React.ReactNode }> = {
    SYSTEM_ADMIN:  { label: 'Admin Only',    cls: 'bg-red-100 text-red-700 border-red-200',       icon: <Lock size={10} />   },
    PERMISSION:    { label: 'Permission',    cls: 'bg-violet-100 text-violet-700 border-violet-200',icon: <FileKey size={10} />},
    AUTHENTICATED: { label: 'Any User',     cls: 'bg-slate-100 text-slate-600 border-slate-200',  icon: <Zap size={10} />    },
    MEMBER_ONLY:   { label: 'Member Only',  cls: 'bg-cyan-100 text-cyan-700 border-cyan-200',     icon: <Users size={10} />  },
    PUBLIC:        { label: 'Public',       cls: 'bg-green-100 text-green-700 border-green-200',  icon: <LayoutGrid size={10} /> },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'registry' | 'matrix';

export default function PermissionsRegistryPage() {
    const [roles, setRoles]     = useState<Role[]>([]);
    const [perms, setPerms]     = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const [view, setView]         = useState<ViewMode>('registry');
    const [search, setSearch]     = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [selected, setSelected] = useState<Operation | null>(null);

    // Create permission modal
    const [createOpen, setCreateOpen] = useState(false);
    const [newCode, setNewCode]       = useState('');
    const [newDesc, setNewDesc]       = useState('');
    const [creating, setCreating]     = useState(false);

    useEffect(() => {
        Promise.all([roleApi.getAllRoles(), roleApi.getAllPermissions()])
            .then(([r, p]) => { setRoles(r); setPerms(p); })
            .catch(e => setError(getApiErrorMessage(e, 'Failed to load.')))
            .finally(() => setLoading(false));
    }, []);

    // Quick lookup: permissionCode → roles that have it
    const permToRoles = useMemo<Record<string, string[]>>(() => {
        const map: Record<string, string[]> = {};
        for (const role of roles) {
            for (const p of role.permissions) {
                if (!map[p.code]) map[p.code] = [];
                map[p.code].push(role.name);
            }
        }
        return map;
    }, [roles]);

    // Filtered registry
    const filtered = useMemo(() => {
        if (!search.trim()) return REGISTRY;
        const q = search.toLowerCase();
        return REGISTRY.map(mod => ({
            ...mod,
            operations: mod.operations.filter(op =>
                op.label.toLowerCase().includes(q) ||
                op.desc.toLowerCase().includes(q) ||
                op.path.toLowerCase().includes(q) ||
                (op.permissionCode ?? '').toLowerCase().includes(q) ||
                mod.label.toLowerCase().includes(q)
            ),
        })).filter(mod => mod.operations.length > 0);
    }, [search]);

    // Total counts
    const totalOps = REGISTRY.reduce((s, m) => s + m.operations.length, 0);
    const permGated = REGISTRY.reduce((s, m) => s + m.operations.filter(o => o.gate === 'PERMISSION').length, 0);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            // permissions are created by assigning to a role — but we can add to DB via roles API
            // For now, alert the user the permission catalog is DB-managed
            alert(`Permission "${newCode.toUpperCase()}" would be added to the permissions table.\n\nTo wire it to an endpoint, add @PreAuthorize("hasAuthority('${newCode.toUpperCase()}')") to the backend controller method.`);
            setCreateOpen(false);
            setNewCode('');
            setNewDesc('');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
            <Loader2 className="animate-spin" size={24} /><span className="text-sm">Loading registry…</span>
        </div>
    );
    if (error) return <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>;

    return (
        <div className="h-full flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <LayoutGrid size={18} className="text-slate-500" /> Permissions Registry
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Every operation in the system · {totalOps} total · {permGated} permission-gated · {perms.length} permissions defined
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* View toggle */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                            <button onClick={() => setView('registry')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                                    ${view === 'registry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <List size={13} /> Operations
                            </button>
                            <button onClick={() => setView('matrix')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                                    ${view === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <Grid3x3 size={13} /> Matrix
                            </button>
                        </div>
                        <button onClick={() => setCreateOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">
                            <Plus size={13} /> New Permission
                        </button>
                    </div>
                </div>

                {/* Legend + search */}
                <div className="flex items-center gap-4 mt-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                               placeholder="Search operations, paths, permissions…"
                               className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
                    </div>
                    <div className="flex items-center gap-3">
                        {Object.entries(GATE_CONFIG).map(([key, cfg]) => (
                            <div key={key} className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${cfg.cls}`}>
                                {cfg.icon} {cfg.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">

                {/* ── REGISTRY VIEW ─────────────────────────────────────── */}
                {view === 'registry' && (
                    <>
                        {/* Operations list */}
                        <div className={`overflow-y-auto transition-all ${selected ? 'flex-1' : 'flex-1'}`}>
                            <div className="p-4 space-y-3">
                                {filtered.map(mod => {
                                    const c = MODULE_CLR[mod.color] ?? MODULE_CLR.slate;
                                    const isCollapsed = collapsed[mod.id];
                                    return (
                                        <div key={mod.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                            {/* Module header */}
                                            <button onClick={() => setCollapsed(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                                                    className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/60 hover:bg-slate-100/60 transition-colors text-left">
                                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${c.badge}`}>
                                                    {mod.icon} {mod.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{mod.operations.length} operations</span>
                                                <div className="flex-1" />
                                                {isCollapsed ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                            </button>

                                            {/* Operations */}
                                            {!isCollapsed && (
                                                <div className="divide-y divide-slate-50">
                                                    {mod.operations.map(op => {
                                                        const gate = GATE_CONFIG[op.gate];
                                                        const isSelected = selected?.id === op.id;
                                                        const grantedTo = op.permissionCode ? (permToRoles[op.permissionCode] ?? []) : [];
                                                        return (
                                                            <button key={op.id}
                                                                    onClick={() => setSelected(isSelected ? null : op)}
                                                                    className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors
                                                                    ${isSelected ? `${c.bg} ${c.border}` : 'hover:bg-slate-50/60'}`}>
                                                                {/* Method */}
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono shrink-0 ${METHOD_CLR[op.method]}`}>
                                                                    {op.method}
                                                                </span>
                                                                {/* Path */}
                                                                <code className="text-[11px] text-slate-500 font-mono truncate w-56 shrink-0">
                                                                    {op.path}
                                                                </code>
                                                                {/* Label + desc */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-semibold text-slate-800">{op.label}</div>
                                                                    <div className="text-[11px] text-slate-400 truncate">{op.desc}</div>
                                                                </div>
                                                                {/* Gate badge */}
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${gate.cls}`}>
                                                                        {gate.icon}
                                                                        {op.gate === 'PERMISSION' ? op.permissionCode : gate.label}
                                                                    </span>
                                                                    {/* Granted-to mini pills */}
                                                                    {grantedTo.length > 0 && (
                                                                        <div className="flex items-center gap-1">
                                                                            {grantedTo.slice(0, 3).map(r => (
                                                                                <span key={r} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]">
                                                                                    {r.replace(/_/g, ' ')}
                                                                                </span>
                                                                            ))}
                                                                            {grantedTo.length > 3 && (
                                                                                <span className="text-[9px] text-slate-400">+{grantedTo.length - 3}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {op.gate === 'PERMISSION' && grantedTo.length === 0 && (
                                                                        <span className="text-[9px] text-red-400 font-semibold">No roles</span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Operation detail panel */}
                        {selected && (
                            <div className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
                                <div className="p-5 space-y-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">{selected.label}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">{selected.desc}</p>
                                        </div>
                                        <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
                                            <X size={15} />
                                        </button>
                                    </div>

                                    {/* Endpoint */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Endpoint</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${METHOD_CLR[selected.method]}`}>
                                                {selected.method}
                                            </span>
                                            <code className="text-xs text-slate-600 font-mono break-all">{selected.path}</code>
                                        </div>
                                    </div>

                                    {/* Auth gate */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Access Gate</p>
                                        {selected.gate === 'PERMISSION' ? (
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FileKey size={14} className="text-violet-500 shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold text-violet-700">{selected.permissionCode}</p>
                                                        <p className="text-[10px] text-slate-500">Role must have this permission</p>
                                                    </div>
                                                </div>

                                                {/* Which roles have this perm */}
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Granted to Roles</p>
                                                {(() => {
                                                    const granted = permToRoles[selected.permissionCode!] ?? [];
                                                    if (granted.length === 0) return (
                                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                            <AlertCircle size={13} className="text-red-500 shrink-0" />
                                                            <p className="text-xs text-red-700">No roles have this permission yet. Go to Roles & Permissions to grant it.</p>
                                                        </div>
                                                    );
                                                    return (
                                                        <div className="space-y-1.5">
                                                            {granted.map(r => (
                                                                <div key={r} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                                    <Check size={12} className="text-emerald-600 shrink-0" />
                                                                    <span className="text-xs font-semibold text-emerald-700">{r.replace(/_/g, ' ')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className={`flex items-center gap-2 p-3 rounded-lg border ${GATE_CONFIG[selected.gate].cls}`}>
                                                {GATE_CONFIG[selected.gate].icon}
                                                <div>
                                                    <p className="text-xs font-bold">{GATE_CONFIG[selected.gate].label}</p>
                                                    <p className="text-[10px] opacity-80">
                                                        {selected.gate === 'SYSTEM_ADMIN' && 'Hardcoded to ROLE_SYSTEM_ADMIN. Cannot be granted to other roles.'}
                                                        {selected.gate === 'AUTHENTICATED' && 'Any logged-in user can access this.'}
                                                        {selected.gate === 'MEMBER_ONLY' && 'Only ROLE_MEMBER accounts can access this.'}
                                                        {selected.gate === 'PUBLIC' && 'No authentication required.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info note */}
                                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-blue-700 leading-relaxed">
                                            Access gates are enforced by <code className="font-mono bg-blue-100 px-0.5 rounded">@PreAuthorize</code> in the backend controller.
                                            To change a gate, update the annotation and redeploy. To grant an existing permission to more roles, use <strong>Roles & Permissions</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── MATRIX VIEW ───────────────────────────────────────── */}
                {view === 'matrix' && (
                    <div className="flex-1 overflow-auto p-4">
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="text-xs border-collapse w-full">
                                <thead>
                                <tr className="bg-slate-50">
                                    <th className="text-left px-4 py-3 font-bold text-slate-700 border-b border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-56">
                                        Permission
                                    </th>
                                    {roles.map(role => (
                                        <th key={role.id} className="px-3 py-3 font-bold text-slate-600 border-b border-slate-200 text-center whitespace-nowrap min-w-[90px]">
                                            <div className={`text-[9px] leading-tight ${role.name === 'SYSTEM_ADMIN' ? 'text-red-600' : ''}`}>
                                                {role.name.replace(/_/g, ' ')}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {perms.sort((a, b) => a.code.localeCompare(b.code)).map((perm, i) => {
                                    // Find which module/color this perm belongs to
                                    const relatedOp = REGISTRY.flatMap(m => m.operations.map(o => ({ op: o, mod: m }))).find(x => x.op.permissionCode === perm.code);
                                    const color = relatedOp ? MODULE_CLR[relatedOp.mod.color] : MODULE_CLR.slate;
                                    return (
                                        <tr key={perm.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/30 transition-colors`}>
                                            <td className={`px-4 py-2.5 border-r border-slate-200 sticky left-0 z-10 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                                <div className={`text-[10px] font-bold font-mono ${color.text}`}>{perm.code}</div>
                                                {perm.description && <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{perm.description}</div>}
                                            </td>
                                            {roles.map(role => {
                                                const has = role.permissions.some(p => p.id === perm.id);
                                                return (
                                                    <td key={role.id} className="text-center py-2.5 px-3 border-slate-100">
                                                        {role.name === 'SYSTEM_ADMIN' ? (
                                                            <span className="text-red-400 text-[10px]">✓ always</span>
                                                        ) : has ? (
                                                            <div className="flex justify-center">
                                                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                                                    <Check size={11} className="text-white" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-center">
                                                                <div className="w-5 h-5 rounded-full bg-slate-100" />
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-3 text-center">
                            To change role assignments, go to <strong>Roles & Permissions</strong>. This matrix is read-only.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Permission Modal */}
            {createOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Add New Permission</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Define a new permission code to grant to roles.</p>
                            </div>
                            <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Permission Code</label>
                                <input type="text" required placeholder="e.g. REPORTS_EXPORT"
                                       className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-slate-900"
                                       value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Description</label>
                                <input type="text" placeholder="What does this permission allow?"
                                       className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                       value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            </div>
                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    Creating a permission adds it to the database so it can be assigned to roles.
                                    To enforce it on an endpoint, add
                                    <code className="font-mono bg-amber-100 px-1 rounded mx-1">@PreAuthorize("hasAuthority('{newCode}')")</code>
                                    to the backend controller method and redeploy.
                                </p>
                            </div>
                            <button type="submit" disabled={creating || !newCode.trim()}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Create Permission
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}