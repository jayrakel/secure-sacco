import { useState, useEffect, useCallback } from 'react';
import { publicApi, type PublicAnnouncement, type PublicDocument, type SaccoProfile } from '../api/public-api';
import {
    Bell, FileText, Building2, Plus, Pencil, Trash2, X, Check,
    Loader2, ToggleLeft, ToggleRight, AlertCircle, Globe,
    BookOpen, Pin,
} from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

type TabId = 'profile' | 'announcements' | 'documents';

const CATEGORIES = [
    { value: 'MEETING_MINUTES', label: 'Meeting Minutes' },
    { value: 'NOTICE',          label: 'Notice' },
    { value: 'FINANCIAL_REPORT',label: 'Financial Report' },
    { value: 'POLICY',          label: 'Policy Document' },
    { value: 'OTHER',           label: 'General' },
];

const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white placeholder-slate-300';
const textareaCls = inputCls + ' resize-none';

export default function SecretaryPortalPage() {
    const [tab, setTab] = useState<TabId>('announcements');
    const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

    const flash = (ok: boolean, msg: string) => {
        setToast({ ok, msg });
        setTimeout(() => setToast(null), 3500);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Secretary Portal</h1>
                <p className="text-slate-500 text-sm mt-0.5">
                    Manage the public landing page — announcements, documents, and SACCO profile.
                </p>
            </div>

            {toast && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-sm ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {toast.ok ? <Check size={14} className="text-emerald-600 shrink-0" /> : <AlertCircle size={14} className="text-red-500 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {([
                    { id: 'announcements' as TabId, label: 'Announcements', icon: Bell },
                    { id: 'documents'     as TabId, label: 'Documents',     icon: FileText },
                    { id: 'profile'       as TabId, label: 'SACCO Profile', icon: Building2 },
                ] as { id: TabId; label: string; icon: React.ElementType }[]).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'announcements' && <AnnouncementsTab flash={flash} />}
            {tab === 'documents'     && <DocumentsTab flash={flash} />}
            {tab === 'profile'       && <ProfileTab flash={flash} />}
        </div>
    );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────

