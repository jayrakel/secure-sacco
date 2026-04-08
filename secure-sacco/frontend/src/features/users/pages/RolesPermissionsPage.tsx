import React, { useCallback, useEffect, useState } from 'react';
import { roleApi, type Role, type Permission } from '../api/role-api';
import {
    Shield, Plus, Loader2, Save, AlertTriangle, Lock, Check,
    Users, Coins, PiggyBank, BarChart3, CalendarDays, UserCheck,
    FileKey, Settings2, Eye, ShieldAlert, RefreshCw, X,
    ChevronRight, AlertCircle,
} from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ─── Permission metadata ───────────────────────────────────────────────────────
// Maps every permission code → human label + description + UI surface it unlocks.

interface PermMeta {
    label: string;
    desc: string;
    unlocks: string;
    group: string;
    groupIcon: React.ReactNode;
    groupColor: string;
}

const PERM_META: Record<string, PermMeta> = {
    // Members
    MEMBERS_READ:         { label: 'View Members',             desc: 'Browse the member directory and view profiles.',              unlocks: 'Members page in sidebar',                   group: 'Members',   groupIcon: <Users size={13} />,       groupColor: 'blue'    },
    MEMBERS_WRITE:        { label: 'Create & Edit Members',    desc: 'Register new members and update existing profiles.',          unlocks: 'Members → Create / Edit buttons',           group: 'Members',   groupIcon: <Users size={13} />,       groupColor: 'blue'    },
    MEMBER_READ:          { label: 'Member Profile Detail',    desc: 'View individual member profile data.',                       unlocks: 'Member profile modal',                      group: 'Members',   groupIcon: <Users size={13} />,       groupColor: 'blue'    },
    MEMBER_CREATE:        { label: 'Register Member',          desc: 'Create new member records.',                                 unlocks: 'Create Member button',                      group: 'Members',   groupIcon: <Users size={13} />,       groupColor: 'blue'    },
    MEMBER_UPDATE:        { label: 'Edit Member',              desc: 'Modify existing member records.',                            unlocks: 'Edit Member button',                        group: 'Members',   groupIcon: <Users size={13} />,       groupColor: 'blue'    },
    MEMBER_STATUS_CHANGE: { label: 'Change Member Status',     desc: 'Suspend, reactivate, or mark members inactive.',            unlocks: 'Members → status change controls',          group: 'Members',   groupIcon: <Users size={13} />,       groupColor: 'blue'    },
    // Users
    USER_READ:            { label: 'View Users',               desc: 'Access the Users management page and see account list.',      unlocks: 'Users page in sidebar',                     group: 'Users',     groupIcon: <UserCheck size={13} />,   groupColor: 'indigo'  },
    USER_CREATE:          { label: 'Create Users',             desc: 'Create new login accounts and assign them to members.',      unlocks: 'Users → Create User button',                group: 'Users',     groupIcon: <UserCheck size={13} />,   groupColor: 'indigo'  },
    USER_UPDATE:          { label: 'Edit Users',               desc: 'Update user account details and reset passwords.',           unlocks: 'Users → Edit User button',                  group: 'Users',     groupIcon: <UserCheck size={13} />,   groupColor: 'indigo'  },
    // Roles
    ROLE_READ:            { label: 'View Roles',               desc: 'Access the Roles & Permissions management page.',            unlocks: 'Roles & Permissions page in sidebar',        group: 'Roles',     groupIcon: <FileKey size={13} />,     groupColor: 'violet'  },
    ROLE_CREATE:          { label: 'Create Roles',             desc: 'Define new security roles.',                                 unlocks: 'Roles → Add New Role button',               group: 'Roles',     groupIcon: <FileKey size={13} />,     groupColor: 'violet'  },
    ROLE_UPDATE:          { label: 'Edit Role Permissions',    desc: 'Assign and remove permissions from existing roles.',         unlocks: 'Roles → toggle permissions + save',         group: 'Roles',     groupIcon: <FileKey size={13} />,     groupColor: 'violet'  },
    // Loans
    LOANS_READ:              { label: 'View Loans',               desc: 'View all loan applications and their status.',            unlocks: 'Loans page in sidebar',                     group: 'Loans',     groupIcon: <Coins size={13} />,       groupColor: 'amber'   },
    LOANS_APPROVE:           { label: 'Verify Loans',             desc: 'First-level loans officer verification.',                 unlocks: 'Loans → Verify button',                     group: 'Loans',     groupIcon: <Coins size={13} />,       groupColor: 'amber'   },
    LOANS_COMMITTEE_APPROVE: { label: 'Committee Approve Loans',  desc: 'Committee-level approval of verified loans.',             unlocks: 'Loans → Committee Approve button',          group: 'Loans',     groupIcon: <Coins size={13} />,       groupColor: 'amber'   },
    LOANS_DISBURSE:          { label: 'Disburse Loans',           desc: 'Disburse committee-approved loans to members.',           unlocks: 'Loans → Disburse button',                   group: 'Loans',     groupIcon: <Coins size={13} />,       groupColor: 'amber'   },
    // Savings
    SAVINGS_READ:                { label: 'View Savings',          desc: 'View savings accounts and transaction history.',          unlocks: 'Savings page in sidebar',                   group: 'Savings',   groupIcon: <PiggyBank size={13} />,   groupColor: 'emerald' },
    SAVINGS_MANUAL_POST:         { label: 'Post Manual Transactions', desc: 'Record cash deposits and withdrawals.',               unlocks: 'Savings → Deposit / Withdraw buttons',      group: 'Savings',   groupIcon: <PiggyBank size={13} />,   groupColor: 'emerald' },
    SAVINGS_OBLIGATIONS_MANAGE:  { label: 'Manage Savings Compliance', desc: 'Create and edit member savings obligations.',        unlocks: 'Savings Compliance page in sidebar',         group: 'Savings',   groupIcon: <PiggyBank size={13} />,   groupColor: 'emerald' },
    SAVINGS_OBLIGATIONS_READ:    { label: 'View Own Obligations',  desc: 'Member can view their own savings obligations.',         unlocks: 'My Account → savings obligation card',      group: 'Savings',   groupIcon: <PiggyBank size={13} />,   groupColor: 'emerald' },
    // Reports
    REPORTS_READ:         { label: 'View Reports',             desc: 'Access financial reports, statements and analytics.',        unlocks: 'Reports in sidebar + all report pages',     group: 'Reports',   groupIcon: <BarChart3 size={13} />,   groupColor: 'rose'    },
    GL_TRIAL_BALANCE:     { label: 'Trial Balance',            desc: 'View the general ledger trial balance.',                    unlocks: 'Accounting → Trial Balance',                group: 'Reports',   groupIcon: <BarChart3 size={13} />,   groupColor: 'rose'    },
    // Meetings
    MEETINGS_READ:        { label: 'View Meetings',            desc: 'View the meetings calendar and schedule.',                  unlocks: 'Meetings page in sidebar',                  group: 'Meetings',  groupIcon: <CalendarDays size={13} />, groupColor: 'cyan'    },
    MEETINGS_MANAGE:      { label: 'Manage Meetings',          desc: 'Create, edit and cancel meetings.',                         unlocks: 'Meetings → Create Meeting, edit',           group: 'Meetings',  groupIcon: <CalendarDays size={13} />, groupColor: 'cyan'    },
    ATTENDANCE_RECORD:    { label: 'Record Attendance',        desc: 'Mark member presence at meetings.',                         unlocks: 'Meetings → Take Attendance button',         group: 'Meetings',  groupIcon: <CalendarDays size={13} />, groupColor: 'cyan'    },
    // Penalties
    PENALTIES_WAIVE_ADJUST: { label: 'Waive / Adjust Penalties', desc: 'Waive or reduce penalties on member accounts.',          unlocks: 'Penalties → Waive button',                  group: 'Penalties', groupIcon: <AlertCircle size={13} />, groupColor: 'orange'  },
    // Sessions
    SESSION_READ:         { label: 'View Sessions',            desc: 'See all active user sessions.',                             unlocks: 'Security page → active sessions list',      group: 'Sessions',  groupIcon: <Eye size={13} />,          groupColor: 'slate'   },
    SESSION_REVOKE:       { label: 'Terminate Sessions',       desc: 'Force-logout users by revoking their sessions.',            unlocks: 'Security page → Terminate button',          group: 'Sessions',  groupIcon: <Eye size={13} />,          groupColor: 'slate'   },
    // Admin tools
    AUDIT_LOG_READ:          { label: 'View Audit Log',          desc: 'Read the full security and operations audit trail.',        unlocks: 'Audit Log page in sidebar',                  group: 'Admin',     groupIcon: <ShieldAlert size={13} />, groupColor: 'red'     },
    PENALTIES_MANAGE_RULES:  { label: 'Manage Penalty Rules',    desc: 'Create and edit penalty fine amounts and thresholds.',      unlocks: 'Settings → Penalties tab',                   group: 'Admin',     groupIcon: <ShieldAlert size={13} />, groupColor: 'red'     },
};

