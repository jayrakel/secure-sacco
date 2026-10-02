import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ChevronRight, AlertTriangle, RefreshCw, X, Loader2, Smartphone, ArrowLeft, LogIn, Fingerprint } from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../context/AuthProvider';
import apiClient from '../../../shared/api/api-client';
import { webAuthnApi } from '../api/webauthn-api';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    const [error, setError] = useState('');

    // --- NEW: MFA UI States ---
    const [requiresMfa, setRequiresMfa] = useState(false);
    const [mfaToken, setMfaToken] = useState('');
    const [mfaCode, setMfaCode] = useState('');

    // UI states for Forgot Password
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStatus, setForgotStatus] = useState({ type: '', message: '' });
    const [showResend, setShowResend] = useState(false);
    const [resendStatus, setResendStatus] = useState('');

    // Saved Accounts for Dropdown
    const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
    const [showAccountsDropdown, setShowAccountsDropdown] = useState(false);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('mfaToken');
        if (token) {
            setMfaToken(token);
            setRequiresMfa(true);
        }
        
        const errorParam = searchParams.get('error');
        if (errorParam) {
            switch(errorParam) {
                case 'no_email':
                    setError("Google did not provide an email address.");
                    break;
                case 'account_not_found':
                    setError("No account found linked to that Google email.");
                    break;
                case 'staff_google_login_disabled':
                    setError("Staff and Admins cannot log in with Google for security reasons.");
                    break;
                default:
                    setError("Google Login failed.");
            }
        }
    }, [searchParams]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('recent_accounts');
            if (stored) setSavedAccounts(JSON.parse(stored));
        } catch { /* ignore */ }
    }, []);

    // SACCO branding — seeded from localStorage cache (same key SettingsProvider writes)
    // so returning users see the real branding instantly, with no hardcoded placeholder flash.
    const [saccoName, setSaccoName] = useState<string>(() => {
        try {
            const cached = localStorage.getItem('saccoSettingsCache');
            if (cached) return JSON.parse(cached)?.saccoName || '';
        } catch { /* ignore */ }
        return '';
    });
    const [saccoTagline, setSaccoTagline] = useState<string>(() => {
        try {
            const cached = localStorage.getItem('saccoSettingsCache');
            if (cached) return JSON.parse(cached)?.tagline || '';
        } catch { /* ignore */ }
        return '';
    });
    const [logoUrl, setLogoUrl] = useState<string>(() => {
        try {
            const cached = localStorage.getItem('saccoSettingsCache');
            if (cached) return JSON.parse(cached)?.logoUrl || '';
        } catch { /* ignore */ }
        return '';
    });
    // True once the live API call has resolved (or failed). Stays false on first-ever
    // visits where the cache is empty, so we show a skeleton instead of a wrong name.
    const [brandingLoaded, setBrandingLoaded] = useState<boolean>(() => {
        try {
            const cached = localStorage.getItem('saccoSettingsCache');
            return !!cached && !!JSON.parse(cached)?.saccoName;
        } catch { /* ignore */ }
        return false;
    });



    useEffect(() => {
        axios.get('/api/v1/settings/sacco')
            .then(res => {
                if (res.data?.saccoName) {
                    setSaccoName(res.data.saccoName);
                    document.title = res.data.saccoName + ' - Secure SACCO';
                }
                if (res.data?.tagline)   setSaccoTagline(res.data.tagline);
                if (res.data?.logoUrl)   setLogoUrl(res.data.logoUrl);
                if (res.data?.faviconUrl) {
                    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                    if (!link) {
                        link = document.createElement('link');
                        link.rel = 'icon';
                        document.head.appendChild(link);
                    }
                    link.href = res.data.faviconUrl;
                }
            })
            .catch((error) => {
                console.error('⚠ Failed to fetch settings on login page:', error.response?.status, error.message);
            })
            .finally(() => {
                setBrandingLoaded(true);
            });
    }, []);

    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard';
    const { refreshUser } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalLoading(true);
        setError('');
        setShowResend(false);

        try {
            // 1. Send credentials to backend
            const response = await apiClient.post('/auth/login', {
                identifier: identifier.trim(),
                password,
            });

            // --- 2. INTERCEPT MFA CHALLENGE ---
            if (response.data?.status === 'REQUIRES_MFA') {
                setMfaToken(response.data.mfaToken);
                setRequiresMfa(true);
                return; // Stop here and wait for the user to enter the code
            }

            // 3. Normal Login Success Flow — use returned user to decide where to go
            const userData = await refreshUser();

            // Save the account identifier to local storage
            const updatedAccounts = Array.from(new Set([identifier.trim(), ...savedAccounts])).slice(0, 5);
            setSavedAccounts(updatedAccounts);
            localStorage.setItem('recent_accounts', JSON.stringify(updatedAccounts));

            navigate(userData?.mustChangePassword ? '/change-password' : redirectTo);

        } catch (err: unknown) {
            console.error("Login Error:", err);
            if ((err as {response?: {status?: number}})?.response?.status === 401 || (err as {response?: {status?: number}})?.response?.status === 403) {
                setError('Invalid email/phone or password.');
            } else {
                const msg = (err as {response?: {data?: {message?: string}}})?.response?.data?.message || "Connection failed. Please try again.";
                setError(msg);
                if (msg.includes("verify your email")) setShowResend(true);
            }
        } finally {
            setLocalLoading(false);
        }
    };

    const handlePasskeyLogin = async () => {
        if (!identifier) {
            setError('Please enter your email to use Passkey login.');
            return;
        }
        setLocalLoading(true);
        setError('');
        
        try {
            // 1. Get options from server
            const optionsResp = await webAuthnApi.startLogin(identifier.trim());
            const options = typeof optionsResp === 'string' ? JSON.parse(optionsResp) : optionsResp;
            
            // 2. Pass options to authenticator
            const authResp = await startAuthentication(options);
            
            // 3. Send response back to server
            const response = await webAuthnApi.finishLogin(JSON.stringify(authResp));
            
            // --- INTERCEPT MFA CHALLENGE ---
            if (response?.status === 'REQUIRES_MFA') {
                setMfaToken(response.mfaToken);
                setRequiresMfa(true);
                return;
            }
            
            // 4. Normal Login Success Flow
            const userData = await refreshUser();
            const updatedAccounts = Array.from(new Set([identifier.trim(), ...savedAccounts])).slice(0, 5);
            setSavedAccounts(updatedAccounts);
            localStorage.setItem('recent_accounts', JSON.stringify(updatedAccounts));
            
            navigate(userData?.mustChangePassword ? '/change-password' : redirectTo);
            
        } catch (err) {
            console.error(err);
            const error = err as { name?: string; response?: { data?: { message?: string } }; message?: string }; // Bypass for Axios/DOMException typing
            if (error?.name === 'NotAllowedError') {
                setError('Passkey login was cancelled or timed out.');
            } else {
                setError(error?.response?.data?.message || error?.message || 'Passkey login failed. You may need to register this device first.');
            }
        } finally {
            setLocalLoading(false);
        }
    };

    // --- NEW: Handle the second step of MFA Login ---
    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalLoading(true);
        setError('');

        try {
            await apiClient.post('/auth/login/mfa', {
                mfaToken,
                code: mfaCode.trim()
            });

            // Successfully validated MFA, fetch user and redirect
            const userData = await refreshUser();
            navigate(userData?.mustChangePassword ? '/change-password' : redirectTo);
        } catch (err: unknown) {
            setError((err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Invalid authenticator code. Please try again.');
        } finally {
            setLocalLoading(false);
        }
    };

    const cancelMfa = () => {
        setRequiresMfa(false);
        setMfaToken('');
        setMfaCode('');
        setPassword(''); // Clear password for security if they go back
        setError('');
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotStatus({ type: 'loading', message: 'Sending reset link...' });

        try {
            const response = await apiClient.post('/auth/forgot-password', { email: forgotEmail });
            setForgotStatus({
                type: 'success',
                message: response.data.message || 'If an account exists, a reset link has been sent.'
            });
            setForgotEmail('');
        } catch (err: unknown) {
            setForgotStatus({
                type: 'error',
                message: (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to request password reset. Please try again.'
            });
        }
    };

    const handleResend = async () => {
        if (!identifier) return;
        setResendStatus('Sending...');
        try {
            setTimeout(() => {
                setResendStatus('Sent! Check your inbox.');
                setShowResend(false);
            }, 1000);
        } catch {
            setResendStatus('Failed to send.');
        }
    };

    // Gate: don't render the page at all until branding is resolved
    if (!brandingLoaded) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
                <div className="relative flex items-center justify-center mb-6">
                    {/* Outer ring */}
                    <div className="w-16 h-16 rounded-full border-4 border-slate-700" />
                    {/* Spinning arc */}
                    <div className="absolute w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                    {/* Inner dot */}
                    <div className="absolute w-4 h-4 rounded-full bg-emerald-500 opacity-80" />
                </div>
                <p className="text-slate-400 text-sm tracking-wide animate-pulse">Loading&hellip;</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">

            {/* Left Side Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-center items-center p-12 text-white relative">
                <div className="relative z-10 text-center">
                    <div className="mb-8 inline-block p-6 bg-white rounded-full">
                        {logoUrl ? (
                            <img src={logoUrl} alt={saccoName} className="w-28 h-28 object-contain" />
                        ) : (
                            <ShieldCheck size={80} className="text-emerald-400" />
                        )}
                    </div>
                    <h1 className="text-5xl font-bold mb-4 tracking-tight">{saccoName}</h1>
                    <p className="text-slate-400 text-xl max-w-md mx-auto leading-relaxed">
                        {saccoTagline}
                    </p>
                </div>
                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute top-10 right-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-10 left-20 w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>
            </div>

            {/* Right Side Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 relative">
                <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
                    <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100">

                        <div className="mb-6 flex justify-center">
                            <div className="flex items-center gap-3 text-slate-800">
                                {logoUrl ? (
                                    <img src={logoUrl} alt={saccoName} className="w-8 h-8 object-contain" />
                                ) : (
                                    <ShieldCheck className="text-emerald-600" size={32} />
                                )}
                                <span className="text-xl font-bold">{saccoName}</span>
                            </div>
                        </div>

                        {requiresMfa ? (
                            <>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Two-Factor Auth</h2>
                                <p className="text-slate-500 mb-8 text-center">Enter the 6-digit code from your authenticator app.</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Welcome Back</h2>
                                <p className="text-slate-500 mb-8 text-center">Enter your credentials to access the portal.</p>
                            </>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r">
                                <div className="flex gap-2 items-center">
                                    <AlertTriangle size={18} /> {error}
                                </div>
                                {showResend && (
                                    <div className="mt-3 pt-3 border-t border-red-100">
                                        <button onClick={handleResend} className="text-slate-900 underline font-bold hover:text-emerald-600 flex items-center gap-2">
                                            <RefreshCw size={14} /> Resend Verification Link
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {resendStatus && (
                            <div className="mb-6 p-4 bg-blue-50 text-blue-700 text-sm rounded border border-blue-100">{resendStatus}</div>
                        )}

                        {requiresMfa ? (
                            /* --- MFA ENTRY FORM --- */
                            <form onSubmit={handleMfaVerify} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Authenticator Code</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-3 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            autoFocus
                                            className="w-full border border-slate-300 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition tracking-widest text-center text-lg font-mono"
                                            value={mfaCode}
                                            onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                                            placeholder="123456"
                                        />
                                    </div>
                                </div>

                                <button
                                    disabled={localLoading || mfaCode.length < 6}
                                    className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition flex justify-center gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {localLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Verifying...</span>
                                        </div>
                                    ) : (
                                        <>Verify & Login <ChevronRight size={20} /></>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={cancelMfa}
                                    disabled={localLoading}
                                    className="w-full flex justify-center items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition mt-4"
                                >
                                    <ArrowLeft size={16} /> Back to standard login
                                </button>
                            </form>
                        ) : (
                            /* --- STANDARD LOGIN FORM --- */
                            <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email, Phone, or Member Number</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full border border-slate-300 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition"
                                            value={identifier}
                                            onFocus={() => setShowAccountsDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowAccountsDropdown(false), 200)}
                                            onChange={e => {
                                                setIdentifier(e.target.value);
                                                setShowAccountsDropdown(true);
                                            }}
                                            placeholder="admin@jaytechwave.org, +254..., or BVL-..."
                                            autoComplete="off"
                                        />
                                        {showAccountsDropdown && savedAccounts.filter(acc => acc.toLowerCase().includes(identifier.toLowerCase())).length > 0 && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                                                {savedAccounts
                                                    .filter(acc => acc.toLowerCase().includes(identifier.toLowerCase()))
                                                    .map((acc, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b last:border-0 border-slate-100 flex items-center gap-2"
                                                        onClick={() => {
                                                            setIdentifier(acc);
                                                            setShowAccountsDropdown(false);
                                                        }}
                                                    >
                                                        <Mail className="w-4 h-4 text-slate-400" />
                                                        {acc}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                                        <input
                                            type="password"
                                            required
                                            className="w-full border border-slate-300 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(true)}
                                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    disabled={localLoading}
                                    className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition flex justify-center gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {localLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Signing In...</span>
                                        </div>
                                    ) : (
                                        <><LogIn size={20} /> Sign In</>
                                    )}
                                </button>
                                
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={handlePasskeyLogin}
                                        disabled={localLoading || !identifier}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-xl transition flex justify-center gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200"
                                    >
                                        <Fingerprint size={20} className="text-blue-600" />
                                        Log in with Passkey
                                    </button>
                                </div>
                                
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-slate-500 font-medium">Or continue with</span>
                                    </div>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}
                                    className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-3"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Google
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* --- FORGOT PASSWORD MODAL --- */}
                {showForgotModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setShowForgotModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center mb-6">
                                <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                    <Lock size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Reset Password</h3>
                                <p className="text-slate-500 text-sm mt-1">Enter your email to receive a secure reset link.</p>
                            </div>

                            {forgotStatus.message && (
                                <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${forgotStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {forgotStatus.type === 'loading' ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                                    {forgotStatus.message}
                                </div>
                            )}

                            <form onSubmit={handleForgotPassword}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                    />
                                </div>

                                {forgotStatus.message && (
                                    <div className={`mb-4 text-sm p-3 rounded ${forgotStatus.type === 'success' ? 'bg-green-50 text-green-700' : forgotStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {forgotStatus.message}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgotModal(false); setForgotStatus({ type: '', message: '' }); }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Send Reset Link
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="w-full text-center py-6 text-slate-400 text-sm mt-auto border-t border-slate-200">
                    <p>© {new Date().getFullYear()} {saccoName || 'Secure SACCO'}. All rights reserved.</p>
                    <div className="flex justify-center gap-4 mt-2">
                        <a href="/privacy-policy" className="hover:text-emerald-600 transition">Privacy Policy</a>
                        <span>•</span>
                        <a href="/terms-of-service" className="hover:text-emerald-600 transition">Terms of Service</a>
                        <span>•</span>
                        <a href="/support" className="hover:text-emerald-600 transition">Support</a>
                    </div>
                </div>

            </div>
        </div>
    );
}