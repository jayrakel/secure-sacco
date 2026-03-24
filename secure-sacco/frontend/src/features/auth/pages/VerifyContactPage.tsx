import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, CheckCircle2, Loader2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { setupApi } from '../../setup/api/setup-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(err: unknown, fallback: string): string {
    if (
        typeof err === 'object' && err !== null &&
        'response' in err &&
        typeof (err as { response?: unknown }).response === 'object' &&
        (err as { response?: { data?: { message?: string } } }).response !== null
    ) {
        return (err as { response?: { data?: { message?: string } } })
            .response?.data?.message ?? fallback;
    }
    return fallback;
}

const inp = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ' +
    'transition bg-white';

const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ' +
    'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 ' +
    'disabled:cursor-not-allowed transition-colors';

const btnGhost = 'inline-flex items-center gap-1.5 text-xs text-slate-500 ' +
    'hover:text-emerald-600 transition-colors disabled:opacity-50';

// ─── Page ─────────────────────────────────────────────────────────────────────

const VerifyContactPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [emailSent, setEmailSent]       = useState(false);
    const [emailToken, setEmailToken]     = useState('');
    const [emailDone, setEmailDone]       = useState(user?.emailVerified ?? false);

    const [phoneSent, setPhoneSent]       = useState(false);
    const [phoneOtp, setPhoneOtp]         = useState('');
    const [phoneDone, setPhoneDone]       = useState(user?.phoneVerified ?? false);

    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [successMsg, setSuccessMsg]     = useState('');

    const act = async (fn: () => Promise<void>) => {
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await fn();
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const sendEmail = () => act(async () => {
        await setupApi.sendEmailVerification();
        setEmailSent(true);
        setSuccessMsg('Verification link sent — check your inbox.');
    });

    const confirmEmail = () => act(async () => {
        await setupApi.confirmEmail(emailToken.trim());
        setEmailDone(true);
        await refreshUser();
        setSuccessMsg('Email verified ✓');
    });

    const sendPhone = () => act(async () => {
        await setupApi.sendPhoneOtp();
        setPhoneSent(true);
        setSuccessMsg('OTP sent to your registered phone number.');
    });

    const confirmPhone = () => act(async () => {
        await setupApi.confirmPhone(phoneOtp.trim());
        setPhoneDone(true);
        await refreshUser();
        setSuccessMsg('Phone verified ✓');
    });

    const handleContinue = async () => {
        await refreshUser();
        navigate('/dashboard', { replace: true });
    };

    const bothDone = emailDone && phoneDone;

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">

            {/* ── Left branding panel ─────────────────────────────────────── */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-center items-center p-12 text-white relative overflow-hidden">
                <div className="relative z-10 text-center">
                    <div className="mb-8 inline-block p-6 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 shadow-2xl">
                        <ShieldCheck size={80} className="text-emerald-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">One Last Step</h1>
                    <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                        Verify your email and phone to secure your account and complete your setup.
                    </p>
                </div>
                {/* Background blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply blur-3xl opacity-20" />
                    <div className="absolute bottom-10 right-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply blur-3xl opacity-20" />
                </div>
            </div>

            {/* ── Right form panel ────────────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-8">
                <div className="w-full max-w-md mx-auto">

                    {/* Header */}
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-2xl mb-4">
                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Verify Your Contacts</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Confirm your email and phone to access the portal.
                        </p>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
                        </div>
                    )}

                    <div className="space-y-4">

                        {/* ── Email card ──────────────────────────────────── */}
                        <div className={`rounded-2xl border-2 p-5 transition-all ${
                            emailDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Mail className={`w-4 h-4 ${emailDone ? 'text-emerald-500' : 'text-slate-400'}`} />
                                    <span className="font-semibold text-slate-900 text-sm">Email Address</span>
                                    {user?.email && (
                                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                            {user.email}
                                        </code>
                                    )}
                                </div>
                                {emailDone && (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                        Verified ✓
                                    </span>
                                )}
                            </div>

                            {!emailDone && (
                                <div className="space-y-3">
                                    {!emailSent ? (
                                        <button onClick={sendEmail} disabled={loading} className={btnPrimary}>
                                            {loading
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Mail className="w-4 h-4" />}
                                            Send Verification Email
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                value={emailToken}
                                                onChange={e => setEmailToken(e.target.value)}
                                                className={inp}
                                                placeholder="Paste the token from your email..."
                                            />
                                            <button
                                                onClick={confirmEmail}
                                                disabled={loading || !emailToken.trim()}
                                                className={btnPrimary}
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                                            </button>
                                        </div>
                                    )}
                                    {emailSent && (
                                        <button onClick={sendEmail} disabled={loading} className={btnGhost}>
                                            <RefreshCw className="w-3 h-3" /> Resend email
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Phone card ──────────────────────────────────── */}
                        <div className={`rounded-2xl border-2 p-5 transition-all ${
                            phoneDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Phone className={`w-4 h-4 ${phoneDone ? 'text-emerald-500' : 'text-slate-400'}`} />
                                    <span className="font-semibold text-slate-900 text-sm">Phone Number</span>
                                    {user?.phoneNumber && (
                                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                            {user.phoneNumber}
                                        </code>
                                    )}
                                </div>
                                {phoneDone && (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                        Verified ✓
                                    </span>
                                )}
                            </div>

                            {!phoneDone && (
                                <div className="space-y-3">
                                    {!phoneSent ? (
                                        <button onClick={sendPhone} disabled={loading} className={btnPrimary}>
                                            {loading
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Phone className="w-4 h-4" />}
                                            Send OTP to Phone
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                value={phoneOtp}
                                                onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                                                className={`${inp} tracking-[0.4em] font-mono text-lg text-center`}
                                                placeholder="000000"
                                                maxLength={6}
                                            />
                                            <button
                                                onClick={confirmPhone}
                                                disabled={loading || phoneOtp.length < 6}
                                                className={btnPrimary}
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                                            </button>
                                        </div>
                                    )}
                                    {phoneSent && (
                                        <button onClick={sendPhone} disabled={loading} className={btnGhost}>
                                            <RefreshCw className="w-3 h-3" /> Resend OTP
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Continue button ─────────────────────────────── */}
                        {bothDone && (
                            <button
                                onClick={handleContinue}
                                className="w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-emerald-600 transition-colors"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Continue to Dashboard
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyContactPage;