import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthProvider';
import { sessionApi, type SessionResponse } from '../../sessions/api/session-api';
import apiClient from '../../../shared/api/api-client';
import {
    User, Mail, Phone, Lock, MonitorSmartphone, Shield,
    ShieldCheck, ShieldAlert, CheckCircle, CheckCircle2,
    AlertTriangle, Key, XCircle, Loader2, Clock, Trash2,
    Edit3, Save, X, RefreshCw, Eye, EyeOff,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const errMsg = (err: unknown, fallback: string): string =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition bg-white ' +
    'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';

const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5';

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabId = 'profile' | 'contact' | 'password' | 'security' | 'sessions';

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'profile',  label: 'Personal Info', icon: User,             desc: 'Name and identity'      },
    { id: 'contact',  label: 'Contact',        icon: Mail,             desc: 'Email and phone'        },
    { id: 'password', label: 'Password',       icon: Lock,             desc: 'Change your password'  },
    { id: 'security', label: 'Two-Factor',     icon: Shield,           desc: 'MFA authentication'    },
    { id: 'sessions', label: 'Devices',        icon: MonitorSmartphone, desc: 'Active sessions'      },
];

// ─── Sub-section: Personal Info ───────────────────────────────────────────────

const PersonalInfoTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const { user, refreshUser } = useAuth();

    const [form, setForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.firstName.trim() || !form.lastName.trim()) { setError('Both name fields are required.'); return; }
        setSaving(true); setError(''); setSuccess('');
        try {
            await apiClient.put('/auth/profile', {
                firstName:   form.firstName.trim(),
                lastName:    form.lastName.trim(),
                phoneNumber: user?.phoneNumber,
            });
            await refreshUser();
            setSuccess('Profile updated successfully.');
            onSaved();
        } catch (err) { setError(errMsg(err, 'Failed to update profile.')); }
        finally { setSaving(false); }
    };

    const isDirty = form.firstName !== (user?.firstName ?? '') || form.lastName !== (user?.lastName ?? '');

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                    {(user?.firstName?.[0] ?? '?').toUpperCase()}{(user?.lastName?.[0] ?? '').toUpperCase()}
                </div>
                <div>
                    <p className="font-bold text-slate-900 text-lg">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    {user?.memberNumber && (
                        <span className="inline-block mt-1 text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {user.memberNumber}
                        </span>
                    )}
                </div>
            </div>

            {error   && <Alert type="error"   message={error} />}
            {success && <Alert type="success" message={success} />}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>First Name</label>
                    <input className={inputCls} value={form.firstName}
                           onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                    <label className={labelCls}>Last Name</label>
                    <input className={inputCls} value={form.lastName}
                           onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
            </div>

            <div>
                <label className={labelCls}>Login Email</label>
                <input className={inputCls} value={user?.email ?? ''} disabled
                       title="Email changes are handled in the Contact tab" />
                <p className="text-xs text-slate-400 mt-1">To change your email, go to the Contact tab.</p>
            </div>

            {user?.roles && user.roles.length > 0 && (
                <div>
                    <label className={labelCls}>Roles</label>
                    <div className="flex flex-wrap gap-2">
                        {user.roles.map(role => (
                            <span key={role} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-mono">
                                {role.replace('ROLE_', '').replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving || !isDirty}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

// ─── Sub-section: Contact (email / phone) ─────────────────────────────────────

const ContactTab: React.FC = () => {
    const { user, refreshUser } = useAuth();

    const [phoneForm, setPhoneForm] = useState({ phone: user?.phoneNumber ?? '', editing: false });
    const [phoneSaving, setPhoneSaving] = useState(false);
    const [phoneMsg, setPhoneMsg]       = useState('');
    const [phoneErr, setPhoneErr]       = useState('');

    const savePhone = async (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneSaving(true); setPhoneErr(''); setPhoneMsg('');
        try {
            await apiClient.put('/auth/profile', {
                firstName:   user?.firstName,
                lastName:    user?.lastName,
                phoneNumber: phoneForm.phone.trim(),
            });
            await refreshUser();
            setPhoneMsg('Phone number updated.');
            setPhoneForm(f => ({ ...f, editing: false }));
        } catch (err) { setPhoneErr(errMsg(err, 'Failed to update phone.')); }
        finally { setPhoneSaving(false); }
    };

    return (
        <div className="space-y-6">
            {/* Email section */}
            <section>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Mail size={15} className="text-slate-500" /> Email Address
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className={labelCls}>Login Email</label>
                        <div className="flex items-center gap-2">
                            <input className={inputCls} value={user?.email ?? ''} disabled />
                            {user?.emailVerified ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-semibold">
                                    <CheckCircle2 size={12} /> Verified
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-semibold">
                                    <AlertTriangle size={12} /> Unverified
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Email changes must be requested through your System Administrator.
                        </p>
                    </div>
                </div>
            </section>

            {/* Phone section */}
            <section className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Phone size={15} className="text-slate-500" /> Phone Number
                </h3>

                {phoneMsg && <Alert type="success" message={phoneMsg} />}
                {phoneErr && <Alert type="error"   message={phoneErr} />}

                {phoneForm.editing ? (
                    <form onSubmit={savePhone} className="space-y-3">
                        <div>
                            <label className={labelCls}>Phone Number</label>
                            <input className={inputCls} type="tel"
                                   value={phoneForm.phone}
                                   onChange={e => setPhoneForm(f => ({ ...f, phone: e.target.value }))}
                                   placeholder="+254 700 000 000" />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={phoneSaving}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition">
                                {phoneSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {phoneSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button"
                                    onClick={() => setPhoneForm(f => ({ ...f, editing: false, phone: user?.phoneNumber ?? '' }))}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex items-center gap-3">
                        <input className={inputCls} value={user?.phoneNumber ?? '—'} disabled />
                        {user?.phoneVerified && (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-semibold">
                                <CheckCircle2 size={12} /> Verified
                            </span>
                        )}
                        <button onClick={() => setPhoneForm(f => ({ ...f, editing: true }))}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition whitespace-nowrap">
                            <Edit3 size={14} /> Edit
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

// ─── Sub-section: Change Password ─────────────────────────────────────────────

const PasswordTab: React.FC = () => {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');

    const rules = [
        { ok: form.next.length >= 8,        label: 'At least 8 characters' },
        { ok: /[A-Z]/.test(form.next),      label: 'One uppercase letter' },
        { ok: /[0-9]/.test(form.next),      label: 'One number' },
        { ok: /[^A-Za-z0-9]/.test(form.next), label: 'One special character' },
    ];
    const passesAll = rules.every(r => r.ok);
    const matches   = form.next === form.confirm && form.confirm.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passesAll)  { setError('Password does not meet requirements.'); return; }
        if (!matches)    { setError('New passwords do not match.'); return; }
        setSaving(true); setError(''); setSuccess('');
        try {
            await apiClient.post('/auth/change-password', { currentPassword: form.current, newPassword: form.next });
            setSuccess('Password changed successfully. Your other sessions have been signed out.');
            setForm({ current: '', next: '', confirm: '' });
        } catch (err) { setError(errMsg(err, 'Failed to change password.')); }
        finally { setSaving(false); }
    };

    const ToggleEye = ({ field }: { field: 'current' | 'next' | 'confirm' }) => (
        <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
            {error   && <Alert type="error"   message={error} />}
            {success && <Alert type="success" message={success} />}

            <div>
                <label className={labelCls}>Current Password</label>
                <div className="relative">
                    <input type={show.current ? 'text' : 'password'} required className={inputCls + ' pr-10'}
                           value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
                    <ToggleEye field="current" />
                </div>
            </div>

            <div>
                <label className={labelCls}>New Password</label>
                <div className="relative">
                    <input type={show.next ? 'text' : 'password'} required className={inputCls + ' pr-10'}
                           value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} />
                    <ToggleEye field="next" />
                </div>
                {form.next.length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {rules.map(r => (
                            <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <CheckCircle2 size={11} className={r.ok ? 'opacity-100' : 'opacity-30'} /> {r.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <label className={labelCls}>Confirm New Password</label>
                <div className="relative">
                    <input type={show.confirm ? 'text' : 'password'} required className={inputCls + ' pr-10'}
                           value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
                    <ToggleEye field="confirm" />
                </div>
                {form.confirm.length > 0 && (
                    <p className={`text-xs mt-1 ${matches ? 'text-emerald-600' : 'text-red-500'}`}>
                        {matches ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                )}
            </div>

            <button type="submit" disabled={saving || !form.current || !passesAll || !matches}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                {saving ? 'Changing…' : 'Change Password'}
            </button>
        </form>
    );
};

// ─── Sub-section: Two-Factor Auth (from existing SecuritySettingsPage) ────────

const SecurityTab: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [qrCode, setQrCode]   = useState('');
    const [secret, setSecret]   = useState('');
    const [code, setCode]       = useState('');
    const [status, setStatus]   = useState<'loading' | 'idle' | 'submitting' | 'success' | 'error'>('loading');
    const [errMsgState, setErrMsg] = useState('');
    const [disabling, setDisabling] = useState(false);

    useEffect(() => {
        if (user?.mfaEnabled) { setStatus('idle'); return; }
        apiClient.get('/auth/mfa/setup')
            .then(r => { setQrCode(r.data.qrCode); setSecret(r.data.secret); setStatus('idle'); })
            .catch(() => { setStatus('error'); setErrMsg('Failed to load MFA setup.'); });
    }, [user?.mfaEnabled]);

    const handleEnable = async (e: React.FormEvent) => {
        e.preventDefault(); setStatus('submitting'); setErrMsg('');
        try { await apiClient.post('/auth/mfa/enable', { code }); await refreshUser(); setStatus('success'); setCode(''); }
        catch (err) { setStatus('error'); setErrMsg(errMsg(err, 'Invalid code. Please try again.')); }
    };

    const handleDisable = async () => {
        if (!window.confirm('Disable Two-Factor Authentication? This makes your account less secure.')) return;
        setDisabling(true);
        try { await apiClient.post('/auth/mfa/disable'); await refreshUser(); setStatus('idle'); setQrCode(''); setSecret(''); apiClient.get('/auth/mfa/setup').then(r => { setQrCode(r.data.qrCode); setSecret(r.data.secret); }); }
        catch { alert('Failed to disable MFA.'); }
        finally { setDisabling(false); }
    };

    if (user?.mfaEnabled) return (
        <div className="text-center py-10 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">2FA is Active</h3>
            <p className="text-sm text-slate-500 mb-6">Your account is protected with two-factor authentication.</p>
            <button onClick={handleDisable} disabled={disabling}
                    className="flex items-center gap-2 mx-auto px-5 py-2.5 border border-red-200 text-red-600 bg-white hover:bg-red-50 text-sm font-semibold rounded-xl transition disabled:opacity-50">
                {disabling ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                Disable 2FA
            </button>
        </div>
    );

    if (status === 'success') return (
        <div className="text-center py-10 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">2FA Enabled!</h3>
            <p className="text-sm text-slate-500">Your account is now protected with two-factor authentication.</p>
        </div>
    );

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div>
                <h3 className="font-bold text-slate-800 mb-3">Step 1 — Scan QR Code</h3>
                <p className="text-sm text-slate-500 mb-4">Open Google Authenticator, Authy, or any TOTP app and scan the code below.</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex justify-center items-center min-h-48">
                    {status === 'loading' ? <Loader2 size={28} className="animate-spin text-slate-400" /> :
                        qrCode ? <img src={qrCode} alt="MFA QR" className="w-40 h-40 rounded bg-white p-1.5 border border-slate-200 shadow-sm" /> : null}
                </div>
                {secret && <p className="text-center text-xs text-slate-500 mt-3">Setup key: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-800 select-all border border-slate-200">{secret}</code></p>}
            </div>

            <div>
                <h3 className="font-bold text-slate-800 mb-3">Step 2 — Verify Code</h3>
                {status === 'error' && <Alert type="error" message={errMsgState} />}
                <form onSubmit={handleEnable} className="space-y-4">
                    <div>
                        <label className={labelCls}>6-Digit Code</label>
                        <div className="relative">
                            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" required maxLength={6} value={code}
                                   onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                                   placeholder="123456"
                                   className={inputCls + ' pl-9 text-lg tracking-widest font-mono'} />
                        </div>
                    </div>
                    <button type="submit" disabled={status === 'submitting' || code.length < 6 || status === 'loading'}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition w-full justify-center">
                        {status === 'submitting' ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                        {status === 'submitting' ? 'Verifying…' : 'Enable 2FA'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Sub-section: Active Sessions ─────────────────────────────────────────────

const SessionsTab: React.FC = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true); setError('');
        try {
            const data = await sessionApi.getUserSessions(user.id);
            setSessions(data.sort((a, b) => new Date(b.lastAccessedTime).getTime() - new Date(a.lastAccessedTime).getTime()));
        } catch { setError('Failed to load sessions.'); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const revoke = async (id: string) => {
        if (!window.confirm('Sign out of this device?')) return;
        await sessionApi.revokeSpecificSession(id);
        setSessions(s => s.filter(x => x.sessionId !== id));
    };

    const revokeAll = async () => {
        if (!window.confirm('Sign out of ALL devices? You will be logged out now.')) return;
        await sessionApi.revokeAllUserSessions(user!.id);
        window.location.href = '/login';
    };

    const fmt = (s: string) => new Date(s).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>;
    if (error)   return <Alert type="error" message={error} />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
                <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition">
                    <RefreshCw size={12} /> Refresh
                </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {sessions.map((session, idx) => (
                    <div key={session.sessionId} className="flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition">
                        <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                            <MonitorSmartphone size={18} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800 font-mono">
                                    {session.sessionId.substring(0, 12)}…
                                </p>
                                {idx === 0 && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                        This Device
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock size={11} /> Last active: {fmt(session.lastAccessedTime)}
                            </p>
                        </div>
                        <button onClick={() => revoke(session.sessionId)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg transition">
                            <Trash2 size={13} /> Sign Out
                        </button>
                    </div>
                ))}
            </div>

            {sessions.length > 1 && (
                <div className="flex justify-end">
                    <button onClick={revokeAll}
                            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-semibold">
                        <ShieldAlert size={15} /> Sign out of all devices
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Alert helper ─────────────────────────────────────────────────────────────

const Alert: React.FC<{ type: 'error' | 'success'; message: string }> = ({ type, message }) => (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm border ${
        type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }`}>
        {type === 'error' ? <AlertTriangle size={15} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={15} className="shrink-0 mt-0.5" />}
        {message}
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const ProfilePage: React.FC = () => {
    const { user }            = useAuth();
    const [tab, setTab]       = useState<TabId>('profile');
    const [savedFlash, setSavedFlash] = useState(false);

    const handleSaved = () => {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 3000);
    };

    const greeting = () => {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {greeting()}, {user?.firstName}. Manage your account details and security.
                    </p>
                </div>
                {savedFlash && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg">
                        <CheckCircle2 size={13} /> Saved
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar tabs */}
                <nav className="lg:w-52 shrink-0">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        {TABS.map((t, i) => {
                            const Icon = t.icon;
                            const active = tab === t.id;
                            return (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                        className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all
                                        ${i < TABS.length - 1 ? 'border-b border-slate-100' : ''}
                                        ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <Icon size={15} className={active ? 'text-slate-300' : 'text-slate-400'} />
                                    <div>
                                        <p className="text-xs font-semibold">{t.label}</p>
                                        <p className={`text-[10px] mt-0.5 ${active ? 'text-slate-400' : 'text-slate-400'}`}>{t.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Content panel */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-6 min-h-96">
                    {tab === 'profile'  && <PersonalInfoTab onSaved={handleSaved} />}
                    {tab === 'contact'  && <ContactTab />}
                    {tab === 'password' && <PasswordTab />}
                    {tab === 'security' && <SecurityTab />}
                    {tab === 'sessions' && <SessionsTab />}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;