const GROUP_ORDER = ['Members', 'Users', 'Roles', 'Loans', 'Savings', 'Reports', 'Meetings', 'Penalties', 'Sessions', 'Admin'];

const CLR: Record<string, { bg: string; border: string; text: string; badge: string; sw: string }> = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700 border-blue-200',    sw: 'bg-blue-500'    },
    indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',  sw: 'bg-indigo-500'  },
    violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700 border-violet-200',  sw: 'bg-violet-500'  },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700 border-amber-200',   sw: 'bg-amber-500'   },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', sw: 'bg-emerald-500' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700 border-rose-200',    sw: 'bg-rose-500'    },
    cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',    sw: 'bg-cyan-500'    },
    orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700 border-orange-200',  sw: 'bg-orange-500'  },
    slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   badge: 'bg-slate-100 text-slate-600 border-slate-200',   sw: 'bg-slate-500'   },
    red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-700 border-red-200',         sw: 'bg-red-500'     },
};

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle: React.FC<{ on: boolean; onChange: () => void; disabled?: boolean; sw: string }> = ({ on, onChange, disabled = false, sw }) => (
    <button
        type="button" role="switch" aria-checked={on} disabled={disabled}
        onClick={e => { e.stopPropagation(); onChange(); }}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none
            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            ${on ? sw : 'bg-slate-200'}`}
    >
        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm
            transform transition-transform duration-200 ease-in-out ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
);

// ── Role color map ────────────────────────────────────────────────────────────
const ROLE_CLR: Record<string, string> = {
    SYSTEM_ADMIN: 'border-red-200 bg-red-50 text-red-700',
    CHAIRPERSON: 'border-violet-200 bg-violet-50 text-violet-700',
    DEPUTY_CHAIRPERSON: 'border-violet-200 bg-violet-50 text-violet-600',
    TREASURER: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    DEPUTY_TREASURER: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    SECRETARY: 'border-blue-200 bg-blue-50 text-blue-700',
    DEPUTY_SECRETARY: 'border-blue-200 bg-blue-50 text-blue-600',
    ACCOUNTANT: 'border-amber-200 bg-amber-50 text-amber-700',
    DEPUTY_ACCOUNTANT: 'border-amber-200 bg-amber-50 text-amber-600',
    CASHIER: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    DEPUTY_CASHIER: 'border-cyan-200 bg-cyan-50 text-cyan-600',
    LOAN_OFFICER: 'border-orange-200 bg-orange-50 text-orange-700',
    DEPUTY_LOAN_OFFICER: 'border-orange-200 bg-orange-50 text-orange-600',
};

// ─── Principal → Deputy sync map ─────────────────────────────────────────────
// When an admin saves permissions for a principal role, the deputy role is
// automatically synced to the SAME permission set with a second silent API call.
// This means you only ever need to configure the principal — deputies follow.
const DEPUTY_SYNC: Record<string, string> = {
    CHAIRPERSON:  'DEPUTY_CHAIRPERSON',
    TREASURER:    'DEPUTY_TREASURER',
    SECRETARY:    'DEPUTY_SECRETARY',
    ACCOUNTANT:   'DEPUTY_ACCOUNTANT',
    CASHIER:      'DEPUTY_CASHIER',
    LOAN_OFFICER: 'DEPUTY_LOAN_OFFICER',
};

// ─── Main page component ──────────────────────────────────────────────────────

export default function RolesPermissionsPage() {
    const [roles, setRoles]         = useState<Role[]>([]);
    const [allPerms, setAllPerms]   = useState<Permission[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');

    const [selectedRole, setSelected] = useState<Role | null>(null);
    const [editedIds, setEditedIds]   = useState<Set<string>>(new Set());
    const [saving, setSaving]         = useState(false);
    const [savedResult, setSavedResult] = useState<'ok' | 'err' | null>(null);
    const [savedMsg, setSavedMsg]     = useState('');
    const [syncedDeputy, setSyncedDeputy] = useState<string | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName]       = useState('');
    const [newDesc, setNewDesc]       = useState('');
    const [creating, setCreating]     = useState(false);
    const [search, setSearch]         = useState('');

    const selectRole = useCallback((role: Role) => {
        setSelected(role);
        setEditedIds(new Set(role.permissions.map(p => p.id)));
        setSavedResult(null);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [r, p] = await Promise.all([roleApi.getAllRoles(), roleApi.getAllPermissions()]);
            setRoles(r); setAllPerms(p);
            if (r.length > 0) selectRole(r[0]);
        } catch (e) { setError(getApiErrorMessage(e, 'Failed to load.')); }
        finally { setLoading(false); }
    }, [selectRole]);

    useEffect(() => { void load(); }, [load]);

    const toggle = (id: string) => {
        if (selectedRole?.name === 'SYSTEM_ADMIN') return;
        setEditedIds(prev => {
            const s = new Set(prev);
            if (s.has(id)) {
                s.delete(id);
            } else {
                s.add(id);
            }
            return s;
        });
        setSavedResult(null);
    };

    const save = async () => {
        if (!selectedRole) return;
        setSaving(true);
        setSyncedDeputy(null);
        try {
            const permIds = [...editedIds];

            // 1. Save the principal role
            await roleApi.updateRolePermissions(selectedRole.id, permIds);
            const updated: Role = { ...selectedRole, permissions: allPerms.filter(p => editedIds.has(p.id)) };
            setRoles(prev => prev.map(r => r.id === selectedRole.id ? updated : r));
            setSelected(updated);

            // 2. Auto-sync deputy if this is a principal role
            const deputyName = DEPUTY_SYNC[selectedRole.name];
            let deputySynced = false;
            if (deputyName) {
                const deputyRole = roles.find(r => r.name === deputyName);
                if (deputyRole) {
                    await roleApi.updateRolePermissions(deputyRole.id, permIds);
                    // Update deputy in local state too
                    const updatedDeputy: Role = { ...deputyRole, permissions: allPerms.filter(p => editedIds.has(p.id)) };
                    setRoles(prev => prev.map(r => r.id === deputyRole.id ? updatedDeputy : r));
                    setSyncedDeputy(deputyName.replace(/_/g, ' '));
                    deputySynced = true;
                }
            }

            setSavedResult('ok');
            setSavedMsg(
                deputySynced
                    ? `${selectedRole.name.replace(/_/g, ' ')} saved and ${deputyName!.replace(/_/g, ' ')} automatically synced.`
                    : `${selectedRole.name.replace(/_/g, ' ')} permissions updated.`
            );
        } catch (e) { setSavedResult('err'); setSavedMsg(getApiErrorMessage(e, 'Save failed.')); }
        finally { setSaving(false); }
    };

    const createRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const role = await roleApi.createRole({ name: newName.toUpperCase().replace(/\s+/g, '_'), description: newDesc, permissionIds: [] });
            setRoles(prev => [...prev, role]);
            setCreateOpen(false); setNewName(''); setNewDesc('');
            selectRole(role);
        } catch (e) { alert(getApiErrorMessage(e, 'Failed to create role.')); }
        finally { setCreating(false); }
    };

    const grouped = React.useMemo(() => {
        const q = search.toLowerCase();
        const out: Record<string, Permission[]> = {};
        for (const p of allPerms) {
            const m = PERM_META[p.code];
            if (!m) continue;
            if (q && !m.label.toLowerCase().includes(q) && !m.group.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) continue;
            if (!out[m.group]) out[m.group] = [];
            out[m.group].push(p);
        }
        return out;
    }, [allPerms, search]);

    const isAdmin    = selectedRole?.name === 'SYSTEM_ADMIN';
    const hasChanges = !!selectedRole && (
        selectedRole.permissions.length !== editedIds.size ||
        !selectedRole.permissions.every(p => editedIds.has(p.id))
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
            <Loader2 className="animate-spin" size={28} /><span className="text-sm">Loading roles…</span>
        </div>
    );
    if (error) return <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>;

    return (
        <div className="h-full flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Shield size={18} className="text-slate-500" /> Roles & Permissions
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Grant or revoke permissions per role. Changes take effect immediately on next session load — no restart required.
                    </p>
                </div>
                <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors">
                    <Plus size={14} /> New Role
                </button>
            </div>

            {/* Save banner */}
            {savedResult && (
                <div className={`mx-6 mt-3 flex items-start gap-3 px-4 py-3 rounded-lg border text-sm shrink-0
                    ${savedResult === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {savedResult === 'ok'
                        ? <Check size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                        : <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />}
                    <span className="flex-1 text-xs">{savedMsg}</span>
                    {savedResult === 'ok' && syncedDeputy && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold shrink-0 flex items-center gap-1">
                            <RefreshCw size={9} /> {syncedDeputy} synced
                        </span>
                    )}
                    <button onClick={() => setSavedResult(null)} className="opacity-40 hover:opacity-100"><X size={13} /></button>
                </div>
            )}

            {/* Body: two columns */}
            <div className="flex flex-1 min-h-0">

                {/* Left: role list */}
                <aside className="w-60 shrink-0 border-r border-slate-100 flex flex-col bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-3 pb-2">System Roles</p>
                    <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                        {roles.map(role => {
                            const selected = selectedRole?.id === role.id;
                            const clr      = ROLE_CLR[role.name] ?? 'border-slate-200 bg-slate-50 text-slate-700';
                            return (
                                <button key={role.id} onClick={() => selectRole(role)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all
                                        ${selected ? clr + ' shadow-sm' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {role.name === 'SYSTEM_ADMIN'
                                                ? <Lock size={12} className="text-red-500 shrink-0" />
                                                : <Shield size={12} className="text-slate-400 shrink-0" />}
                                            <span className="text-xs font-semibold truncate">{role.name.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Show sync icon on principal roles */}
                                            {DEPUTY_SYNC[role.name] && (
                                                <span
                                                    title={`Saves auto-sync to ${DEPUTY_SYNC[role.name]?.replace(/_/g, ' ')}`}
                                                    className={`${selected ? 'text-current opacity-60' : 'text-emerald-500 opacity-70'} cursor-help`}
                                                >
                                                    <RefreshCw size={9} />
                                                </span>
                                            )}
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded
                                                ${selected ? 'bg-white/70' : 'bg-slate-100 text-slate-500'}`}>
                                                {role.permissions.length}
                                            </span>
                                        </div>
                                    </div>
                                    {role.description && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 truncate pl-[17px]">{role.description}</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Right: permission editor */}
                {selectedRole ? (
                    <div className="flex-1 min-w-0 flex flex-col bg-slate-50/30">

                        {/* Panel header */}
                        <div className="flex items-center gap-3 justify-between px-6 py-3.5 border-b border-slate-100 bg-white shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                    {selectedRole.name.replace(/_/g, ' ')}
                                    {isAdmin && (
                                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                            <Lock size={8} /> Immutable
                                        </span>
                                    )}
                                    {!isAdmin && hasChanges && (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                            <AlertCircle size={8} /> Unsaved changes
                                        </span>
                                    )}
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {editedIds.size} permission{editedIds.size !== 1 ? 's' : ''} active
                                    {!isAdmin && ' · Click any card to toggle'}
                                </p>
                                {/* Deputy sync notice */}
                                {DEPUTY_SYNC[selectedRole.name] && (
                                    <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                                        <RefreshCw size={10} className="shrink-0" />
                                        Saving will automatically sync&nbsp;
                                        <strong>{DEPUTY_SYNC[selectedRole.name]?.replace(/_/g, ' ')}</strong>
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                       placeholder="Search…"
                                       className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700
                                               placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 w-36" />
                                <button onClick={save} disabled={!hasChanges || saving || isAdmin}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                                        ${hasChanges && !isAdmin
                                            ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    {saving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>

                        {/* System admin warning */}
                        {isAdmin && (
                            <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700 shrink-0">
                                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-red-500" />
                                <strong>SYSTEM_ADMIN</strong>&nbsp;has implicit access to everything and cannot be restricted.
                            </div>
                        )}

                        {/* Permission groups */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
                            {GROUP_ORDER.filter(g => grouped[g]?.length).map(gName => {
                                const perms  = grouped[gName];
                                const meta0  = PERM_META[perms[0].code];
                                const color  = meta0?.groupColor ?? 'slate';
                                const c      = CLR[color] ?? CLR.slate;
                                const active = perms.filter(p => editedIds.has(p.id)).length;

                                return (
                                    <div key={gName}>
                                        {/* Group header */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${c.badge}`}>
                                                {meta0?.groupIcon} {gName}
                                            </span>
                                            <div className="flex-1 h-px bg-slate-200" />
                                            <span className="text-[10px] text-slate-400">{active}/{perms.length} active</span>
                                        </div>

                                        {/* Cards grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                            {perms.map(perm => {
                                                const m   = PERM_META[perm.code];
                                                const on  = editedIds.has(perm.id);
                                                return (
                                                    <div key={perm.id}
                                                         onClick={() => !isAdmin && toggle(perm.id)}
                                                         className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all
                                                            ${isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                                            ${on ? `${c.bg} ${c.border}` : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'}`}>
                                                        <div className="pt-0.5">
                                                            <Toggle on={on} onChange={() => toggle(perm.id)} disabled={isAdmin} sw={c.sw} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-xs font-bold ${on ? c.text : 'text-slate-700'}`}>
                                                                {m?.label ?? perm.code}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                                {m?.desc ?? perm.description}
                                                            </div>
                                                            {m?.unlocks && (
                                                                <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-medium
                                                                    ${on ? c.text : 'text-slate-400'}`}>
                                                                    <ChevronRight size={10} className="shrink-0" />
                                                                    {m.unlocks}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Unmapped permissions */}
                            {(() => {
                                const unknown = allPerms.filter(p => !PERM_META[p.code]);
                                if (!unknown.length) return null;
                                return (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold bg-slate-100 text-slate-600 border-slate-200">
                                                <Settings2 size={12} /> Other
                                            </span>
                                            <div className="flex-1 h-px bg-slate-200" />
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                            {unknown.map(p => {
                                                const on = editedIds.has(p.id);
                                                return (
                                                    <div key={p.id} onClick={() => !isAdmin && toggle(p.id)}
                                                         className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all
                                                            ${on ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                        <div className="pt-0.5"><Toggle on={on} onChange={() => toggle(p.id)} disabled={isAdmin} sw={CLR.slate.sw} /></div>
                                                        <div><div className="text-xs font-bold text-slate-700">{p.code}</div>{p.description && <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {!Object.keys(grouped).length && search && (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    No permissions match &ldquo;{search}&rdquo;
                                </div>
                            )}

                            {/* Refresh note */}
                            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <RefreshCw size={13} className="text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    <strong>How changes propagate:</strong> Permissions are saved to the database immediately.
                                    {DEPUTY_SYNC[selectedRole.name] && (
                                        <> Saving <strong>{selectedRole.name.replace(/_/g, ' ')}</strong> will
                                            automatically sync <strong>{DEPUTY_SYNC[selectedRole.name]?.replace(/_/g, ' ')}</strong> in
                                            the same operation — no second save needed.</>
                                    )}
                                    {' '}Users see updated sidebar links and controls on their next page refresh or login.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <div className="text-center">
                            <Shield size={36} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Select a role to configure its permissions</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Role Modal */}
            {createOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Create New Role</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Define a new access profile for the SACCO.</p>
                            </div>
                            <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
                        </div>
                        <form onSubmit={createRole} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Role Name</label>
                                <input type="text" required placeholder="e.g. HR_MANAGER"
                                       className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-900"
                                       value={newName} onChange={e => setNewName(e.target.value)} />
                                <p className="text-[10px] text-slate-400 mt-1">Stored uppercase with underscores.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Description</label>
                                <textarea rows={3} placeholder="Describe what this role can do…"
                                          className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                                          value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            </div>
                            <button type="submit" disabled={creating || !newName.trim()}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {creating ? 'Creating…' : 'Create Role'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}