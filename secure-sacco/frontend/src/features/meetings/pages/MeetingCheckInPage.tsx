import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, QrCode, LogIn, Loader2 } from 'lucide-react';
import apiClient from '../../../shared/api/api-client';
import { useAuth } from '../../auth/context/AuthProvider';

interface MeetingInfo {
    meetingId: string;
    title: string;
    description: string;
    meetingType: string;
    startAt: string;
    endAt: string;
    status: string;
    lateAfterMinutes: number;
    qrToken: string;
}

interface CheckInResult {
    status: 'PRESENT' | 'LATE';
    memberName: string;
    arrivedAt: string;
}

type PageState = 'loading' | 'info' | 'checking-in' | 'success' | 'already-checked' | 'error' | 'login-required';

/**
 * Mobile-optimised QR check-in page.
 * URL: /meetings/checkin/:token
 *
 * Flow:
 * - Load meeting info (public endpoint)
 * - If not logged in → show login prompt
 * - If logged in → show check-in button
 * - On check-in → show success/late screen
 */
const MeetingCheckInPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [meeting, setMeeting]         = useState<MeetingInfo | null>(null);
    const [result, setResult]           = useState<CheckInResult | null>(null);
    const [pageState, setPageState]     = useState<PageState>('loading');
    const [errorMsg, setErrorMsg]       = useState('');

    // Load meeting info from public endpoint
    const loadMeeting = useCallback(async () => {
        try {
            const res = await apiClient.get(`/meetings/qr/${token}`);
            setMeeting(res.data);
            setPageState('info');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Invalid or expired QR code.';
            setErrorMsg(msg);
            setPageState('error');
        }
    }, [token]);

    useEffect(() => { loadMeeting(); }, [loadMeeting]);

    const handleCheckIn = async () => {
        if (!user) { setPageState('login-required'); return; }
        setPageState('checking-in');
        try {
            const res = await apiClient.post(`/meetings/qr/${token}/checkin`);
            setResult({
                status: res.data.status,
                memberName: res.data.memberName,
                arrivedAt: res.data.arrivedAt,
            });
            setPageState(res.data.status === 'PRESENT' || res.data.status === 'LATE' ? 'success' : 'already-checked');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Check-in failed. Please try again.';
            // If already checked in, show that state
            if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('active')) {
                setPageState('already-checked');
            } else {
                setErrorMsg(msg);
                setPageState('error');
            }
        }
    };

    const fmt = (dt: string) => new Date(dt).toLocaleTimeString('en-KE', {
        hour: '2-digit', minute: '2-digit'
    });
    const fmtDate = (dt: string) => new Date(dt).toLocaleDateString('en-KE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const isLate = () => {
        if (!meeting) return false;
        const now = new Date();
        const lateThreshold = new Date(new Date(meeting.startAt).getTime() + meeting.lateAfterMinutes * 60000);
        return now > lateThreshold;
    };

    // ── Render states ──────────────────────────────────────────────────────

    if (pageState === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading meeting details...</p>
                </div>
            </div>
        );
    }

    if (pageState === 'error') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">QR Code Invalid</h2>
                    <p className="text-sm text-slate-500">{errorMsg}</p>
                </div>
            </div>
        );
    }

    if (pageState === 'success' && result) {
        const isLateResult = result.status === 'LATE';
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className={`bg-white rounded-2xl shadow-sm border p-8 max-w-sm w-full text-center ${
                    isLateResult ? 'border-amber-100' : 'border-emerald-100'
                }`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
                        isLateResult ? 'bg-amber-50' : 'bg-emerald-50'
                    }`}>
                        {isLateResult
                            ? <Clock size={40} className="text-amber-500" />
                            : <CheckCircle size={40} className="text-emerald-500" />
                        }
                    </div>
                    <h2 className={`text-xl font-bold mb-1 ${
                        isLateResult ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                        {isLateResult ? 'Checked In — Late' : 'Checked In!'}
                    </h2>
                    <p className="text-base font-semibold text-slate-800 mb-1">{result.memberName}</p>
                    <p className="text-sm text-slate-500 mb-4">{meeting?.title}</p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                        isLateResult
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                    }`}>
                        <Clock size={14} />
                        Arrived at {fmt(result.arrivedAt)}
                    </div>
                    {isLateResult && (
                        <p className="text-xs text-amber-600 mt-3">
                            Late arrivals may be subject to a penalty per SACCO rules.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (pageState === 'already-checked') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-blue-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Already Checked In</h2>
                    <p className="text-sm text-slate-500">Your attendance has already been recorded for {meeting?.title}.</p>
                </div>
            </div>
        );
    }

    if (pageState === 'login-required') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn size={28} className="text-emerald-500" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Login Required</h2>
                    <p className="text-sm text-slate-500 mb-5">
                        You need to log in to check in to <span className="font-semibold">{meeting?.title}</span>.
                    </p>
                    <button
                        onClick={() => navigate(`/login?redirect=/meetings/checkin/${token}`)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition text-sm">
                        Log In to Check In
                    </button>
                </div>
            </div>
        );
    }

    // ── Default: meeting info + check-in button ────────────────────────────

    const meetingNotStarted = meeting && new Date() < new Date(meeting.startAt);
    const meetingClosed = meeting && meeting.status !== 'SCHEDULED';

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-sm w-full overflow-hidden">
                {/* Header banner */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-8 text-white text-center">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <QrCode size={28} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold leading-tight">{meeting?.title}</h1>
                    <p className="text-emerald-200 text-sm mt-1 capitalize">
                        {meeting?.meetingType?.toLowerCase().replace('_', ' ')} Meeting
                    </p>
                </div>

                {/* Meeting details */}
                <div className="px-6 py-5 border-b border-slate-100">
                    <div className="flex items-start gap-3 mb-3">
                        <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-slate-400">Date & Time</p>
                            <p className="text-sm font-semibold text-slate-800">
                                {meeting && fmtDate(meeting.startAt)}
                            </p>
                            <p className="text-sm text-slate-600">
                                {meeting && fmt(meeting.startAt)}
                                {meeting?.endAt && ` — ${fmt(meeting.endAt)}`}
                            </p>
                        </div>
                    </div>

                    {meeting?.description && (
                        <p className="text-xs text-slate-500 leading-relaxed">{meeting.description}</p>
                    )}
                </div>

                {/* Status / check-in section */}
                <div className="px-6 py-5">
                    {meetingClosed ? (
                        <div className="text-center py-2">
                            <p className="text-sm text-slate-500">This meeting is no longer accepting check-ins.</p>
                        </div>
                    ) : meetingNotStarted ? (
                        <div className="text-center py-2">
                            <p className="text-amber-600 text-sm font-medium">Meeting hasn't started yet</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Check-in opens at {meeting && fmt(meeting.startAt)}
                            </p>
                        </div>
                    ) : (
                        <>
                            {isLate() && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg mb-4">
                                    <Clock size={14} className="text-amber-500 shrink-0" />
                                    <p className="text-xs text-amber-700">
                                        You are checking in late. A penalty may apply per SACCO rules.
                                    </p>
                                </div>
                            )}

                            {user ? (
                                <button
                                    onClick={handleCheckIn}
                                    disabled={pageState === 'checking-in'}
                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {pageState === 'checking-in' ? (
                                        <><Loader2 size={16} className="animate-spin" /> Checking in...</>
                                    ) : (
                                        <><CheckCircle size={16} /> Check In Now</>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setPageState('login-required')}
                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                                    <LogIn size={16} />
                                    Log In to Check In
                                </button>
                            )}

                            {user && (
                                <p className="text-center text-xs text-slate-400 mt-3">
                                    Checking in as <span className="font-medium text-slate-600">
                                        {user.firstName} {user.lastName}
                                    </span>
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MeetingCheckInPage;