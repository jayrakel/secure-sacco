import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { sessionApi, type SessionResponse } from '../../sessions/api/session-api';
import apiClient from '../../../shared/api/api-client';
import {
    MonitorSmartphone, Trash2, ShieldAlert, Loader2, Clock,
    ShieldCheck, Smartphone, CheckCircle, AlertTriangle, Key, XCircle
} from 'lucide-react';

export default function SecuritySettingsPage() {
    const { user, refreshUser } = useAuth();

    // --- SESSION MANAGEMENT STATE ---
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [isSessionsLoading, setIsSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState('');

    // --- MFA STATE ---
    const [qrCode, setQrCode] = useState<string>('');
    const [secret, setSecret] = useState<string>('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaStatus, setMfaStatus] = useState<'loading_qr' | 'idle' | 'submitting' | 'success' | 'error'>('loading_qr');
    const [mfaErrorMsg, setMfaErrorMsg] = useState('');
    const [isDisabling, setIsDisabling] = useState(false);

    // 1. Fetch Sessions
    useEffect(() => {
        if (!user) return;
        const fetchMySessions = async () => {
            try {
                const data = await sessionApi.getUserSessions(user.id);
                setSessions(data.sort((a, b) => new Date(b.lastAccessedTime).getTime() - new Date(a.lastAccessedTime).getTime()));
            } catch (err: any) {
                setSessionsError(err.response?.data?.message || 'Failed to load your sessions.');
            } finally {
                setIsSessionsLoading(false);
            }
        };
        fetchMySessions();
    }, [user]);

    // 2. Fetch MFA QR Code if not enabled
    useEffect(() => {
        if (user && !user.mfaEnabled) {
            fetchMfaSetup();
        } else {
            setMfaStatus('idle');
        }
    }, [user]);

    const fetchMfaSetup = async () => {
        try {
            const response = await apiClient.get('/auth/mfa/setup');
            setQrCode(response.data.qrCode);
            setSecret(response.data.secret);
            setMfaStatus('idle');
        } catch (err: any) {
            setMfaStatus('error');
            setMfaErrorMsg('Failed to load MFA setup. Please try again later.');
        }
    };

    // --- HANDLERS ---
    const handleEnableMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        setMfaStatus('submitting');
        setMfaErrorMsg('');

        try {
            await apiClient.post('/auth/mfa/enable', { code: mfaCode });
            await refreshUser();
            setMfaStatus('success');
            setMfaCode('');
        } catch (err: any) {
            setMfaStatus('error');
            setMfaErrorMsg(err.response?.data?.message || 'Invalid authenticator code. Please try again.');
        }
    };

    const handleDisableMfa = async () => {
        if (!window.confirm("Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.")) return;

        setIsDisabling(true);
        try {
            await apiClient.post('/auth/mfa/disable');
            await refreshUser(); // Refreshes context so mfaEnabled becomes false
            setMfaStatus('idle'); // Reset the UI to show the setup process again
            fetchMfaSetup(); // Grab a fresh QR code
        } catch (err: any) {
            alert("Failed to disable MFA. Please try again.");
        } finally {
            setIsDisabling(false);
        }
    };

    const handleRevokeSingle = async (sessionId: string) => {
        if (!window.confirm("Log out of this device?")) return;
        try {
            await sessionApi.revokeSpecificSession(sessionId);
            setSessions(sessions.filter(s => s.sessionId !== sessionId));
        } catch (err) {
            alert("Failed to terminate session.");
        }
    };

    const handleRevokeAll = async () => {
        if (!window.confirm("Log out of ALL devices immediately? You will be logged out of this browser as well.")) return;
        try {
            await sessionApi.revokeAllUserSessions(user!.id);
            window.location.href = '/login';
        } catch (err) {
            alert("Failed to terminate sessions.");
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto font-sans">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" /> Security Settings
                </h1>
                <p className="text-slate-500 text-sm mt-1">Manage your account security and active devices.</p>
            </div>

            {/* --- SECTION 1: TWO-FACTOR AUTHENTICATION --- */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Two-Factor Authentication (2FA)</h2>
                            <p className="text-slate-500 text-sm mt-1">Protect your account by requiring a 6-digit code when logging in.</p>
                        </div>
                    </div>
                    <div>
                        {user?.mfaEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle size={16} /> Enabled
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Disabled
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {user?.mfaEnabled ? (
                        <div className="text-center py-8 max-w-md mx-auto">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Your account is highly secure</h3>
                            <p className="text-slate-600 mb-8">
                                Two-factor authentication is currently turned on. Every time you log in, you will be required to enter a code from your authenticator app.
                            </p>

                            <div className="pt-6 border-t border-slate-100">
                                <button
                                    onClick={handleDisableMfa}
                                    disabled={isDisabling}
                                    className="px-6 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition flex items-center justify-center gap-2 mx-auto shadow-sm disabled:opacity-50"
                                >
                                    {isDisabling ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                                    Disable 2FA
                                </button>
                            </div>
                        </div>
                    ) : mfaStatus === 'success' ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">2FA Enabled Successfully!</h3>
                            <p className="text-slate-600">Your account is now protected with two-factor authentication.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-10">
                            {/* Left Side: Instructions & QR Code */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Step 1: Scan the QR Code</h3>
                                <p className="text-sm text-slate-600 mb-6">
                                    Open your preferred authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator) and scan the QR code below.
                                </p>

                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex justify-center mb-4 min-h-[250px] items-center">
                                    {mfaStatus === 'loading_qr' ? (
                                        <Loader2 className="animate-spin text-slate-400" size={32} />
                                    ) : qrCode ? (
                                        <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 rounded shadow-sm bg-white p-2 border border-slate-200" />
                                    ) : null}
                                </div>

                                {secret && (
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500 mb-1">Can't scan the code? Use this setup key:</p>
                                        <code className="bg-slate-100 px-3 py-1.5 rounded text-sm text-slate-800 font-bold select-all border border-slate-200">
                                            {secret}
                                        </code>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Verification Form */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Step 2: Verify & Enable</h3>
                                <p className="text-sm text-slate-600 mb-6">
                                    Enter the 6-digit code generated by your authenticator app to verify the setup and enable 2FA.
                                </p>

                                {mfaErrorMsg && mfaStatus === 'error' && (
                                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r flex items-start gap-2">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                        <span>{mfaErrorMsg}</span>
                                    </div>
                                )}

                                <form onSubmit={handleEnableMfa} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Authenticator Code</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                            <input
                                                type="text"
                                                required
                                                maxLength={6}
                                                className="w-full border border-slate-300 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition tracking-widest text-lg font-mono placeholder:tracking-normal"
                                                value={mfaCode}
                                                onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                                placeholder="123456"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={mfaStatus === 'submitting' || mfaCode.length < 6 || mfaStatus === 'loading_qr'}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        {mfaStatus === 'submitting' ? (
                                            <><Loader2 className="animate-spin" size={20} /> Verifying...</>
                                        ) : (
                                            <><ShieldCheck size={20} /> Enable 2FA</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: ACTIVE SESSIONS --- */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                        <MonitorSmartphone size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Active Devices</h2>
                        <p className="text-slate-500 text-sm">You are currently logged in to these devices. If you don't recognize a device, terminate it immediately.</p>
                    </div>
                </div>

                <div className="p-6">
                    {isSessionsLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-600" size={32}/></div>
                    ) : sessionsError ? (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">{sessionsError}</div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session, idx) => (
                                <div key={session.sessionId} className="flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 p-2 bg-white text-slate-600 rounded-lg shadow-sm border border-slate-100">
                                            <MonitorSmartphone size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                Session #{session.sessionId.substring(0, 8)}...
                                                {idx === 0 && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-purple-200">Current Device</span>}
                                            </div>
                                            <div className="flex flex-col text-xs text-slate-500 mt-1 space-y-1">
                                                <span className="flex items-center gap-1"><Clock size={12} /> Last Active: {formatDate(session.lastAccessedTime)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRevokeSingle(session.sessionId)}
                                        className="px-4 py-2 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-red-600 font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-sm"
                                    >
                                        <Trash2 size={16} /> Sign Out
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {sessions.length > 1 && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <button
                            onClick={handleRevokeAll}
                            className="text-red-600 font-bold text-sm hover:underline flex items-center gap-2"
                        >
                            <ShieldAlert size={16} /> Sign out of ALL devices
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}