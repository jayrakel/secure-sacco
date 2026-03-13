import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, CheckCircle2, Circle, Lock, Mail, Phone,
    Users, Settings, ArrowRight, Loader2, Eye, EyeOff,
    AlertTriangle, RefreshCw, Plus, Trash2, ChevronRight
} from 'lucide-react';
import apiClient from '../../../shared/api/api-client';
import { setupApi } from '../api/setup-api';
import type { SetupPhase } from '../api/setup-api';
import { useSetup } from '../context/SetupContext';
import { useAuth } from '../../auth/context/AuthProvider';

// ── Types ────────────────────────────────────────────────────────────────────

interface OfficerForm {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    roleId: string;
}

interface Role {
    id: string;
    name: string;
    description: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const OFFICER_ROLES = [
    'CHAIRPERSON', 'DEPUTY_CHAIRPERSON',
    'SECRETARY', 'DEPUTY_SECRETARY',
    'TREASURER', 'DEPUTY_TREASURER',
    'ACCOUNTANT', 'DEPUTY_ACCOUNTANT',
    'CASHIER', 'DEPUTY_CASHIER',
    'LOAN_OFFICER', 'DEPUTY_LOAN_OFFICER',
];

const REQUIRED_ROLES = ['CHAIRPERSON', 'SECRETARY', 'TREASURER', 'LOAN_OFFICER'];

const fmtRole = (n: string) =>
    n.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const inp = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white';
const btn = (variant: 'primary' | 'ghost' = 'primary') =>
    variant === 'primary'
        ? 'inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed'
        : 'inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition';

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { phase: SetupPhase; label: string; icon: React.ElementType }[] = [
    { phase: 'VERIFY_CONTACT',      label: 'Verify Identity',    icon: Phone },
    { phase: 'CREATE_OFFICERS',     label: 'Create Officers',    icon: Users },
    { phase: 'CONFIGURE_PLATFORM',  label: 'Configure Platform', icon: Settings },
];

const StepIndicator: React.FC<{ current: SetupPhase }> = ({ current }) => {
    const order: SetupPhase[] = ['VERIFY_CONTACT', 'CREATE_OFFICERS', 'CONFIGURE_PLATFORM', 'COMPLETE'];
    const currentIdx = order.indexOf(current);

    return (
        <div className="flex items-center gap-0 mb-10">
            {STEPS.map((step, i) => {
                const stepIdx = order.indexOf(step.phase);
                const done    = stepIdx < currentIdx;
                const active  = stepIdx === currentIdx;
                const Icon    = step.icon;
                return (
                    <React.Fragment key={step.phase}>
                        <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                                    active ? 'bg-white border-emerald-500 text-emerald-600 shadow-md' :
                                        'bg-white border-slate-200 text-slate-300'
                            }`}>
                                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                            </div>
                            <span className={`text-xs font-medium ${active ? 'text-emerald-700' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 -mt-5 transition-all ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ── Step 1: Verify Contact ─────────────────────────────────────────────────────

const VerifyContactStep: React.FC<{ onDone: () => void }> = ({ onDone }) => {
    const { user, refreshUser } = useAuth();
    const [emailSent,    setEmailSent]    = useState(false);
    const [emailToken,   setEmailToken]   = useState('');
    const [emailDone,    setEmailDone]    = useState(user?.emailVerified ?? false);
    const [phoneSent,    setPhoneSent]    = useState(false);
    const [phoneOtp,     setPhoneOtp]     = useState('');
    const [phoneDone,    setPhoneDone]    = useState(user?.phoneVerified ?? false);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState('');
    const [successMsg,   setSuccessMsg]   = useState('');

    const act = async (fn: () => Promise<void>) => {
        setLoading(true); setError(''); setSuccessMsg('');
        try { await fn(); } catch (e: any) {
            setError(e.response?.data?.message || e.message || 'Something went wrong.');
        } finally { setLoading(false); }
    };

    const sendEmail = () => act(async () => {
        await setupApi.sendEmailVerification(); setEmailSent(true);
        setSuccessMsg('Verification email sent — check your inbox.');
    });
    const confirmEmail = () => act(async () => {
        await setupApi.confirmEmail(emailToken.trim());
        setEmailDone(true); await refreshUser();
        setSuccessMsg('Email verified ✓');
    });
    const sendPhone = () => act(async () => {
        await setupApi.sendPhoneOtp(); setPhoneSent(true);
        setSuccessMsg('OTP sent to your registered phone.');
    });
    const confirmPhone = () => act(async () => {
        await setupApi.confirmPhone(phoneOtp.trim());
        setPhoneDone(true); await refreshUser();
        setSuccessMsg('Phone verified ✓');
    });

    const canContinue = emailDone && phoneDone;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Verify Your Identity</h2>
                <p className="text-sm text-slate-500 mt-1">Confirm your email address and phone number before proceeding.</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}
            {successMsg && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
                </div>
            )}

            {/* Email */}
            <div className={`rounded-2xl border-2 p-5 transition-all ${emailDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Mail className={`w-4 h-4 ${emailDone ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-900 text-sm">Email Address</span>
                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{user?.email}</code>
                    </div>
                    {emailDone && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Verified ✓</span>}
                </div>
                {!emailDone && (
                    <div className="space-y-3">
                        {!emailSent ? (
                            <button onClick={sendEmail} disabled={loading} className={btn()}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                Send Verification Email
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <input value={emailToken} onChange={e => setEmailToken(e.target.value)} className={inp}
                                       placeholder="Paste the token from your email..." />
                                <button onClick={confirmEmail} disabled={loading || !emailToken.trim()} className={btn()}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                                </button>
                            </div>
                        )}
                        {emailSent && (
                            <button onClick={sendEmail} disabled={loading} className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" /> Resend email
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Phone */}
            <div className={`rounded-2xl border-2 p-5 transition-all ${phoneDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Phone className={`w-4 h-4 ${phoneDone ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-900 text-sm">Phone Number</span>
                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{user?.phoneNumber ?? '—'}</code>
                    </div>
                    {phoneDone && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Verified ✓</span>}
                </div>
                {!phoneDone && (
                    <div className="space-y-3">
                        {!phoneSent ? (
                            <button onClick={sendPhone} disabled={loading} className={btn()}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                                Send OTP to Phone
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <input value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)} className={`${inp} tracking-[0.3em] font-mono text-lg`}
                                       placeholder="000000" maxLength={6} />
                                <button onClick={confirmPhone} disabled={loading || phoneOtp.length < 6} className={btn()}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                                </button>
                            </div>
                        )}
                        {phoneSent && (
                            <button onClick={sendPhone} disabled={loading} className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" /> Resend OTP
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button onClick={onDone} disabled={!canContinue} className={btn()}>
                    Continue <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ── Step 2: Create Officers ────────────────────────────────────────────────────

const CreateOfficersStep: React.FC<{ missingRoles: string[]; onDone: () => void }> = ({ missingRoles, onDone }) => {
    const [roles,    setRoles]    = useState<Role[]>([]);
    const [officers, setOfficers] = useState<OfficerForm[]>([
        { id: '1', firstName: '', lastName: '', email: '', phone: '', roleId: '' },
    ]);
    const [loading,  setLoading]  = useState(false);
    const [saving,   setSaving]   = useState<string | null>(null);
    const [saved,    setSaved]    = useState<Set<string>>(new Set());
    const [error,    setError]    = useState('');

    useEffect(() => {
        apiClient.get<Role[]>('/roles').then(r => {
            setRoles(r.data.filter(role => OFFICER_ROLES.includes(role.name)));
        }).catch(() => setError('Failed to load roles.'));
    }, []);

    const addOfficer = () => setOfficers(prev => [
        ...prev, { id: Date.now().toString(), firstName: '', lastName: '', email: '', phone: '', roleId: '' }
    ]);
    const removeOfficer = (id: string) => setOfficers(prev => prev.filter(o => o.id !== id));
    const update = (id: string, field: keyof OfficerForm, value: string) =>
        setOfficers(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));

    const saveOfficer = async (officer: OfficerForm) => {
        if (!officer.firstName || !officer.lastName || !officer.email || !officer.roleId) {
            setError('Please fill in all fields for each officer.'); return;
        }
        setSaving(officer.id); setError('');
        try {
            await apiClient.post('/users', {
                firstName: officer.firstName.trim(),
                lastName:  officer.lastName.trim(),
                email:     officer.email.trim().toLowerCase(),
                phoneNumber: officer.phone.trim() || undefined,
                password:  'Sacco@ChangeMeNow1', // temporary — mustChangePassword will be set
                roleIds:   [officer.roleId],
            });
            setSaved(prev => new Set([...prev, officer.id]));
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to create officer. Email may already be in use.');
        } finally { setSaving(null); }
    };

    const requiredStillMissing = missingRoles.filter(r =>
        !officers.some(o => {
            const role = roles.find(rl => rl.id === o.roleId);
            return role?.name === r && saved.has(o.id);
        })
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Create Officer Accounts</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Create accounts for your SACCO officers. Each person will receive an activation email to set their password.
                </p>
                {requiredStillMissing.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {requiredStillMissing.map(r => (
                            <span key={r} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-full font-medium">
                                Required: {fmtRole(r)}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <div className="space-y-4">
                {officers.map((officer, idx) => {
                    const isSaved = saved.has(officer.id);
                    return (
                        <div key={officer.id} className={`rounded-2xl border-2 p-5 transition-all ${isSaved ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-700">Officer {idx + 1}</span>
                                <div className="flex items-center gap-2">
                                    {isSaved && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Created ✓</span>}
                                    {!isSaved && officers.length > 1 && (
                                        <button onClick={() => removeOfficer(officer.id)} className="text-slate-400 hover:text-red-500 transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input disabled={isSaved} value={officer.firstName} onChange={e => update(officer.id, 'firstName', e.target.value)}
                                       placeholder="First name *" className={`${inp} ${isSaved ? 'opacity-50' : ''}`} />
                                <input disabled={isSaved} value={officer.lastName} onChange={e => update(officer.id, 'lastName', e.target.value)}
                                       placeholder="Last name *" className={`${inp} ${isSaved ? 'opacity-50' : ''}`} />
                                <input disabled={isSaved} value={officer.email} onChange={e => update(officer.id, 'email', e.target.value)}
                                       placeholder="Email address *" type="email" className={`${inp} ${isSaved ? 'opacity-50' : ''}`} />
                                <input disabled={isSaved} value={officer.phone} onChange={e => update(officer.id, 'phone', e.target.value)}
                                       placeholder="Phone (+254...)" className={`${inp} ${isSaved ? 'opacity-50' : ''}`} />
                                <select disabled={isSaved} value={officer.roleId} onChange={e => update(officer.id, 'roleId', e.target.value)}
                                        className={`${inp} col-span-2 ${isSaved ? 'opacity-50' : ''} ${!officer.roleId ? 'text-slate-400' : 'text-slate-800'}`}>
                                    <option value="">— Select role *</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{fmtRole(r.name)}</option>
                                    ))}
                                </select>
                            </div>
                            {!isSaved && (
                                <div className="mt-4 flex justify-end">
                                    <button onClick={() => saveOfficer(officer)}
                                            disabled={saving === officer.id || !officer.firstName || !officer.lastName || !officer.email || !officer.roleId}
                                            className={btn()}>
                                        {saving === officer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Save Officer
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button onClick={addOfficer} className={btn('ghost')}>
                <Plus className="w-4 h-4" /> Add Another Officer
            </button>

            <div className="flex justify-end">
                <button onClick={onDone} disabled={requiredStillMissing.length > 0} className={btn()}>
                    Continue <ArrowRight className="w-4 h-4" />
                </button>
            </div>
            {requiredStillMissing.length > 0 && (
                <p className="text-xs text-amber-600 text-right">
                    All four required roles must be created before continuing.
                </p>
            )}
        </div>
    );
};

// ── Step 3: Configure Platform ────────────────────────────────────────────────

const ConfigurePlatformStep: React.FC<{ onDone: () => void }> = ({ onDone }) => {
    const [saccoName, setSaccoName]   = useState('');
    const [prefix,    setPrefix]      = useState('');
    const [padLen,    setPadLen]      = useState(7);
    const [regFee,    setRegFee]      = useState('1000');
    const [modules,   setModules]     = useState({ members: true, loans: true, savings: true, reports: true });
    const [loading,   setLoading]     = useState(false);
    const [error,     setError]       = useState('');

    // Auto-generate prefix from SACCO name
    useEffect(() => {
        if (saccoName.trim().length >= 2) {
            const words = saccoName.trim().toUpperCase().split(/\s+/).filter(Boolean);
            const auto = words.length >= 2
                ? (words[0][0] + words[1][0] + (words[2]?.[0] ?? words[1][1] ?? 'X'))
                : saccoName.trim().slice(0, 3).toUpperCase();
            setPrefix(auto.slice(0, 3));
        }
    }, [saccoName]);

    const handleSave = async () => {
        if (!saccoName.trim() || prefix.length < 2) {
            setError('Please fill in SACCO name and member number prefix.'); return;
        }
        setLoading(true); setError('');
        try {
            await apiClient.post('/settings/sacco/initialize', {
                saccoName: saccoName.trim(),
                memberNumberPrefix: prefix.toUpperCase().slice(0, 3),
                memberNumberPadLength: padLen,
                registrationFee: parseFloat(regFee) || 1000,
                enabledModules: modules,
            });
            onDone();
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to save settings.');
        } finally { setLoading(false); }
    };

    const MODULE_INFO: Record<string, { label: string; desc: string }> = {
        members: { label: 'Members', desc: 'Member registration, profiles and directory.' },
        loans:   { label: 'Loans',   desc: 'Loan applications, approvals and repayments.' },
        savings: { label: 'Savings', desc: 'Member savings accounts, deposits and withdrawals.' },
        reports: { label: 'Reports', desc: 'Financial analytics, statements and reports.' },
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Configure Your Platform</h2>
                <p className="text-sm text-slate-500 mt-1">Set your SACCO's identity and enable the modules your organization needs.</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">SACCO Name *</label>
                    <input value={saccoName} onChange={e => setSaccoName(e.target.value)} placeholder="e.g. Betterlink Ventures SACCO" className={inp} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Member No. Prefix *</label>
                        <input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase().slice(0, 3))}
                               placeholder="BVS" maxLength={3} className={`${inp} font-mono uppercase tracking-widest`} />
                        <p className="text-xs text-slate-400 mt-1">Auto-generated · 2–3 letters</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Number Padding</label>
                        <select value={padLen} onChange={e => setPadLen(Number(e.target.value))} className={inp}>
                            {[5, 6, 7, 8].map(n => <option key={n} value={n}>{prefix || 'BVS'}{String(1).padStart(n, '0')}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Registration Fee (KES)</label>
                    <input value={regFee} onChange={e => setRegFee(e.target.value)} type="number" min="0" className={inp} />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Enable Modules</h3>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(MODULE_INFO).map(([key, info]) => {
                        const on = modules[key as keyof typeof modules];
                        const locked = key === 'members'; // members always on
                        return (
                            <button key={key} disabled={locked}
                                    onClick={() => !locked && setModules(prev => ({ ...prev, [key]: !prev[key as keyof typeof modules] }))}
                                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                                        on ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                                    } ${locked ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${on ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                    {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{info.label}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{info.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={loading || !saccoName.trim() || prefix.length < 2} className={btn()}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save & Complete Setup
                </button>
            </div>
        </div>
    );
};

// ── Done screen ────────────────────────────────────────────────────────────────

const DoneScreen: React.FC<{ onGo: () => void }> = ({ onGo }) => (
    <div className="text-center py-8 space-y-5">
        <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-slate-900">System Ready!</h2>
            <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                Your SACCO is configured and your officer accounts have been created.
                They'll receive activation emails to set their passwords.
            </p>
        </div>
        <button onClick={onGo} className={btn()}>
            Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
    </div>
);

// ── Main wizard page ───────────────────────────────────────────────────────────

const SetupWizardPage: React.FC = () => {
    const navigate = useNavigate();
    const { phase, missingOfficerRoles, refresh } = useSetup();
    const { user } = useAuth();

    // Determine display phase — map CHANGE_PASSWORD to VERIFY_CONTACT since
    // the password change page handles that redirect independently.
    const displayPhase = (!phase || phase === 'CHANGE_PASSWORD') ? 'VERIFY_CONTACT' : phase;

    const advance = useCallback(async () => {
        await refresh();
    }, [refresh]);

    if (displayPhase === 'COMPLETE') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                    <DoneScreen onGo={() => navigate('/dashboard', { replace: true })} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2.5 bg-white rounded-2xl px-4 py-2 shadow-sm border border-slate-100 mb-4">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-bold text-slate-700">System Initialization</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.firstName}</h1>
                    <p className="text-slate-500 text-sm mt-1">Complete these steps to bring your SACCO online.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                    <StepIndicator current={displayPhase} />

                    {displayPhase === 'VERIFY_CONTACT' && (
                        <VerifyContactStep onDone={advance} />
                    )}
                    {displayPhase === 'CREATE_OFFICERS' && (
                        <CreateOfficersStep missingRoles={missingOfficerRoles} onDone={advance} />
                    )}
                    {displayPhase === 'CONFIGURE_PLATFORM' && (
                        <ConfigurePlatformStep onDone={advance} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SetupWizardPage;