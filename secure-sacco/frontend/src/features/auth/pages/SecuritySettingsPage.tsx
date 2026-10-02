import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { sessionApi, type SessionResponse } from '../../sessions/api/session-api';
import apiClient from '../../../shared/api/api-client';
import {
    MonitorSmartphone, Trash2, ShieldAlert, Loader2, Clock,
    ShieldCheck, Smartphone, CheckCircle, AlertTriangle, Key, XCircle, Fingerprint
} from 'lucide-react';
import { webAuthnApi } from '../api/webauthn-api';
import { startRegistration } from '@simplewebauthn/browser';

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
    const [mfaStatus, setMfaStatus] = useState<'method_select' | 'loading_qr' | 'idle' | 'submitting' | 'success' | 'error'>('method_select');
    const [selectedMethod, setSelectedMethod] = useState<'TOTP' | 'SMS' | 'EMAIL'>('TOTP');
    const [mfaErrorMsg, setMfaErrorMsg] = useState('');
    const [isDisabling, setIsDisabling] = useState(false);

    // --- PASSKEY STATE ---
    const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
    const [passkeyError, setPasskeyError] = useState('');
    const [passkeySuccess, setPasskeySuccess] = useState(false);

    // 1. Fetch Sessions
    useEffect(() => {
        if (!user) return;
        const fetchMySessions = async () => {
            try {
                const data = await sessionApi.getUserSessions(user.id);
                setSessions(data.sort((a, b) => new Date(b.lastAccessedTime).getTime() - new Date(a.lastAccessedTime).getTime()));
            } catch (err: unknown) {
                setSessionsError((err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to load your sessions.');
            } finally {
                setIsSessionsLoading(false);
            }
        };
        fetchMySessions();
    }, [user]);

    // 2. Fetch MFA QR Code if not enabled
    useEffect(() => {
        if (user && !user.mfaEnabled) {
            setMfaStatus('method_select');
        } else {
            setMfaStatus('idle');
        }
    }, [user]);

    const fetchMfaSetup = async (method: string) => {
        setMfaStatus('loading_qr');
        setMfaErrorMsg('');
        try {
            const response = await apiClient.post('/auth/mfa/setup', { method });
            setQrCode(response.data.qrCode);
            setSecret(response.data.secret);
            setMfaStatus('idle');
        } catch {
            setMfaStatus('error');
            setMfaErrorMsg('Failed to load MFA setup. Please try again later.');
        }
    };

    // --- HANDLERS ---
    const handleRegisterPasskey = async () => {
        setIsRegisteringPasskey(true);
        setPasskeyError('');
        setPasskeySuccess(false);

        try {
            // 1. Get options from server
            const optionsResp = await webAuthnApi.startRegistration();
            const options = typeof optionsResp === 'string' ? JSON.parse(optionsResp) : optionsResp;
            
            // 2. Pass options to authenticator
            const attResp = await startRegistration(options);
            
            // 3. Send response back to server
            // Using a generic name for now, e.g., "My Authenticator" or prompt user
            const deviceName = prompt("Give this device/passkey a name (e.g., Personal Phone):", "My Passkey") || "My Passkey";
            
            await webAuthnApi.finishRegistration(JSON.stringify(attResp), deviceName);
            
            setPasskeySuccess(true);
        } catch (err) {
            console.error(err);
            const error = err as { name?: string; response?: { data?: { message?: string } }; message?: string }; // Bypass for Axios/DOMException typing
            if (error?.name === 'NotAllowedError') {
                setPasskeyError('Registration was cancelled or timed out.');
            } else if (error?.name === 'InvalidStateError') {
                setPasskeyError('This device is already registered as a passkey.');
            } else {
                setPasskeyError(error?.response?.data?.message || error?.message || 'Failed to register passkey. Ensure your device supports it.');
            }
        } finally {
            setIsRegisteringPasskey(false);
        }
    };

    const handleEnableMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        setMfaStatus('submitting');
        setMfaErrorMsg('');

        try {
            await apiClient.post('/auth/mfa/enable', { code: mfaCode, method: selectedMethod });
            await refreshUser();
            setMfaStatus('success');
            setMfaCode('');
        } catch (err: unknown) {
            setMfaStatus('error');
            setMfaErrorMsg((err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Invalid authenticator code. Please try again.');
        }
    };

    const handleDisableMfa = async () => {
        if (!window.confirm("Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.")) return;

        setIsDisabling(true);
        try {
            await apiClient.post('/auth/mfa/disable');
            await refreshUser(); // Refreshes context so mfaEnabled becomes false
            setMfaStatus('idle'); // Reset the UI to show the setup process again
            setMfaStatus('method_select');
        } catch {
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
        } catch {
            alert("Failed to terminate session.");
        }
    };

    const handleRevokeAll = async () => {
        if (!window.confirm("Log out of ALL devices immediately? You will be logged out of this browser as well.")) return;
        try {
            await sessionApi.revokeAllUserSessions(user!.id);
            window.location.href = '/login';
        } catch {
            alert("Failed to terminate sessions.");
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto font-sans">
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
                    ) : mfaStatus === 'method_select' ? (
                        <div className="max-w-xl mx-auto py-4">
                            <h3 className="font-bold text-slate-800 mb-4 text-center">Choose 2FA Method</h3>
                            <p className="text-sm text-slate-600 mb-6 text-center">Select how you want to receive your security codes.</p>
                            
                            <div className="space-y-4">
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${selectedMethod === 'TOTP' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                                    <input type="radio" name="mfaMethod" value="TOTP" checked={selectedMethod === 'TOTP'} onChange={() => setSelectedMethod('TOTP')} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500" />
                                    <div>
                                        <div className="font-bold text-slate-800">Authenticator App (Recommended)</div>
                                        <div className="text-sm text-slate-500">Google Authenticator, Authy, etc.</div>
                                    </div>
                                </label>
                                
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${selectedMethod === 'SMS' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                                    <input type="radio" name="mfaMethod" value="SMS" checked={selectedMethod === 'SMS'} onChange={() => setSelectedMethod('SMS')} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500" />
                                    <div>
                                        <div className="font-bold text-slate-800">SMS Text Message</div>
                                        <div className="text-sm text-slate-500">Receive codes via SMS to {user?.phoneNumber}</div>
                                    </div>
                                </label>
                                
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${selectedMethod === 'EMAIL' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                                    <input type="radio" name="mfaMethod" value="EMAIL" checked={selectedMethod === 'EMAIL'} onChange={() => setSelectedMethod('EMAIL')} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500" />
                                    <div>
                                        <div className="font-bold text-slate-800">Email Address</div>
                                        <div className="text-sm text-slate-500">Receive codes via email to {user?.email}</div>
                                    </div>
                                </label>
                            </div>
                            
                            <button 
                                onClick={() => fetchMfaSetup(selectedMethod)}
                                className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 shadow-sm"
                            >
                                Continue with {selectedMethod === 'TOTP' ? 'App' : selectedMethod}
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-10">
                            {/* Left Side: Instructions & QR Code or SMS/Email Status */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Step 1: {selectedMethod === 'TOTP' ? 'Scan the QR Code' : 'Check your ' + (selectedMethod === 'SMS' ? 'Phone' : 'Email')}</h3>
                                
                                {selectedMethod === 'TOTP' ? (
                                    <>
                                        <p className="text-sm text-slate-600 mb-6">
                                            Open your preferred authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator) and scan the QR code below.
                                        </p>
                                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex justify-center mb-4 min-h-62.5 items-center">
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
                                    </>
                                ) : (
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-center mb-4 items-center h-full">
                                        {mfaStatus === 'loading_qr' ? (
                                            <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
                                        ) : (
                                            <CheckCircle className="text-emerald-500 mb-4" size={48} />
                                        )}
                                        <p className="text-center text-slate-600">
                                            {mfaStatus === 'loading_qr' 
                                                ? `Sending code to your ${selectedMethod.toLowerCase()}...` 
                                                : `A 6-digit code has been sent to your ${selectedMethod.toLowerCase()}.`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Verification Form */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Step 2: Verify & Enable</h3>
                                <p className="text-sm text-slate-600 mb-6">
                                    Enter the 6-digit code you received to verify the setup and enable 2FA.
                                </p>

                                {mfaErrorMsg && mfaStatus === 'error' && (
                                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r flex items-start gap-2">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                        <span>{mfaErrorMsg}</span>
                                    </div>
                                )}

                                <form onSubmit={handleEnableMfa} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Verification Code</label>
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
                                    
                                    <div className="text-center mt-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setMfaStatus('method_select')}
                                            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
                                        >
                                            &larr; Choose a different method
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: PASSKEYS (WEBAUTHN) --- */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                            <Fingerprint size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Passkeys & Security Keys</h2>
                            <p className="text-slate-500 text-sm mt-1">Log in securely using your fingerprint, face scan, or a hardware security key.</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 text-center py-8">
                    {passkeySuccess && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center justify-center gap-2">
                            <CheckCircle size={18} />
                            <span>Passkey successfully registered! You can now use it to log in.</span>
                        </div>
                    )}
                    
                    {passkeyError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-center gap-2">
                            <AlertTriangle size={18} />
                            <span>{passkeyError}</span>
                        </div>
                    )}

                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Fingerprint size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Passwordless Sign-In</h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto">
                        Passkeys offer a faster, more secure way to log into your account without a password. Register your device now.
                    </p>

                    <button
                        onClick={handleRegisterPasskey}
                        disabled={isRegisteringPasskey}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 mx-auto shadow-sm disabled:opacity-50"
                    >
                        {isRegisteringPasskey ? (
                            <><Loader2 className="animate-spin" size={18} /> Registering...</>
                        ) : (
                            <><Fingerprint size={18} /> Register Passkey</>
                        )}
                    </button>
                </div>
            </div>

            {/* --- SECTION 3: ACTIVE SESSIONS --- */}
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