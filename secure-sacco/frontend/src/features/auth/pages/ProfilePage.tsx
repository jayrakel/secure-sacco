import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';

import apiClient from '../../../shared/api/api-client';
import {
    User, Mail, Phone, Lock, MonitorSmartphone, Shield,
    ShieldCheck, CheckCircle2,
    AlertTriangle, Loader2, 
    Edit3, Save, X, Eye, EyeOff, Camera, Upload
} from 'lucide-react';
import { AuthenticatedImage } from '../../../shared/components/AuthenticatedImage';

const errMsg = (err: unknown, fallback: string): string =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition bg-white ' +
    'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';

const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5';

type TabId = 'profile' | 'contact' | 'password' | 'security' | 'sessions';

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'profile',  label: 'Personal Info', icon: User,              desc: 'Name, photo & identity' },
    { id: 'contact',  label: 'Contact',       icon: Mail,              desc: 'Email and phone'        },
    { id: 'password', label: 'Password',      icon: Lock,              desc: 'Change your password'   },
    { id: 'security', label: 'Two-Factor',    icon: Shield,            desc: 'MFA authentication'     },
    { id: 'sessions', label: 'Devices',       icon: MonitorSmartphone, desc: 'Active sessions'        },
];

const PersonalInfoTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const { user, refreshUser } = useAuth();

    const [form, setForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Stable state for cache-busting avatar image without calling Date.now() during render
    const [photoTimestamp, setPhotoTimestamp] = useState(() => Date.now());

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handlePhotoUpload = async () => {
        if (!selectedFile || !user) return;
        setUploading(true); setError(''); setSuccess('');
        const formData = new FormData();
        formData.append('photo', selectedFile);

        try {
            await apiClient.post('/auth/profile/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await refreshUser();
            setPhotoTimestamp(Date.now()); // Update timestamp to bust browser cache
            setSuccess('Profile photo updated successfully.');
            setSelectedFile(null);
            onSaved();
        } catch (err) {
            setError(errMsg(err, 'Failed to upload profile photo.'));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.firstName.trim() || !form.lastName.trim()) { setError('Both name fields are required.'); return; }
        setSaving(true); setError(''); setSuccess('');
        try {
            await apiClient.put('/auth/profile', {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phoneNumber: user?.phoneNumber,
            });
            await refreshUser();
            setSuccess('Profile updated successfully.');
            onSaved();
        } catch (err) {
            setError(errMsg(err, 'Failed to update profile.'));
        } finally {
            setSaving(false);
        }
    };

    const isDirty = form.firstName !== (user?.firstName ?? '') || form.lastName !== (user?.lastName ?? '');

    return (
        <div className="space-y-6">
            {error && <Alert type="error" message={error} />}
            {success && <Alert type="success" message={success} />}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
                <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-2 border-slate-100 shadow-md">
                        {user?.profilePhotoUrl ? (
                            <AuthenticatedImage
                                src={`${user.profilePhotoUrl}?t=${photoTimestamp}`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                fallback={`${(user?.firstName?.[0] ?? '?').toUpperCase()}${(user?.lastName?.[0] ?? '').toUpperCase()}`}
                            />
                        ) : (
                            `${(user?.firstName?.[0] ?? '?').toUpperCase()}${(user?.lastName?.[0] ?? '').toUpperCase()}`
                        )}
                    </div>
                    <label htmlFor="photo-upload" className="absolute bottom-0 right-0 p-1.5 bg-slate-900 text-white rounded-full cursor-pointer shadow hover:bg-slate-700 transition">
                        <Camera size={14} />
                        <input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>

                <div className="flex-1">
                    <p className="font-bold text-slate-900 text-lg">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    {user?.memberNumber && (
                        <span className="inline-block mt-1 text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                            Member #{user.memberNumber}
                        </span>
                    )}

                    {selectedFile && (
                        <div className="mt-3 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 inline-flex">
                            <span className="text-xs text-slate-600 truncate max-w-xs">{selectedFile.name}</span>
                            <button
                                type="button"
                                onClick={handlePhotoUpload}
                                disabled={uploading}
                                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition"
                            >
                                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                {uploading ? 'Uploading...' : 'Save Photo'}
                            </button>
                            <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className={labelCls}>Assigned Roles</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {user.roles.map(role => (
                                <span key={role} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-mono font-medium">
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
        </div>
    );
};

const ContactTab: React.FC = () => {
    const { user, refreshUser } = useAuth();
    
    // Separate forms for email and phone
    const [phoneForm, setPhoneForm] = useState({ phone: user?.phoneNumber ?? '', editing: false });
    const [emailForm, setEmailForm] = useState({ email: user?.email ?? '', editing: false });
    
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    
    // OTP Modal state
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [pendingChange, setPendingChange] = useState<{ email?: string; phone?: string } | null>(null);

    const handleSaveRequest = async (type: 'email' | 'phone') => {
        setErr(''); setMsg('');
        
        let hasChanges = false;
        const changePayload: { email?: string; phone?: string } = {};

        if (type === 'email' && emailForm.email.trim() !== user?.email) {
            hasChanges = true;
            changePayload.email = emailForm.email.trim();
        } else if (type === 'phone' && phoneForm.phone.trim() !== user?.phoneNumber) {
            hasChanges = true;
            changePayload.phone = phoneForm.phone.trim();
        }

        if (!hasChanges) {
            if (type === 'email') setEmailForm(f => ({ ...f, editing: false }));
            if (type === 'phone') setPhoneForm(f => ({ ...f, editing: false }));
            return;
        }

        setSaving(true);
        try {
            // Request OTP
            await apiClient.post('/auth/profile/authorize-change');
            setPendingChange(changePayload);
            setShowOtpModal(true);
            setMsg('An OTP has been sent to your verified contact method.');
        } catch (error) {
            setErr(errMsg(error, 'Failed to request authorization code.'));
        } finally {
            setSaving(false);
        }
    };

    const confirmSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingChange || !otp.trim()) return;

        setSaving(true); setErr(''); setMsg('');
        try {
            await apiClient.put('/auth/profile', {
                firstName: user?.firstName,
                lastName: user?.lastName,
                email: pendingChange.email,
                phoneNumber: pendingChange.phone,
                otp: otp.trim()
            });
            await refreshUser();
            setMsg('Contact information updated successfully.');
            setPhoneForm(f => ({ ...f, editing: false }));
            setEmailForm(f => ({ ...f, editing: false }));
            setShowOtpModal(false);
            setOtp('');
            setPendingChange(null);
        } catch (error) {
            setErr(errMsg(error, 'Failed to update contact info. Invalid OTP?'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {msg && <Alert type="success" message={msg} />}
            {err && <Alert type="error" message={err} />}

            <section>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Mail size={16} className="text-slate-500" /> Email Address
                </h3>
                
                {emailForm.editing ? (
                    <div className="space-y-3 mt-3">
                        <div>
                            <label className={labelCls}>Login Email</label>
                            <input className={inputCls} type="email"
                                   value={emailForm.email}
                                   onChange={e => setEmailForm(f => ({ ...f, email: e.target.value }))}
                                   placeholder="you@example.com" />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => handleSaveRequest('email')} disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {saving ? 'Requesting…' : 'Save'}
                            </button>
                            <button onClick={() => setEmailForm({ editing: false, email: user?.email ?? '' })}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className={labelCls}>Login Email</label>
                        <div className="flex items-center gap-2.5">
                            <input className={inputCls} value={user?.email ?? ''} disabled />
                            {user?.emailVerified ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl whitespace-nowrap font-semibold">
                                    <CheckCircle2 size={13} /> Verified
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-2 rounded-xl whitespace-nowrap font-semibold">
                                    <AlertTriangle size={13} /> Unverified
                                </span>
                            )}
                            <button onClick={() => setEmailForm(f => ({ ...f, editing: true }))}
                                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition whitespace-nowrap">
                                <Edit3 size={14} /> Edit
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Changing your email requires authorization via an OTP sent to your verified contact method.
                        </p>
                    </div>
                )}
            </section>

            <section className="pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Phone size={16} className="text-slate-500" /> Phone Number
                </h3>

                {phoneForm.editing ? (
                    <div className="space-y-3 mt-3">
                        <div>
                            <label className={labelCls}>Phone Number</label>
                            <input className={inputCls} type="tel"
                                   value={phoneForm.phone}
                                   onChange={e => setPhoneForm(f => ({ ...f, phone: e.target.value }))}
                                   placeholder="+254 700 000 000" />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => handleSaveRequest('phone')} disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {saving ? 'Requesting…' : 'Save'}
                            </button>
                            <button type="button"
                                    onClick={() => setPhoneForm({ editing: false, phone: user?.phoneNumber ?? '' })}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5">
                        <input className={inputCls} value={user?.phoneNumber ?? '—'} disabled />
                        {user?.phoneVerified && (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl whitespace-nowrap font-semibold">
                                <CheckCircle2 size={13} /> Verified
                            </span>
                        )}
                        <button onClick={() => setPhoneForm(f => ({ ...f, editing: true }))}
                                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition whitespace-nowrap">
                            <Edit3 size={14} /> Edit
                        </button>
                    </div>
                )}
            </section>

            {/* OTP Modal */}
            {showOtpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                                <ShieldCheck size={24} className="text-slate-700" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Security Verification</h3>
                            <p className="text-sm text-slate-500 mb-5">
                                Please enter the 6-digit authorization code we just sent you to confirm these changes.
                            </p>
                            
                            <form onSubmit={confirmSave} className="space-y-4">
                                <div>
                                    <label className={labelCls}>6-Digit Code</label>
                                    <input type="text" required maxLength={6} value={otp}
                                           onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                           placeholder="123456"
                                           className={inputCls + ' text-center text-xl tracking-[0.5em] font-mono font-bold'} />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="submit" disabled={saving || otp.length < 6}
                                            className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition">
                                        {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                        Verify
                                    </button>
                                    <button type="button" onClick={() => { setShowOtpModal(false); setOtp(''); setPendingChange(null); }}
                                            className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl transition">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PasswordTab: React.FC = () => {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const rules = [
        { ok: form.next.length >= 8,         label: 'At least 8 characters' },
        { ok: /[A-Z]/.test(form.next),       label: 'One uppercase letter' },
        { ok: /[0-9]/.test(form.next),       label: 'One number' },
        { ok: /[^A-Za-z0-9]/.test(form.next), label: 'One special character' },
    ];
    const passesAll = rules.every(r => r.ok);
    const matches = form.next === form.confirm && form.confirm.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passesAll) { setError('Password does not meet requirements.'); return; }
        if (!matches)   { setError('New passwords do not match.'); return; }
        setSaving(true); setError(''); setSuccess('');
        try {
            await apiClient.post('/auth/change-password', { currentPassword: form.current, newPassword: form.next });
            setSuccess('Password changed successfully. Your other active sessions have been signed out.');
            setForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            setError(errMsg(err, 'Failed to change password.'));
        } finally {
            setSaving(false);
        }
    };

    const renderToggleEye = (field: 'current' | 'next' | 'confirm') => (
        <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
            {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
            {error && <Alert type="error" message={error} />}
            {success && <Alert type="success" message={success} />}

            <div>
                <label className={labelCls}>Current Password</label>
                <div className="relative">
                    <input type={show.current ? 'text' : 'password'} required className={inputCls + ' pr-10'}
                           value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
                    {renderToggleEye('current')}
                </div>
            </div>

            <div>
                <label className={labelCls}>New Password</label>
                <div className="relative">
                    <input type={show.next ? 'text' : 'password'} required className={inputCls + ' pr-10'}
                           value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} />
                    {renderToggleEye('next')}
                </div>
                {form.next.length > 0 && (
                    <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
                        {rules.map(r => (
                            <li key={r.label} className={`text-xs flex items-center gap-1.5 font-medium ${r.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <CheckCircle2 size={12} className={r.ok ? 'opacity-100 text-emerald-600' : 'opacity-30'} /> {r.label}
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
                    {renderToggleEye('confirm')}
                </div>
                {form.confirm.length > 0 && (
                    <p className={`text-xs mt-1.5 font-semibold flex items-center gap-1 ${matches ? 'text-emerald-600' : 'text-red-500'}`}>
                        {matches ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                )}
            </div>

            <div className="pt-2">
                <button type="submit" disabled={saving || !form.current || !passesAll || !matches}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                    {saving ? 'Changing…' : 'Change Password'}
                </button>
            </div>
        </form>
    );
};

const SecurityTab: React.FC = () => {
    return (
        <div className="text-center py-12 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <ShieldCheck size={32} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Advanced Security</h3>
            <p className="text-sm text-slate-500 mb-6">Manage Two-Factor Authentication (SMS, Email, Authenticator App) and Passkeys in the advanced security settings.</p>
            <Link to="/security"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition shadow-sm">
                Go to Security Settings
            </Link>
        </div>
    );
};

const SessionsTab: React.FC = () => {
    return (
        <div className="text-center py-12 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <MonitorSmartphone size={32} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Manage Devices</h3>
            <p className="text-sm text-slate-500 mb-6">View your active sessions and log out of unrecognized devices in the advanced security settings.</p>
            <Link to="/security"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition shadow-sm">
                Go to Security Settings
            </Link>
        </div>
    );
};

const Alert: React.FC<{ type: 'error' | 'success'; message: string }> = ({ type, message }) => (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl text-sm font-medium border shadow-2xs ${
        type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
    }`}>
        {type === 'error' ? <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />}
        <span>{message}</span>
    </div>
);

export const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState<TabId>('profile');
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Account & Security Hub</h1>
                    <p className="text-sm text-slate-300 mt-1 font-medium">
                        {greeting()}, {user?.firstName}. Manage your credentials, security settings, and devices.
                    </p>
                </div>
                {savedFlash && (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl animate-fade-in self-start sm:self-center">
                        <CheckCircle2 size={14} /> Changes Saved
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                <nav className="w-full md:w-60 shrink-0">
                    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs p-1.5 space-y-1">
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.id;
                            return (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                        className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3.5 transition-all
                                        ${active ? 'bg-slate-900 text-white shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'}`}>
                                    <Icon size={16} className={active ? 'text-emerald-400' : 'text-slate-400'} />
                                    <div>
                                        <p className="text-xs">{t.label}</p>
                                        <p className={`text-[10px] font-normal mt-0.5 ${active ? 'text-slate-300' : 'text-slate-400'}`}>{t.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="flex-1 w-full bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-6 sm:p-8 min-h-[420px]">
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