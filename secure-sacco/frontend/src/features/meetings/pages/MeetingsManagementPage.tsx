import { useState, useEffect } from 'react';
import { meetingsApi } from '../api/meetings-api';
import type { Meeting, MeetingType, AttendanceStatus, AttendanceRecord } from '../api/meetings-api';
import { Calendar, Clock, Plus, CheckCircle, XCircle, Users, ChevronRight, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import axios from "axios";

const STATUS_COLOR: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELED:  'bg-red-100 text-red-700',
};

const ATTENDANCE_COLOR: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    LATE:    'bg-yellow-100 text-yellow-700',
    ABSENT:  'bg-red-100 text-red-700',
    EXCUSED: 'bg-slate-100 text-slate-600',
};

export default function MeetingsManagementPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Meeting | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [draftAttendance, setDraftAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [saving, setSaving] = useState(false);
    const [actionMsg, setActionMsg] = useState('');

    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        meetingType: 'GENERAL' as MeetingType,
        startAt: '',
        endAt: '',
        lateAfterMinutes: 15,
    });
    const [formSaving, setFormSaving] = useState(false);

    const load = () => {
        setLoading(true);
        meetingsApi.list()
            .then(setMeetings)
            .catch(() => setError('Failed to load meetings.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openMeeting = (m: Meeting) => {
        setSelected(m);
        setActionMsg('');
        setAttendanceLoading(true);
        meetingsApi.getAttendance(m.id)
            .then(records => {
                setAttendance(records);
                const draft: Record<string, AttendanceStatus> = {};
                records.forEach(r => { draft[r.memberId] = r.status; });
                setDraftAttendance(draft);
            })
            .catch(() => {})
            .finally(() => setAttendanceLoading(false));
    };

    const handleSaveAttendance = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const records = Object.entries(draftAttendance).map(([memberId, status]) => ({ memberId, status }));
            const updated = await meetingsApi.recordAttendance(selected.id, records);
            setAttendance(updated);
            setActionMsg('Attendance saved successfully.');
        } catch {
            setActionMsg('Failed to save attendance.');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!selected || !confirm(`Complete "${selected.title}" and auto-generate penalties for absent/late members?`)) return;
        setSaving(true);
        try {
            await meetingsApi.complete(selected.id);
            setActionMsg('Meeting completed. Penalties generated automatically.');
            load();
            setSelected(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
        } catch (error: unknown) {
            if (axios.isAxiosError<{ message?: string }>(error)) {
                setActionMsg(error.response?.data?.message ?? error.message ?? 'Failed to complete meeting.');
            } else if (error instanceof Error) {
                setActionMsg(error.message);
            } else {
                setActionMsg('Failed to complete meeting.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!selected || !confirm(`Cancel meeting "${selected.title}"?`)) return;
        setSaving(true);
        try {
            await meetingsApi.cancel(selected.id);
            setActionMsg('Meeting canceled.');
            load();
            setSelected(prev => prev ? { ...prev, status: 'CANCELED' } : null);
        } catch (error: unknown) {
            if (axios.isAxiosError<{ message?: string }>(error)) {
                setActionMsg(error.response?.data?.message ?? error.message ?? 'Failed to cancel meeting.');
            } else if (error instanceof Error) {
                setActionMsg(error.message);
            } else {
                setActionMsg('Failed to cancel meeting.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async () => {
        setFormSaving(true);
        try {
            await meetingsApi.create({
                ...form,
                startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
                endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
            });
            setShowCreate(false);
            setForm({ title: '', description: '', meetingType: 'GENERAL', startAt: '', endAt: '', lateAfterMinutes: 15 });
            load();
        } catch (error: unknown) {
            if (axios.isAxiosError<{ message?: string }>(error)) {
                setActionMsg(error.response?.data?.message ?? error.message ?? 'Failed to create meeting.');
            } else if (error instanceof Error) {
                setActionMsg(error.message);
            } else {
                setActionMsg('Failed to create meeting.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage SACCO meetings, attendance, and automatic penalties.</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                    <Plus size={16} /> New Meeting
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            <div className="flex gap-6">
                {/* Meeting list */}
                <div className="flex-1 space-y-3">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                        ))
                    ) : meetings.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">No meetings yet.</div>
                    ) : meetings.map(m => (
                        <button
                            key={m.id}
                            onClick={() => openMeeting(m)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                                selected?.id === m.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[m.status]}`}>
                                            {m.status}
                                        </span>
                                        <span className="text-xs text-slate-400">{m.meetingType}</span>
                                    </div>
                                    <p className="font-semibold text-slate-800 truncate">{m.title}</p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={11} />
                                            {format(new Date(m.startAt), 'dd MMM yyyy')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={11} />
                                            {format(new Date(m.startAt), 'HH:mm')}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 mt-1 shrink-0" />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div className="w-96 bg-white rounded-xl border border-slate-200 p-5 self-start sticky top-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[selected.status]}`}>
                                    {selected.status}
                                </span>
                                <h2 className="text-lg font-bold text-slate-900 mt-2">{selected.title}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {format(new Date(selected.startAt), 'EEEE, dd MMM yyyy • HH:mm')}
                                </p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        {actionMsg && (
                            <div className="mb-3 p-2 bg-blue-50 text-blue-700 text-xs rounded-lg">{actionMsg}</div>
                        )}

                        {selected.status === 'SCHEDULED' && (
                            <div className="flex gap-2 mb-5">
                                <button
                                    onClick={handleComplete}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                                    Complete
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                                >
                                    <XCircle size={13} /> Cancel
                                </button>
                            </div>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Users size={14} /> Attendance ({attendance.length})
                                </h3>
                                {selected.status !== 'CANCELED' && (
                                    <button
                                        onClick={handleSaveAttendance}
                                        disabled={saving || attendanceLoading}
                                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                                    >
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                )}
                            </div>

                            {attendanceLoading ? (
                                <div className="animate-pulse space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
                                </div>
                            ) : attendance.length === 0 ? (
                                <p className="text-xs text-slate-400 py-4 text-center">No attendance records yet.</p>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {attendance.map(rec => (
                                        <div key={rec.memberId} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                            <div>
                                                <p className="text-xs font-medium text-slate-800">{rec.memberName}</p>
                                                <p className="text-xs text-slate-400">{rec.memberNumber}</p>
                                            </div>
                                            <select
                                                disabled={selected.status === 'CANCELED'}
                                                value={draftAttendance[rec.memberId] ?? rec.status}
                                                onChange={e => setDraftAttendance(prev => ({
                                                    ...prev,
                                                    [rec.memberId]: e.target.value as AttendanceStatus,
                                                }))}
                                                className={`text-xs border-0 rounded-lg px-2 py-1 font-medium cursor-pointer ${
                                                    ATTENDANCE_COLOR[draftAttendance[rec.memberId] ?? rec.status]
                                                }`}
                                            >
                                                {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as AttendanceStatus[]).map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-bold text-slate-900">New Meeting</h2>
                            <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">Title *</label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">Type</label>
                                <select
                                    value={form.meetingType}
                                    onChange={e => setForm(f => ({ ...f, meetingType: e.target.value as MeetingType }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {['GENERAL', 'AGM', 'SPECIAL', 'EMERGENCY'].map(t => (
                                        <option key={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">Start Date & Time *</label>
                                <input
                                    type="datetime-local"
                                    value={form.startAt}
                                    onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">End Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={form.endAt}
                                    onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">Late After (minutes)</label>
                                <input
                                    type="number"
                                    value={form.lateAfterMinutes}
                                    onChange={e => setForm(f => ({ ...f, lateAfterMinutes: parseInt(e.target.value) || 15 }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={formSaving || !form.title || !form.startAt}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {formSaving ? 'Creating…' : 'Create Meeting'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}