function AnnouncementsTab({ flash }: { flash: (ok: boolean, msg: string) => void }) {
    const [items, setItems] = useState<PublicAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<PublicAnnouncement | 'new' | null>(null);
    const [form, setForm] = useState({ title: '', body: '', isPinned: false });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await publicApi.listAnnouncements()); }
        catch { flash(false, 'Failed to load announcements.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, []);

    const openNew = () => { setForm({ title: '', body: '', isPinned: false }); setEditing('new'); };
    const openEdit = (a: PublicAnnouncement) => { setForm({ title: a.title, body: a.body, isPinned: a.isPinned }); setEditing(a); };

    const handleSave = async () => {
        if (!form.title.trim() || !form.body.trim()) return;
        setSaving(true);
        try {
            if (editing === 'new') {
                const created = await publicApi.createAnnouncement(form);
                setItems(prev => [created, ...prev]);
                flash(true, 'Announcement published.');
            } else if (editing) {
                const updated = await publicApi.updateAnnouncement((editing as PublicAnnouncement).id, form);
                setItems(prev => prev.map(a => a.id === updated.id ? updated : a));
                flash(true, 'Announcement updated.');
            }
            setEditing(null);
        } catch (err) { flash(false, getApiErrorMessage(err, 'Failed to save.')); }
        finally { setSaving(false); }
    };

    const handleToggle = async (id: string) => {
        try {
            await publicApi.toggleAnnouncement(id);
            await load();
            flash(true, 'Visibility updated.');
        } catch { flash(false, 'Failed to update.'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this announcement? This cannot be undone.')) return;
        try {
            await publicApi.deleteAnnouncement(id);
            setItems(prev => prev.filter(a => a.id !== id));
            flash(true, 'Announcement deleted.');
        } catch { flash(false, 'Failed to delete.'); }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={openNew}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                    <Plus size={14} /> New Announcement
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                    <Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading…</span>
                </div>
            ) : items.length === 0 ? (
                <EmptyState icon={Bell} message="No announcements yet. Create one to display on the landing page." />
            ) : (
                <div className="space-y-3">
                    {items.map(a => (
                        <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
                            {a.isPinned && <Pin size={14} className="text-amber-500 mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.body}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => handleToggle(a.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Toggle visibility">
                                    {a.isPinned ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                                </button>
                                <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Pencil size={13} /></button>
                                <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {editing !== null && (
                <Modal title={editing === 'new' ? 'New Announcement' : 'Edit Announcement'} onClose={() => setEditing(null)}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
                            <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. January Meeting Notice" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message</label>
                            <textarea className={textareaCls} rows={5} value={form.body}
                                      onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                                      placeholder="Write the announcement content here…" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-700">Pin to top</p>
                                <p className="text-xs text-slate-400">Pinned announcements show as a banner on the landing page.</p>
                            </div>
                            <button type="button" onClick={() => setForm(f => ({ ...f, isPinned: !f.isPinned }))}
                                    className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors cursor-pointer ${form.isPinned ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.isPinned ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                    <ModalFooter saving={saving} onSave={handleSave} onCancel={() => setEditing(null)}
                                 label={editing === 'new' ? 'Publish' : 'Save'} disabled={!form.title.trim() || !form.body.trim()} />
                </Modal>
            )}
        </div>
    );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ flash }: { flash: (ok: boolean, msg: string) => void }) {
    const [items, setItems] = useState<PublicDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<PublicDocument | 'new' | null>(null);
    const [form, setForm] = useState({ title: '', description: '', category: 'MEETING_MINUTES', fileUrl: '', fileName: '', meetingDate: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await publicApi.listDocuments()); }
        catch { flash(false, 'Failed to load documents.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, []);

    const emptyForm = { title: '', description: '', category: 'MEETING_MINUTES', fileUrl: '', fileName: '', meetingDate: '' };
    const openNew = () => { setForm(emptyForm); setEditing('new'); };
    const openEdit = (d: PublicDocument) => {
        setForm({ title: d.title, description: d.description, category: d.category, fileUrl: d.fileUrl, fileName: d.fileName, meetingDate: d.meetingDate ?? '' });
        setEditing(d);
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.fileUrl.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, meetingDate: form.meetingDate || null } as Omit<PublicDocument, 'id' | 'createdAt'>;
            if (editing === 'new') {
                const created = await publicApi.createDocument(payload);
                setItems(prev => [created, ...prev]);
                flash(true, 'Document published.');
            } else if (editing) {
                const updated = await publicApi.updateDocument((editing as PublicDocument).id, payload);
                setItems(prev => prev.map(d => d.id === updated.id ? updated : d));
                flash(true, 'Document updated.');
            }
            setEditing(null);
        } catch (err) { flash(false, getApiErrorMessage(err, 'Failed to save.')); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this document? This cannot be undone.')) return;
        try {
            await publicApi.deleteDocument(id);
            setItems(prev => prev.filter(d => d.id !== id));
            flash(true, 'Document deleted.');
        } catch { flash(false, 'Failed to delete.'); }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={openNew}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                    <Plus size={14} /> Upload Document
                </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex gap-2">
                <Globe size={13} className="shrink-0 mt-0.5" />
                <span>Documents are linked by URL — upload your file to Google Drive, Dropbox, or any file sharing service, then paste the shareable link here.</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                    <Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading…</span>
                </div>
            ) : items.length === 0 ? (
                <EmptyState icon={FileText} message="No documents yet. Add your first document to share with members." />
            ) : (
                <div className="space-y-3">
                    {items.map(d => (
                        <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <FileText size={14} className="text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm">{d.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {CATEGORIES.find(c => c.value === d.category)?.label}
                                    {d.meetingDate ? ` · ${d.meetingDate}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Pencil size={13} /></button>
                                <button onClick={() => handleDelete(d.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing !== null && (
                <Modal title={editing === 'new' ? 'Add Document' : 'Edit Document'} onClose={() => setEditing(null)}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
                            <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. January 2026 Meeting Minutes" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                            <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">File URL <span className="text-slate-400 font-normal">(Google Drive, Dropbox, etc.)</span></label>
                            <input className={inputCls} value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://drive.google.com/file/d/..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Display Filename <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input className={inputCls} value={form.fileName} onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))} placeholder="minutes-jan-2026.pdf" />
                            </div>
                            {form.category === 'MEETING_MINUTES' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Meeting Date</label>
                                    <input type="date" className={inputCls} value={form.meetingDate} onChange={e => setForm(f => ({ ...f, meetingDate: e.target.value }))} />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                            <textarea className={textareaCls} rows={2} value={form.description}
                                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                      placeholder="Brief description of this document…" />
                        </div>
                    </div>
                    <ModalFooter saving={saving} onSave={handleSave} onCancel={() => setEditing(null)}
                                 label={editing === 'new' ? 'Publish' : 'Save'} disabled={!form.title.trim() || !form.fileUrl.trim()} />
                </Modal>
            )}
        </div>
    );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ flash }: { flash: (ok: boolean, msg: string) => void }) {
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        tagline: '', history: '', mission: '', vision: '',
        foundedYear: '', contactPhone: '', contactEmail: '', contactAddress: '',
    });

    useEffect(() => {
        publicApi.getLanding().then(d => {
            const p = d.profile;
            if (p) setForm({
                tagline: p.tagline ?? '', history: p.history ?? '',
                mission: p.mission ?? '', vision: p.vision ?? '',
                foundedYear: p.foundedYear ? String(p.foundedYear) : '',
                contactPhone: p.contactPhone ?? '', contactEmail: p.contactEmail ?? '',
                contactAddress: p.contactAddress ?? '',
            });
        }).catch(() => flash(false, 'Failed to load profile.'))
            .finally(() => setLoading(false));
    }, []);

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await publicApi.updateProfile({
                ...form,
                foundedYear: form.foundedYear ? parseInt(form.foundedYear) : null,
            });
            flash(true, 'Public profile updated.');
        } catch (err) { flash(false, getApiErrorMessage(err, 'Failed to save.')); }
        finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
        </div>
    );

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Basic Info</h3>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tagline</label>
                    <input className={inputCls} value={form.tagline} onChange={e => set('tagline', e.target.value)}
                           placeholder="e.g. Empowering members through savings and credit." />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Founded Year</label>
                    <input type="number" className={inputCls} value={form.foundedYear} onChange={e => set('foundedYear', e.target.value)}
                           placeholder="e.g. 2018" min="1900" max="2099" />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Our Story</h3>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">History</label>
                    <textarea className={textareaCls} rows={6} value={form.history} onChange={e => set('history', e.target.value)}
                              placeholder="Tell the story of how your SACCO was founded, who started it, and why…" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mission</label>
                        <textarea className={textareaCls} rows={3} value={form.mission} onChange={e => set('mission', e.target.value)}
                                  placeholder="What we do and who we serve…" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vision</label>
                        <textarea className={textareaCls} rows={3} value={form.vision} onChange={e => set('vision', e.target.value)}
                                  placeholder="Where we want to be in the future…" />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Contact Details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                        <input className={inputCls} value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                        <input type="email" className={inputCls} value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="info@yoursacco.co.ke" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Physical Address</label>
                    <textarea className={textareaCls} rows={2} value={form.contactAddress} onChange={e => set('contactAddress', e.target.value)}
                              placeholder="e.g. Dandora, Nairobi, Kenya" />
                </div>
            </div>

            <div className="flex justify-end">
                <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-40">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Profile</>}
                </button>
            </div>
        </form>
    );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

function ModalFooter({ saving, onSave, onCancel, label, disabled }: {
    saving: boolean; onSave: () => void; onCancel: () => void; label: string; disabled?: boolean;
}) {
    return (
        <div className="flex gap-3 px-6 pb-6 pt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={onSave} disabled={saving || disabled}
                    className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> {label}</>}
            </button>
        </div>
    );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
    return (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
            <Icon size={28} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">{message}</p>
        </div>
    );
}