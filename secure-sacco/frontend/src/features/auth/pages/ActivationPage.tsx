import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth-api';
import { Shield, KeyRound, Smartphone, CheckCircle2 } from 'lucide-react';

const ActivationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [step, setStep] = useState<'VERIFYING' | 'OTP_ENTRY' | 'SUCCESS' | 'ERROR'>('VERIFYING');
    const [errorMsg, setErrorMsg] = useState('');

    // Form State
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setStep('ERROR');
            setErrorMsg('Invalid or missing activation token.');
            return;
        }

        // On load, verify the email token and trigger the SMS
        const verifyToken = async () => {
            try {
                await authApi.verifyActivationEmail(token);
                setStep('OTP_ENTRY');
            } catch (err: any) {
                setStep('ERROR');
                setErrorMsg(err.response?.data?.message || 'Token is invalid or has expired.');
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setErrorMsg('Password must be at least 8 characters long');
            return;
        }

        setIsSubmitting(true);
        try {
            await authApi.completeActivation({
                token: token!,
                otp,
                newPassword: password
            });
            setStep('SUCCESS');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Failed to activate account. Please check your OTP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    S
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
                    Account Activation
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">

                    {step === 'VERIFYING' && (
                        <div className="text-center py-6">
                            <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-slate-900">Verifying Link...</h3>
                            <p className="text-sm text-slate-500 mt-2">Please wait while we secure your session.</p>
                        </div>
                    )}

                    {step === 'ERROR' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-2">Activation Failed</h3>
                            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{errorMsg}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="mt-6 w-full flex justify-center py-2.5 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                            >
                                Return to Login
                            </button>
                        </div>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Account Activated!</h3>
                            <p className="text-sm text-slate-600 mb-6">Your portal access is now fully secured and active.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex justify-center py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                            >
                                Continue to Login
                            </button>
                        </div>
                    )}

                    {step === 'OTP_ENTRY' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-full mb-3">
                                    <Smartphone size={24} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Email Verified!</h3>
                                <p className="text-sm text-slate-500 mt-1">We've sent a 6-digit OTP to your registered phone number. Enter it below to secure your account.</p>
                            </div>

                            {errorMsg && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">SMS OTP Code</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center tracking-[0.5em] font-mono text-xl"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numbers only
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <KeyRound size={16} className="text-slate-400" />
                                    <h4 className="text-sm font-semibold text-slate-700">Set your Portal Password</h4>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || otp.length !== 6 || !password || !confirmPassword}
                                className="w-full flex justify-center py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? 'Activating...' : 'Complete Activation'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivationPage;