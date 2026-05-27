import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, Lock, Mail, ChevronRight, AlertTriangle,
    RefreshCw, X, Loader2, Smartphone, ArrowLeft, Users,
    CalendarDays, MapPin,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthProvider';
import apiClient from '../../../shared/api/api-client';

const SLIDES = [
    {
        headline: 'Your savings, fully automated',
        sub: 'Track every contribution, penalty, and balance in real time.',
    },
    {
        headline: 'Loans managed with precision',
        sub: 'From application to disbursement — all in one place.',
    },
    {
        headline: 'Compliance made simple',
        sub: 'Automatic evaluations keep every member accountable.',
    },
    {
        headline: 'M-Pesa integrated natively',
        sub: 'Members deposit and repay directly from their phones.',
    },
];

export default function LoginPage() {
    const [identifier, setIdentifier]     = useState('');
    const [password, setPassword]         = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    const [error, setError]               = useState('');

    const [requiresMfa, setRequiresMfa]   = useState(false);
    const [mfaToken, setMfaToken]         = useState('');
    const [mfaCode, setMfaCode]           = useState('');

    const [showForgotModal, setShowForgotModal]   = useState(false);
    const [forgotEmail, setForgotEmail]           = useState('');
    const [forgotStatus, setForgotStatus]         = useState({ type: '', message: '' });
    const [showResend, setShowResend]             = useState(false);
    const [resendStatus, setResendStatus]         = useState('');

    // Branding
    const [saccoName, setSaccoName]         = useState('SACCO Portal');
    const [saccoTagline, setSaccoTagline]   = useState('Secure, Transparent, and Automated Management.');
    const [logoUrl, setLogoUrl]             = useState('');
    const [memberCount, setMemberCount]     = useState<number | null>(null);

    // Slides
    const [slide, setSlide]                 = useState(0);
    const [slideVisible, setSlideVisible]   = useState(true);

    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    // ── Fetch public branding ─────────────────────────────────────────────────
    useEffect(() => {
        axios.get('/api/v1/settings/sacco')
            .then(res => {
                if (res.data?.saccoName) {
                    setSaccoName(res.data.saccoName);
                    document.title = res.data.saccoName + ' — Secure SACCO';
                }
                if (res.data?.tagline)        setSaccoTagline(res.data.tagline);
                if (res.data?.logoUrl)        setLogoUrl(res.data.logoUrl);
                if (res.data?.faviconUrl) {
                    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
                    link.href = res.data.faviconUrl;
                }
            })
            .catch(() => {});

        // Try to get member count from public endpoint (gracefully ignore if fails)
        axios.get('/api/v1/members/count/public')
            .then(res => { if (res.data?.count) setMemberCount(res.data.count); })
            .catch(() => {});
    }, []);

    // ── Auto-advance slides ───────────────────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => {
            setSlideVisible(false);
            setTimeout(() => {
                setSlide(s => (s + 1) % SLIDES.length);
                setSlideVisible(true);
            }, 350);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    // ── Auth handlers ─────────────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalLoading(true); setError(''); setShowResend(false);
        try {
            const res = await apiClient.post('/auth/login', { identifier: identifier.trim(), password });
            if (res.data?.status === 'REQUIRES_MFA') { setMfaToken(res.data.mfaToken); setRequiresMfa(true); return; }
            const userData = await refreshUser();
            navigate(userData?.mustChangePassword ? '/change-password' : '/dashboard');
        } catch (err: unknown) {
            if ((err as {response?: {status?: number}})?.response?.status === 401 ||
                (err as {response?: {status?: number}})?.response?.status === 403) {
                setError('Invalid email/phone or password.');
            } else {
                const msg = (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Connection failed. Please try again.';
                setError(msg);
                if (msg.includes('verify your email')) setShowResend(true);
            }
        } finally { setLocalLoading(false); }
    };

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalLoading(true); setError('');
        try {
            await apiClient.post('/auth/login/mfa', { mfaToken, code: mfaCode.trim() });
            const userData = await refreshUser();
            navigate(userData?.mustChangePassword ? '/change-password' : '/dashboard');
        } catch (err: unknown) {
            setError((err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Invalid authenticator code. Please try again.');
        } finally { setLocalLoading(false); }
    };

    const cancelMfa = () => { setRequiresMfa(false); setMfaToken(''); setMfaCode(''); setPassword(''); setError(''); };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotStatus({ type: 'loading', message: 'Sending reset link...' });
        try {
            const res = await apiClient.post('/auth/forgot-password', { email: forgotEmail });
            setForgotStatus({ type: 'success', message: res.data.message || 'If an account exists, a reset link has been sent.' });
            setForgotEmail('');
        } catch (err: unknown) {
            setForgotStatus({ type: 'error', message: (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to request password reset.' });
        }
    };

    const handleResend = () => {
        setResendStatus('Sending...');
        setTimeout(() => { setResendStatus('Sent! Check your inbox.'); setShowResend(false); }, 1000);
    };

    const inputCls = 'w-full border border-slate-200 bg-slate-50 px-4 py-3 pl-11 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition';

    // ── Branding panel (shared by desktop left + mobile top) ─────────────────
    const BrandingContent = ({ compact = false }: { compact?: boolean }) => (
        <div className={`relative z-10 text-center ${compact ? 'px-8 pt-10 pb-8' : 'flex flex-col items-center h-full justify-between py-14 px-12'}`}>
            {/* Logo circle */}
            <div className={`inline-block bg-white rounded-full shadow-lg ${compact ? 'p-4 mb-5' : 'p-6 mb-6'}`}>
                {logoUrl
                    ? <img src={logoUrl} alt={saccoName} className={compact ? 'w-16 h-16 object-contain' : 'w-28 h-28 object-contain'} />
                    : <ShieldCheck className="text-emerald-400" size={compact ? 52 : 80} />}
            </div>

            {/* SACCO name */}
            <h1 className={`font-bold text-white tracking-tight ${compact ? 'text-3xl mb-1' : 'text-5xl mb-3'}`}>
                {saccoName}
            </h1>

            {/* Divider */}
            <div className={`flex items-center gap-3 ${compact ? 'my-4 px-4' : 'my-5 w-full max-w-xs mx-auto'}`}>
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-xs tracking-wider uppercase">Management Portal</span>
                <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Animated slide */}
            <div className={`transition-all duration-350 ease-in-out ${compact ? 'min-h-[64px]' : 'min-h-[80px] max-w-sm mx-auto'}`}
                 style={{ opacity: slideVisible ? 1 : 0, transform: slideVisible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}>
                <p className={`text-white font-semibold leading-snug ${compact ? 'text-base' : 'text-xl'}`}>{SLIDES[slide].headline}</p>
                <p className={`text-slate-400 mt-1 leading-relaxed ${compact ? 'text-sm' : 'text-base'}`}>{SLIDES[slide].sub}</p>
            </div>

            {/* Dot indicators */}
            <div className={`flex justify-center gap-2 ${compact ? 'mt-5' : 'mt-6'}`}>
                {SLIDES.map((_, i) => (
                    <button key={i} onClick={() => setSlide(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-6 bg-[var(--color-primary)]' : 'w-1.5 bg-slate-600'}`} />
                ))}
            </div>

            {/* Bottom stats — desktop only */}
            {!compact && (
                <div className="w-full border-t border-slate-800 pt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Users size={12} className="text-slate-500" />
                        </div>
                        <div className="text-white font-semibold text-lg">
                            {memberCount !== null ? memberCount : '—'}
                        </div>
                        <div className="text-slate-500 text-xs">Members</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <CalendarDays size={12} className="text-slate-500" />
                        </div>
                        <div className="text-white font-semibold text-lg">2022</div>
                        <div className="text-slate-500 text-xs">Established</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <MapPin size={12} className="text-slate-500" />
                        </div>
                        <div className="text-white font-semibold text-lg">Dandora</div>
                        <div className="text-slate-500 text-xs">Nairobi, Kenya</div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">

            {/* ── DESKTOP LEFT PANEL ──────────────────────────────────────── */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col">
                {/* Blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                    <div className="absolute top-10 right-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                    <div className="absolute bottom-10 left-20 w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
                </div>
                <BrandingContent compact={false} />
            </div>

            {/* ── MOBILE HERO ──────────────────────────────────────────────── */}
            <div className="lg:hidden bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                </div>
                <BrandingContent compact={true} />
            </div>

            {/* ── FORM COLUMN ──────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col lg:bg-slate-50">
                <div className="flex-1 flex flex-col justify-center px-6 py-8 lg:px-12">
                    <div className="w-full max-w-sm mx-auto">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

                            {/* Desktop: small logo in form */}
                            <div className="hidden lg:flex items-center gap-2 mb-6">
                                {logoUrl
                                    ? <img src={logoUrl} alt={saccoName} className="w-6 h-6 object-contain" />
                                    : <ShieldCheck size={18} className="text-emerald-500" />}
                                <span className="text-sm font-semibold text-slate-800">{saccoName}</span>
                            </div>

                            {requiresMfa ? (
                                <>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">Two-factor auth</h2>
                                    <p className="text-slate-500 text-sm mb-6">Enter the 6-digit code from your authenticator app.</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">Welcome back</h2>
                                    <p className="text-slate-500 text-sm mb-6">Enter your credentials to access the portal.</p>
                                </>
                            )}

                            {error && (
                                <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
                                    <div className="flex gap-2 items-center"><AlertTriangle size={15} className="shrink-0" /> {error}</div>
                                    {showResend && (
                                        <div className="mt-2.5 pt-2.5 border-t border-red-100">
                                            <button onClick={handleResend}
                                                    className="text-slate-900 underline font-semibold hover:text-blue-600 flex items-center gap-1.5 text-sm">
                                                <RefreshCw size={13} /> Resend Verification Link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {resendStatus && (
                                <div className="mb-5 p-3 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100">{resendStatus}</div>
                            )}

                            {requiresMfa ? (
                                <form onSubmit={handleMfaVerify} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Authenticator code</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                                            <input type="text" required maxLength={6} autoFocus
                                                   className={`${inputCls} tracking-widest text-center font-mono`}
                                                   value={mfaCode}
                                                   onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                                   placeholder="123456" />
                                        </div>
                                    </div>
                                    <button disabled={localLoading || mfaCode.length < 6}
                                            className="w-full bg-slate-900 hover:bg-[var(--color-primary)] text-white font-semibold py-3 rounded-xl transition flex justify-center gap-2 items-center disabled:opacity-50 text-sm">
                                        {localLoading ? <><Loader2 className="animate-spin" size={16} /> Verifying...</> : <>Verify &amp; Sign in <ChevronRight size={16} /></>}
                                    </button>
                                    <button type="button" onClick={cancelMfa} disabled={localLoading}
                                            className="w-full flex justify-center items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                                        <ArrowLeft size={14} /> Back to sign in
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email or phone number</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                                            <input type="text" required className={inputCls}
                                                   value={identifier} onChange={e => setIdentifier(e.target.value)}
                                                   placeholder="you@example.com or +254..." />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-sm font-medium text-slate-700">Password</label>
                                            <button type="button" onClick={() => setShowForgotModal(true)}
                                                    className="text-xs font-semibold text-[var(--color-accent-forgot)] hover:underline">
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                                            <input type="password" required className={inputCls}
                                                   value={password} onChange={e => setPassword(e.target.value)} />
                                        </div>
                                    </div>
                                    <button disabled={localLoading}
                                            className="w-full bg-slate-900 hover:bg-[var(--color-primary)] text-white font-bold py-3.5 rounded-xl transition flex justify-center gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                                        {localLoading ? <><Loader2 className="animate-spin" size={20} /> Signing in...</> : <>Sign In <ChevronRight size={20} /></>}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="w-full text-center py-6 text-slate-400 text-sm border-t border-slate-200 mt-4">
                            <p>© {new Date().getFullYear()} {saccoName}. All rights reserved.</p>
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
            </div>

            {/* ── FORGOT PASSWORD MODAL ─────────────────────────────────────── */}
            {showForgotModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowForgotModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full">
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
                            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${forgotStatus.type === 'success' ? 'bg-green-50 text-green-700' : forgotStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                {forgotStatus.type === 'loading' ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                                {forgotStatus.message}
                            </div>
                        )}
                        <form onSubmit={handleForgotPassword}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input type="email" required
                                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                       value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button"
                                        onClick={() => { setShowForgotModal(false); setForgotStatus({ type: '', message: '' }); }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={forgotStatus.type === 'loading'}
                                        className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
                                    {forgotStatus.type === 'loading' ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}