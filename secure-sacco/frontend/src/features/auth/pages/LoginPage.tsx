import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ChevronRight, AlertTriangle, RefreshCw, X, ArrowRight, Loader2 } from 'lucide-react';

// Using our existing context and API client
import { useAuth } from '../context/AuthProvider';
import apiClient from '../../../shared/api/api-client';

// Stubbing out the Settings context for now
// import { useSettings } from '../context/SettingsContext';
// import BrandedSpinner from '../components/BrandedSpinner';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState(''); // Changed from email to identifier
    const [password, setPassword] = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    const [error, setError] = useState('');

    // UI states for future features
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStatus, setForgotStatus] = useState({ type: '', message: '' });
    const [showResend, setShowResend] = useState(false);
    const [resendStatus, setResendStatus] = useState('');

    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    // Fallback constants until SettingsContext is implemented
    const SACCO_NAME = "Secure SACCO";
    const SACCO_TAGLINE = "Secure, Transparent, and Automated Management.";
    const logoUrl = null;
    const iconUrl = null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalLoading(true);
        setError('');
        setShowResend(false);

        try {
            // 1. Send credentials to backend
            await apiClient.post('/auth/login', {
                identifier: identifier.trim(),
                password,
            });

            // 2. Fetch the user profile
            await refreshUser();

            // 3. Redirect Logic (Simplified for now)
            navigate('/dashboard');

            /* TODO: Implement RBAC Routing once permissions are mapped in the frontend
            const userData = authService.getCurrentUser();
            if (userData?.systemSetupRequired) { navigate('/system-setup'); return; }
            if (userData?.mustChangePassword) { navigate('/change-password'); return; }

            switch (userData?.role) {
                case 'ADMIN': navigate('/admin-dashboard'); break;
                // ... other roles
                default: navigate('/member-dashboard'); break;
            }
            */

        } catch (err: any) {
            console.error("Login Error:", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Invalid email/phone or password.');
            } else {
                const msg = err.response?.data?.message || "Connection failed. Please try again.";
                setError(msg);
                if (msg.includes("verify your email")) setShowResend(true);
            }
        } finally {
            setLocalLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotStatus({ type: 'loading', message: 'Sending reset link...' });

        try {
            // Using 'forgotEmail' here
            const response = await apiClient.post('/auth/forgot-password', { email: forgotEmail });

            setForgotStatus({
                type: 'success',
                message: response.data.message || 'If an account exists, a reset link has been sent.'
            });
            setForgotEmail(''); // Clear the input

        } catch (err: any) {
            setForgotStatus({
                type: 'error',
                message: err.response?.data?.message || 'Failed to request password reset. Please try again.'
            });
        }
    };

    const handleResend = async () => {
        if (!identifier) return;
        setResendStatus('Sending...');
        try {
            // await apiClient.post('/auth/resend-verification', { identifier });
            setTimeout(() => {
                setResendStatus('Sent! Check your inbox.');
                setShowResend(false);
            }, 1000);
        } catch (err) {
            setResendStatus('Failed to send.');
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">
            {/* Left Side Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-center items-center p-12 text-white relative">
                <div className="relative z-10 text-center">
                    <div className="mb-8 inline-block p-6 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 shadow-2xl">
                        {iconUrl ? (
                            <img src={iconUrl} alt="Icon" className="w-24 h-24 object-contain" />
                        ) : (
                            <ShieldCheck size={80} className="text-emerald-400" />
                        )}
                    </div>
                    <h1 className="text-5xl font-bold mb-4 tracking-tight">{SACCO_NAME}</h1>
                    <p className="text-slate-400 text-xl max-w-md mx-auto leading-relaxed">
                        {SACCO_TAGLINE}
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
                            {logoUrl ? (
                                <img src={logoUrl} alt={SACCO_NAME} className="h-16 object-contain" />
                            ) : (
                                <div className="flex items-center gap-2 text-slate-800">
                                    <ShieldCheck className="text-emerald-600" size={32} />
                                    <span className="text-xl font-bold">{SACCO_NAME}</span>
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Welcome Back</h2>
                        <p className="text-slate-500 mb-8 text-center">Enter your credentials to access the portal.</p>

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

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email or Phone Number</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-slate-300 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition"
                                        value={identifier}
                                        onChange={e => setIdentifier(e.target.value)}
                                        placeholder="admin@jaytechwave.org or +254..."
                                    />
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
                                        <span>Verifying...</span>
                                    </div>
                                ) : (
                                    <>Sign In <ChevronRight size={20} /></>
                                )}
                            </button>
                        </form>
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
                                        disabled={forgotStatus.type === 'loading'}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {forgotStatus.type === 'loading' ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="w-full text-center py-6 text-slate-400 text-sm mt-auto border-t border-slate-200">
                    <p>© {new Date().getFullYear()} {SACCO_NAME}. All rights reserved.</p>
                    <div className="flex justify-center gap-4 mt-2">
                        <a href="#" className="hover:text-emerald-600 transition">Privacy Policy</a>
                        <span>•</span>
                        <a href="#" className="hover:text-emerald-600 transition">Terms of Service</a>
                        <span>•</span>
                        <a href="#" className="hover:text-emerald-600 transition">Support</a>
                    </div>
                </div>

            </div>
        </div>
    );
}