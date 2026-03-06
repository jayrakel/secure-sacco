import { useState, useEffect } from 'react';
import { meetingsApi } from '../api/meetings-api';
import type { MyMeetingSummary, AttendanceStatus } from '../api/meetings-api';
import { Calendar, CheckCircle2, Clock, XCircle, AlertCircle, LogIn } from 'lucide-react';
import { format } from 'date-fns';

const parseUtc = (dateStr: string) =>
    new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');

const ATTENDANCE_CONFIG: Record<AttendanceStatus, { label: string; color: string; Icon: React.ElementType }> = {
    PRESENT: { label: 'Present',  color: 'text-green-600 bg-green-50',   Icon: CheckCircle2 },
    LATE:    { label: 'Late',     color: 'text-yellow-600 bg-yellow-50', Icon: Clock },
    ABSENT:  { label: 'Absent',   color: 'text-red-600 bg-red-50',       Icon: XCircle },
    EXCUSED: { label: 'Excused',  color: 'text-slate-600 bg-slate-50',   Icon: AlertCircle },
};

export default function MyMeetingsPage() {
    const [meetings, setMeetings] = useState<MyMeetingSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [checkInErrors, setCheckInErrors] = useState<Record<string, string>>({});
    const now = new Date();

    const load = () => {
        meetingsApi.getMyMeetings()
            .then(setMeetings)
            .catch(() => setError('Failed to load your meeting history.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleCheckIn = async (meetingId: string) => {
        setCheckingIn(meetingId);
        setCheckInErrors(prev => ({ ...prev, [meetingId]: '' }));
        try {
            await meetingsApi.checkIn(meetingId);
            load(); // refresh to get updated status
        } catch (e: any) {
            setCheckInErrors(prev => ({
                ...prev,
                [meetingId]: e.response?.data?.message || 'Check-in failed. Please try again.',
            }));
        } finally {
            setCheckingIn(null);
        }
    };

    const completed = meetings.filter(m => m.meetingStatus === 'COMPLETED');
    const stats = {
        total:   completed.length,
        present: completed.filter(m => m.myStatus === 'PRESENT').length,
        late:    completed.filter(m => m.myStatus === 'LATE').length,
        absent:  completed.filter(m => m.myStatus === 'ABSENT').length,
    };
    const attendanceRate = stats.total > 0
        ? Math.round(((stats.present + stats.late) / stats.total) * 100)
        : 0;

    const renderStatusCell = (m: MyMeetingSummary) => {
        const startAt = parseUtc(m.startAt);
        const hasStarted = now >= startAt;

        // Completed — show attendance badge
        if (m.meetingStatus === 'COMPLETED' && m.myStatus) {
            const cfg = ATTENDANCE_CONFIG[m.myStatus];
            const Icon = cfg.Icon;
            return (
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                    <Icon size={11} /> {cfg.label}
                </span>
            );
        }

        // Already checked in (PRESENT or LATE on a SCHEDULED meeting)
        if (m.meetingStatus === 'SCHEDULED' && m.myStatus &&
            (m.myStatus === 'PRESENT' || m.myStatus === 'LATE')) {
            const cfg = ATTENDANCE_CONFIG[m.myStatus];
            const Icon = cfg.Icon;
            return (
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                    <Icon size={11} /> Checked In
                </span>
            );
        }

        // Canceled
        if (m.meetingStatus === 'CANCELED') {
            return (
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full text-slate-500 bg-slate-100">
                    Canceled
                </span>
            );
        }

        // Scheduled + not started yet
        if (!hasStarted) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-blue-600 bg-blue-50">
                    <Clock size={11} /> {format(startAt, 'HH:mm')}
                </span>
            );
        }

        // Scheduled + started → show Check In button
        return (
            <div className="flex flex-col items-end gap-1">
                <button
                    onClick={() => handleCheckIn(m.meetingId)}
                    disabled={checkingIn === m.meetingId}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                    <LogIn size={11} />
                    {checkingIn === m.meetingId ? 'Checking in…' : 'Check In'}
                </button>
                {checkInErrors[m.meetingId] && (
                    <p className="text-xs text-red-500">{checkInErrors[m.meetingId]}</p>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">My Meetings</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Check in when a meeting starts. Your attendance is recorded automatically.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Meetings Held',  value: stats.total,                color: 'text-blue-600' },
                    { label: 'Attended',        value: stats.present + stats.late, color: 'text-green-600' },
                    { label: 'Absent',          value: stats.absent,              color: 'text-red-600' },
                    { label: 'Attendance Rate', value: `${attendanceRate}%`,      color: 'text-indigo-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : meetings.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                    No meetings found.
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Meeting</th>
                            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Date</th>
                            <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {meetings.map(m => (
                            <tr key={m.meetingId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-slate-800">{m.meetingTitle}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-slate-600">
                                        {format(parseUtc(m.startAt), 'dd MMM yyyy')}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {format(parseUtc(m.startAt), 'HH:mm')}
                                    </p>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {renderStatusCell(m)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}