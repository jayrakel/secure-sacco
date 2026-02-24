import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { sessionApi, type SessionResponse } from '../../sessions/api/session-api';
import { MonitorSmartphone, Trash2, ShieldAlert, Loader2, Clock, ShieldCheck } from 'lucide-react';

export default function SecuritySettingsPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchMySessions = async () => {
            try {
                const data = await sessionApi.getUserSessions(user.id);
                setSessions(data.sort((a, b) => new Date(b.lastAccessedTime).getTime() - new Date(a.lastAccessedTime).getTime()));
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load your sessions.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMySessions();
    }, [user]);

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
            window.location.href = '/login'; // Force them to login page since their session is now dead
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
                <h1 className="text-2xl font-bold text-slate-800">Security Settings</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your account security and active devices.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Active Devices</h2>
                        <p className="text-slate-500 text-sm">You are currently logged in to these devices. If you don't recognize a device, terminate it immediately.</p>
                    </div>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-600" size={32}/></div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">{error}</div>
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
                                                {idx === 0 && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-emerald-200">Current Device</span>}
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