import { useEffect, useState } from 'react';
import { sessionApi, type SessionResponse } from '../api/session-api';
import { X, Trash2, MonitorSmartphone, Loader2, Clock, ShieldAlert } from 'lucide-react';
import HasPermission from '../../../shared/components/HasPermission';

interface Props {
    userId: string;
    userName: string;
    onClose: () => void;
}

export default function UserSessionsModal({ userId, userName, onClose }: Props) {
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const data = await sessionApi.getUserSessions(userId);
            // Sort to show newest active sessions first
            setSessions(data.sort((a, b) => new Date(b.lastAccessedTime).getTime() - new Date(a.lastAccessedTime).getTime()));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load sessions.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [userId]);

    const handleRevokeSingle = async (sessionId: string) => {
        if (!window.confirm("Terminate this session? The user will be logged out on that device.")) return;
        try {
            await sessionApi.revokeSpecificSession(sessionId);
            setSessions(sessions.filter(s => s.sessionId !== sessionId));
        } catch (err) {
            alert("Failed to terminate session.");
        }
    };

    const handleRevokeAll = async () => {
        if (!window.confirm("Terminate ALL sessions for this user? They will be immediately locked out on all devices.")) return;
        try {
            await sessionApi.revokeAllUserSessions(userId);
            setSessions([]);
        } catch (err) {
            alert("Failed to terminate all sessions.");
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <MonitorSmartphone className="text-purple-600" /> Active Sessions
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">Viewing devices currently logged in as <span className="font-bold text-slate-700">{userName}</span></p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 min-h-[300px] max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <Loader2 className="animate-spin mb-2 text-purple-600" size={32} />
                            <p>Querying Redis for sessions...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">{error}</div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <ShieldAlert size={40} className="mb-2 text-slate-300" />
                            <p>No active sessions found for this user.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((session, idx) => (
                                <div key={session.sessionId} className="flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition group">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 p-2 bg-slate-100 text-slate-600 rounded-lg">
                                            <MonitorSmartphone size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                Session #{session.sessionId.substring(0, 8)}...
                                                {idx === 0 && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Most Recent</span>}
                                            </div>
                                            <div className="flex flex-col text-xs text-slate-500 mt-1 space-y-1">
                                                <span className="flex items-center gap-1"><Clock size={12} /> Created: {formatDate(session.creationTime)}</span>
                                                <span className="flex items-center gap-1"><Clock size={12} /> Last Active: {formatDate(session.lastAccessedTime)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <HasPermission permission="SESSION_REVOKE">
                                        <button
                                            onClick={() => handleRevokeSingle(session.sessionId)}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-lg transition flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} /> Terminate
                                        </button>
                                    </HasPermission>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <p className="text-xs text-slate-500">Note: Terminating a session takes effect immediately on the next API call.</p>
                    <HasPermission permission="SESSION_REVOKE">
                        <button
                            onClick={handleRevokeAll}
                            disabled={sessions.length === 0}
                            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <ShieldAlert size={18} /> Kill All Sessions
                        </button>
                    </HasPermission>
                </div>
            </div>
        </div>
    );
}