import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import apiClient from '../../../shared/api/api-client';
import { useAuth } from '../context/AuthProvider';

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent]         = useState(false);
    const [showNew, setShowNew]                 = useState(false);
    const [showConfirm, setShowConfirm]         = useState(false);
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState('');
    const [success, setSuccess]                 = useState(false);

    const navigate = useNavigate();
    const { refreshUser, user } = useAuth();

    const getStrength = (pw: string): { score: number; label: string; color: string } => {
        if (!pw) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pw.length >= 8)              score++;
        if (pw.length >= 12)             score++;
        if (/[A-Z]/.test(pw))            score++;
        if (/[0-9]/.test(pw))            score++;
        if (/[^A-Za-z0-9]/.test(pw))    score++;
        if (score <= 2) return { score, label: 'Weak',   color: 'bg-red-500' };
        if (score <= 3) return { score, label: 'Fair',   color: 'bg-yellow-400' };
        if (score <= 4) return { score, label: 'Good',   color: 'bg-blue-500' };
        return              { score, label: 'Strong', color: 'bg-emerald-500' };
    };

    const strength = getStrength(newPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
        if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }

        setLoading(true);
        try {
            await apiClient.post('/auth/change-password', { currentPassword, newPassword });
            setSuccess(true);
            await refreshUser(); // clears mustChangePassword flag from state
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">
            {/* Left branding panel */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-center items-center p-12 text-white relative overflow-hidden">
                <div className="relative z-10 text-center">
                    <div className="mb-8 inline-block p-6 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 shadow-2xl">
                        <ShieldCheck size={80} className="text-emerald-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Security Update Required</h1>
                    <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                        For your protection, you must set a new password before accessing the portal.
                    </p>
                </div>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                    <div className="absolute bottom-10 right-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-8">
                <div className="w-full max-w-md mx-auto">
                    <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100">

                        <div className="mb-8 text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
                                <Lock className="text-amber-600" size={28} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Change Your Password</h2>
                            {user && (
                                <p className="text-slate-500 text-sm mt-1">
                                    Signed in as <span className="font-semibold text-slate-700">{user.email}</span>
                                </p>
                            )}
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-left">
                                Your account is using a temporary password. Please set a new secure password to continue.
                            </div>
                        </div>

                        {success ? (
                            <div className="text-center py-6">
                                <CheckCircle2 className="text-emerald-500 mx-auto mb-3" size={48} />
                                <p className="text-lg font-semibold text-slate-800">Password Changed!</p>
                                <p className="text-slate-500 text-sm mt-1">Redirecting to your dashboard...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r flex items-center gap-2">
                                        <AlertTriangle size={16} /> {error}
                                    </div>
                                )}

                                {/* Current password */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Current Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input type={showCurrent ? 'text' : 'password'} required autoFocus
                                               className="w-full border border-slate-300 p-3 pl-10 pr-10 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition"
                                               value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                                               placeholder="Your temporary / current password" />
                                        <button type="button" onClick={() => setShowCurrent(v => !v)}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* New password */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input type={showNew ? 'text' : 'password'} required
                                               className="w-full border border-slate-300 p-3 pl-10 pr-10 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition"
                                               value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                               placeholder="Choose a strong password" />
                                        <button type="button" onClick={() => setShowNew(v => !v)}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {newPassword && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 h-1.5">
                                                {[1,2,3,4,5].map(i => (
                                                    <div key={i} className={`flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-slate-200'}`} />
                                                ))}
                                            </div>
                                            <p className={`text-xs mt-1 font-medium ${strength.score <= 2 ? 'text-red-500' : strength.score <= 3 ? 'text-yellow-600' : strength.score <= 4 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                {strength.label}
                                            </p>
                                        </div>
                                    )}
                                    <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                                        <li className={newPassword.length >= 8 ? 'text-emerald-600' : ''}>{newPassword.length >= 8 ? '✓' : '·'} At least 8 characters</li>
                                        <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-600' : ''}>{/[A-Z]/.test(newPassword) ? '✓' : '·'} One uppercase letter</li>
                                        <li className={/[0-9]/.test(newPassword) ? 'text-emerald-600' : ''}>{/[0-9]/.test(newPassword) ? '✓' : '·'} One number</li>
                                        <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-600' : ''}>{/[^A-Za-z0-9]/.test(newPassword) ? '✓' : '·'} One special character</li>
                                    </ul>
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Confirm New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input type={showConfirm ? 'text' : 'password'} required
                                               className={`w-full border p-3 pl-10 pr-10 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition ${confirmPassword && confirmPassword !== newPassword ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                               value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                               placeholder="Repeat your new password" />
                                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                                    )}
                                </div>

                                <button type="submit"
                                        disabled={loading || (!!confirmPassword && confirmPassword !== newPassword)}
                                        className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                                    {loading ? (
                                        <><Loader2 className="animate-spin" size={20} /><span>Updating Password...</span></>
                                    ) : (
                                        <><ShieldCheck size={20} /><span>Set New Password</span></>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}