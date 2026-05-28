import React, { useEffect, useState, useCallback } from 'react';
import { settingsApi } from '../api/settings-api';
import { useAuth } from '../../auth/context/AuthProvider';
import type { SaccoSettings } from '../api/settings-api';
import { penaltyApi } from '../../penalties/api/penalty-api';
import type { PenaltyRule, PenaltyRuleRequest, AmountType, InterestMode } from '../../penalties/api/penalty-api';
import { useSettings } from '../context/useSettings';
import {
    Building2, Shield, Bell, CalendarClock, Zap, ToggleLeft, ToggleRight,
    Loader2, CheckCircle2, AlertCircle, Image, ChevronRight,
    Users, BookOpen, PiggyBank, BarChart3, AlertTriangle,
    Gavel, Plus, Pencil, X, Check, TriangleAlert,
} from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'identity' | 'security' | 'communication' | 'schedule' | 'modules' | 'penalties';

interface SecurityPolicy {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutMinutes: number;
    passwordResetExpiryMin: number;
    mfaTokenExpiryMinutes: number;
    emailVerifyExpiryHours: number;
    minPasswordLength: number;
    contactVerifyRateLimit: number;
    contactVerifyWindowMin: number;
    rateLimitGeneralPerMin: number;
}

// ─── Navigation tabs ──────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'identity',      label: 'Identity',      icon: <Building2 size={15} />, desc: 'Name, branding & fees'    },
    { id: 'security',      label: 'Security',      icon: <Shield size={15} />,    desc: 'Auth, passwords & limits' },
    { id: 'communication', label: 'Communication', icon: <Bell size={15} />,      desc: 'Email sender settings'    },
    { id: 'schedule',       label: 'Schedule',       icon: <CalendarClock size={15} />, desc: 'Savings day & deadline'   },
    { id: 'modules',       label: 'Modules',       icon: <Zap size={15} />,       desc: 'Feature flags'            },
    { id: 'penalties',     label: 'Penalties',     icon: <Gavel size={15} />,     desc: 'Fine rules & thresholds'  },
];

const MODULE_CONFIG: Record<string, { label: string; desc: string; icon: React.ReactNode; cls: { bg: string; ring: string; text: string; icon: string } }> = {
    members:  { label: 'Members',  icon: <Users size={18} />,     cls: { bg: 'bg-blue-50',    ring: 'ring-blue-200',    text: 'text-blue-800',    icon: 'text-blue-500'    }, desc: 'Member registration, directory and profile management.'             },
    loans:    { label: 'Loans',    icon: <BookOpen size={18} />,  cls: { bg: 'bg-violet-50',  ring: 'ring-violet-200',  text: 'text-violet-800',  icon: 'text-violet-500'  }, desc: 'Loan applications, approvals, disbursement and repayments.'         },
    savings:  { label: 'Savings',  icon: <PiggyBank size={18} />, cls: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-500' }, desc: 'Member savings accounts, deposits and withdrawals.'                 },
    reports:  { label: 'Reports',  icon: <BarChart3 size={18} />, cls: { bg: 'bg-amber-50',   ring: 'ring-amber-200',   text: 'text-amber-800',   icon: 'text-amber-500'   }, desc: 'Financial analytics, statements and performance reports.'           },
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputCls =
    'w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ' +
    'bg-white placeholder-slate-300 transition-all';

const Field: React.FC<{ label: string; hint?: string; warn?: string; children: React.ReactNode }> = ({ label, hint, warn, children }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
        {children}
        {warn && <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-1.5"><AlertTriangle size={11} className="shrink-0" />{warn}</p>}
        {hint && !warn && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
);

const NumberField: React.FC<{
    label: string; value: number; onChange: (v: number) => void;
    min?: number; max?: number; suffix?: string; hint?: string; warn?: string;
}> = ({ label, value, onChange, min = 0, max, suffix, hint, warn }) => (
    <Field label={label} hint={hint} warn={warn}>
        <div className="relative">
            <input type="number" min={min} max={max} value={value}
                   onChange={e => onChange(parseInt(e.target.value) || min)}
                   className={inputCls + (suffix ? ' pr-20' : '')} />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none select-none">
                    {suffix}
                </span>
            )}
        </div>
    </Field>
);

const SaveBtn: React.FC<{ loading: boolean; dirty?: boolean; label?: string }> = ({ loading, dirty = true, label = 'Save Changes' }) => (
    <button type="submit" disabled={loading || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white
                   text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Saving…' : label}
    </button>
);

const Section: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const InfoBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">{children}</div>
    </div>
);

// ─── Page component ───────────────────────────────────────────────────────────

const SaccoSettingsPage: React.FC = () => {
    const { refreshSettings } = useSettings();
    const { user } = useAuth();
    const isSystemAdmin = user?.roles?.includes('ROLE_SYSTEM_ADMIN') ?? false;
    // Non-SYSTEM_ADMIN users who have PENALTIES_MANAGE_RULES only see the Penalties tab
    const [tab, setTab]       = useState<TabId>(isSystemAdmin ? 'identity' : 'penalties');
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<SaccoSettings | null>(null);
    const [toast, setToast]   = useState<{ ok: boolean; msg: string } | null>(null);

    // ── Identity ────────────────────────────────────────────────────────────
    const [saccoName, setSaccoName]   = useState('');
    const [prefix, setPrefix]         = useState('');
    const [padLength, setPadLength]   = useState(7);
    const [regFee, setRegFee]         = useState(1000);
    const [logoUrl, setLogoUrl]       = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');
    const [prefixManual, setPrefixManual] = useState(false);
    const [savingId, setSavingId]     = useState(false);
    const [dirtyId, setDirtyId]       = useState(false);

    // ── Security ────────────────────────────────────────────────────────────
    const defaultSec: SecurityPolicy = { maxLoginAttempts: 5, lockoutDurationMinutes: 15, sessionTimeoutMinutes: 30, passwordResetExpiryMin: 15, mfaTokenExpiryMinutes: 5, emailVerifyExpiryHours: 24, minPasswordLength: 12, contactVerifyRateLimit: 3, contactVerifyWindowMin: 15, rateLimitGeneralPerMin: 60 };
    const [sec, setSec] = useState<SecurityPolicy>(defaultSec);
    const [savingSec, setSavingSec] = useState(false);
    const [dirtySec, setDirtySec]   = useState(false);
    const setSP = useCallback(<K extends keyof SecurityPolicy>(k: K, v: SecurityPolicy[K]) => {
        setSec(p => ({ ...p, [k]: v }));
        setDirtySec(true);
    }, []);

    // ── Communication ───────────────────────────────────────────────────────
    const [fromName, setFromName]     = useState('Secure SACCO');
    const [suppEmail, setSuppEmail]   = useState('');
    const [savingComm, setSavingComm] = useState(false);
    const [dirtyComm, setDirtyComm]   = useState(false);

    // ── Savings Schedule ─────────────────────────────────────────────────────
    const DAYS_OF_WEEK = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
    const [savingsDay,         setSavingsDay]         = useState('THURSDAY');
    const [deadlineNextDay,    setDeadlineNextDay]    = useState(true);
    const [deadlineHour,       setDeadlineHour]       = useState(23);
    const [deadlineMinute,     setDeadlineMinute]     = useState(59);
    const [savingSched,        setSavingSched]        = useState(false);
    const [dirtySched,         setDirtySched]         = useState(false);

    // ── Modules ─────────────────────────────────────────────────────────────
    const [mods, setMods]         = useState<Record<string, boolean>>({ members: true, loans: false, savings: false, reports: false });
    const [savingMods, setSavingMods] = useState(false);

    // ── Penalties state ─────────────────────────────────────────────────────
    const [rules, setRules]             = useState<PenaltyRule[]>([]);
    const [rulesLoading, setRulesLoading] = useState(false);
    const [editingRule, setEditingRule] = useState<PenaltyRule | null>(null);
    const [isCreatingRule, setIsCreatingRule] = useState(false);
    const [ruleForm, setRuleForm]       = useState<Partial<PenaltyRuleRequest>>({});
    const [savingRule, setSavingRule]   = useState(false);

    // ── Load ────────────────────────────────────────────────────────────────
    useEffect(() => {
        settingsApi.getSettings().then(d => {
            setSettings(d);
            if (d.initialized) {
                setSaccoName(d.saccoName || '');
                setPrefix((d.prefix || '').replace('-', ''));
                setPadLength(d.padLength || 7);
                setRegFee(d.registrationFee || 1000);
                setLogoUrl(d.logoUrl || '');
                setFaviconUrl(d.faviconUrl || '');
                setPrefixManual(true);
                if (d.enabledModules) setMods(d.enabledModules);
                setSec({ maxLoginAttempts: d.maxLoginAttempts ?? 5, lockoutDurationMinutes: d.lockoutDurationMinutes ?? 15, sessionTimeoutMinutes: d.sessionTimeoutMinutes ?? 30, passwordResetExpiryMin: d.passwordResetExpiryMin ?? 15, mfaTokenExpiryMinutes: d.mfaTokenExpiryMinutes ?? 5, emailVerifyExpiryHours: d.emailVerifyExpiryHours ?? 24, minPasswordLength: d.minPasswordLength ?? 12, contactVerifyRateLimit: d.contactVerifyRateLimit ?? 3, contactVerifyWindowMin: d.contactVerifyWindowMin ?? 15, rateLimitGeneralPerMin: d.rateLimitGeneralPerMin ?? 60 });
                setFromName(d.smtpFromName || 'Secure SACCO');
                setSuppEmail(d.supportEmail || '');
                if (d.savingsDay)           setSavingsDay(d.savingsDay);
                if (d.savingsDeadlineNextDay !== undefined) setDeadlineNextDay(d.savingsDeadlineNextDay);
                if (d.savingsDeadlineHour  !== undefined) setDeadlineHour(d.savingsDeadlineHour);
                if (d.savingsDeadlineMinute !== undefined) setDeadlineMinute(d.savingsDeadlineMinute);
            }
        }).catch(() => flash(false, 'Failed to load settings.')).finally(() => setLoading(false));
    }, []);

    // ── Auto-prefix ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (prefixManual || saccoName.trim().length < 2) return;
        const id = setTimeout(async () => {
            try { const d = await settingsApi.generatePrefix(saccoName); setPrefix(d.prefix); } catch (error) { console.error('Failed to generate prefix:', error); }
        }, 500);
        return () => clearTimeout(id);
    }, [saccoName, prefixManual]);

    const flash = (ok: boolean, msg: string) => {
        setToast({ ok, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // Load penalty rules when penalties tab is opened
    const loadRules = useCallback(async () => {
        setRulesLoading(true);
        try { setRules(await penaltyApi.getRules(false)); }
        catch { flash(false, 'Failed to load penalty rules.'); }
        finally { setRulesLoading(false); }
    }, []);

    useEffect(() => {
        if (tab === 'penalties' && rules.length === 0 && !rulesLoading) loadRules();
    }, [tab]); // eslint-disable-line

    const openEditRule = (rule: PenaltyRule) => {
        setEditingRule(rule);
        setIsCreatingRule(false);
        setRuleForm({
            code: rule.code, name: rule.name, description: rule.description,
            baseAmountType: rule.baseAmountType, baseAmountValue: rule.baseAmountValue,
            gracePeriodDays: rule.gracePeriodDays, interestPeriodDays: rule.interestPeriodDays,
            interestRate: rule.interestRate, interestMode: rule.interestMode, isActive: rule.isActive,
        });
    };

    const openCreateRule = () => {
        setEditingRule(null);
        setIsCreatingRule(true);
        setRuleForm({ baseAmountType: 'FIXED', baseAmountValue: 0, gracePeriodDays: 0, interestPeriodDays: 1, interestRate: 0, interestMode: 'NONE', isActive: true });
    };

    const handleSaveRule = async () => {
        if (!ruleForm.name || !ruleForm.code) return;
        setSavingRule(true);
        try {
            const payload = ruleForm as PenaltyRuleRequest;
            if (editingRule) {
                const updated = await penaltyApi.updateRule(editingRule.id, payload);
                setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
            } else {
                const created = await penaltyApi.createRule(payload);
                setRules(prev => [...prev, created]);
            }
            setEditingRule(null);
            setIsCreatingRule(false);
            flash(true, editingRule ? 'Penalty rule updated.' : 'Penalty rule created.');
        } catch (err) { flash(false, getApiErrorMessage(err, 'Failed to save rule.')); }
        finally { setSavingRule(false); }
    };

    const toggleRuleActive = async (rule: PenaltyRule) => {
        try {
            const updated = await penaltyApi.updateRule(rule.id, {
                code: rule.code, name: rule.name, description: rule.description,
                baseAmountType: rule.baseAmountType, baseAmountValue: rule.baseAmountValue,
                gracePeriodDays: rule.gracePeriodDays, interestPeriodDays: rule.interestPeriodDays,
                interestRate: rule.interestRate, interestMode: rule.interestMode,
                isActive: !rule.isActive,
            });
            setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
        } catch (err) { flash(false, getApiErrorMessage(err, 'Failed to toggle rule.')); }
    };

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) { flash(false, 'File too large. Max 6 MB.'); return; }
        const r = new FileReader();
        r.onloadend = () => { setter(r.result as string); setDirtyId(true); };
        r.readAsDataURL(file);
    };

    // ── Submit handlers ─────────────────────────────────────────────────────
    const handleIdentity = async (e: React.FormEvent) => {
        e.preventDefault(); setSavingId(true);
        try {
            const p = { saccoName, prefix: prefix.toUpperCase(), padLength, registrationFee: regFee, logoUrl, faviconUrl };
            if (settings?.initialized) await settingsApi.updateCoreSettings(p);
            else { await settingsApi.initializeSettings(p); setSettings(s => ({ ...s, initialized: true }) as SaccoSettings); }
            setDirtyId(false); flash(true, 'Identity settings saved.'); await refreshSettings();
        } catch (err) { flash(false, getApiErrorMessage(err, 'Failed to save.')); }
        finally { setSavingId(false); }
    };

    const handleSecurity = async (e: React.FormEvent) => {
        e.preventDefault(); setSavingSec(true);
        try { await settingsApi.updateSecurityPolicy(sec); setDirtySec(false); flash(true, 'Security policy saved.'); }
        catch (err) { flash(false, getApiErrorMessage(err, 'Failed to save security policy.')); }
        finally { setSavingSec(false); }
    };

    const handleSched = async (e: React.FormEvent) => {
        e.preventDefault(); setSavingSched(true);
        try {
            await settingsApi.updateSavingsSchedule({
                savingsDay, savingsDeadlineNextDay: deadlineNextDay,
                savingsDeadlineHour: deadlineHour, savingsDeadlineMinute: deadlineMinute,
            });
            setDirtySched(false);
            flash(true, 'Savings schedule saved.');
        } catch { flash(false, 'Failed to save savings schedule.'); }
        finally { setSavingSched(false); }
    };

    const handleComm = async (e: React.FormEvent) => {
        e.preventDefault(); setSavingComm(true);
        try { await settingsApi.updateCommunication({ smtpFromName: fromName, supportEmail: suppEmail }); setDirtyComm(false); flash(true, 'Communication settings saved.'); }
        catch (err) { flash(false, getApiErrorMessage(err, 'Failed to save.')); }
        finally { setSavingComm(false); }
    };

    const handleModules = async (e: React.FormEvent) => {
        e.preventDefault(); setSavingMods(true);
        try { await settingsApi.updateFeatureFlags({ flags: mods }); flash(true, 'Module configuration saved.'); await refreshSettings(); }
        catch (err) { flash(false, getApiErrorMessage(err, 'Failed to update modules.')); }
        finally { setSavingMods(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="animate-spin text-slate-600" size={22} />
            <span className="text-sm">Loading settings…</span>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-16">
            {/* Page header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Manage identity, security policies, communication and feature modules.</p>
            </div>

            {/* Toast notification */}
            {toast && (
                <div className={`mb-5 flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-sm
                    ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {toast.ok ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <AlertCircle size={15} className="text-red-500 shrink-0" />}
                    <span className="flex-1">{toast.msg}</span>
                    <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100 text-base leading-none ml-2">×</button>
                </div>
            )}

            <div className="flex gap-6 items-start">
                {/* ── Sidebar nav ─────────────────────────────────────── */}
                <nav className="w-52 shrink-0 sticky top-6">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        {TABS.filter(t => isSystemAdmin || t.id === 'penalties').map((t, i, arr) => {
                            const active = tab === t.id;
                            const dirty = (t.id === 'identity' && dirtyId) || (t.id === 'security' && dirtySec) || (t.id === 'communication' && dirtyComm) || (t.id === 'schedule' && dirtySched);
                            return (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                        className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all
                                        ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}
                                        ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <span className={active ? 'text-slate-300' : 'text-slate-400'}>{t.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold">{t.label}</div>
                                        <div className={`text-[10px] mt-0.5 truncate ${active ? 'text-slate-400' : 'text-slate-400'}`}>{t.desc}</div>
                                    </div>
                                    {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
                                    {active && <ChevronRight size={11} className="shrink-0 text-slate-500" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <p className="flex items-center gap-1.5 mt-3 px-1 text-[10px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Unsaved changes
                    </p>
                </nav>

                {/* ── Content ─────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-5">

                    {/* IDENTITY */}
                    {tab === 'identity' && (
                        <form onSubmit={handleIdentity} className="space-y-5">
                            <Section title={settings?.initialized ? 'SACCO Identity' : 'Initialize Platform'} desc="Your SACCO name, member numbering format and registration fee.">
                                <div className="space-y-5">
                                    <Field label="Official SACCO Name">
                                        <input type="text" required value={saccoName} placeholder="e.g. Umoja Savings & Credit"
                                               className={inputCls}
                                               onChange={e => { setSaccoName(e.target.value); setDirtyId(true); }} />
                                    </Field>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Member Number Prefix" hint="3 uppercase letters (auto-generated from name).">
                                            <div className="relative">
                                                <input type="text" required maxLength={3} minLength={3} value={prefix} placeholder="UMJ"
                                                       className={inputCls + ' uppercase pr-12'}
                                                       onChange={e => { setPrefix(e.target.value.toUpperCase()); setPrefixManual(true); setDirtyId(true); }} />
                                                {!prefixManual && prefix && (
                                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold pointer-events-none">
                                                        Auto
                                                    </span>
                                                )}
                                            </div>
                                        </Field>
                                        <NumberField label="Pad Length" value={padLength} min={1} max={12} hint="Zero-padded digits after prefix."
                                                     onChange={v => { setPadLength(v); setDirtyId(true); }} />
                                    </div>

                                    <NumberField label="Registration Fee (KES)" value={regFee} min={0}
                                                 hint="One-time fee charged to new members via M-Pesa."
                                                 onChange={v => { setRegFee(v); setDirtyId(true); }} />
                                </div>
                            </Section>

                            <Section title="Branding" desc="Logo shown in the sidebar. Favicon shown in browser tabs. PNG, JPG, SVG — max 6 MB.">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    {[
                                        { label: 'SACCO Logo', url: logoUrl, setter: setLogoUrl, accept: 'image/png,image/jpeg,image/svg+xml' },
                                        { label: 'Browser Favicon', url: faviconUrl, setter: setFaviconUrl, accept: 'image/png,image/x-icon,image/jpeg' },
                                    ].map(({ label, url, setter, accept }) => (
                                        <Field key={label} label={label}>
                                            <div className="flex items-center gap-4 mt-1">
                                                {url ? (
                                                    <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 p-1.5 shadow-inner">
                                                        <img src={url} alt={label} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-300">
                                                        <Image size={18} />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <input type="file" accept={accept}
                                                           onChange={e => handleImage(e, setter)}
                                                           className="block w-full text-xs text-slate-500 cursor-pointer
                                                            file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0
                                                            file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700
                                                            hover:file:bg-slate-200 transition" />
                                                    {url && (
                                                        <button type="button" onClick={() => { setter(''); setDirtyId(true); }}
                                                                className="text-xs text-red-500 mt-1.5 hover:underline">
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </Field>
                                    ))}
                                </div>
                            </Section>

                            <div className="flex justify-end">
                                <SaveBtn loading={savingId} dirty={dirtyId}
                                         label={settings?.initialized ? 'Save Identity' : 'Initialize Platform'} />
                            </div>
                        </form>
                    )}

                    {/* SECURITY */}
                    {tab === 'security' && (
                        <form onSubmit={handleSecurity} className="space-y-5">
                            <Section title="Login Protection" desc="Lock accounts after repeated failed login attempts.">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <NumberField label="Max Login Attempts" value={sec.maxLoginAttempts} min={1} max={20} suffix="attempts"
                                                 hint="Consecutive failures before the account is locked."
                                                 onChange={v => setSP('maxLoginAttempts', v)} />
                                    <NumberField label="Lockout Duration" value={sec.lockoutDurationMinutes} min={1} max={1440} suffix="minutes"
                                                 hint="How long the account stays locked after exceeding the limit."
                                                 onChange={v => setSP('lockoutDurationMinutes', v)} />
                                </div>
                            </Section>

                            <Section title="Session & Token Expiry" desc="Control how long authentication tokens and sessions stay valid.">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <NumberField label="Session Timeout" value={sec.sessionTimeoutMinutes} min={5} max={480} suffix="minutes"
                                                 warn="Requires a server restart to take effect."
                                                 onChange={v => setSP('sessionTimeoutMinutes', v)} />
                                    <NumberField label="MFA Pre-Auth Token" value={sec.mfaTokenExpiryMinutes} min={1} max={60} suffix="minutes"
                                                 hint="Window to complete MFA after entering credentials."
                                                 onChange={v => setSP('mfaTokenExpiryMinutes', v)} />
                                    <NumberField label="Password Reset Link" value={sec.passwordResetExpiryMin} min={5} max={1440} suffix="minutes"
                                                 hint="How long a password reset link stays valid."
                                                 onChange={v => setSP('passwordResetExpiryMin', v)} />
                                    <NumberField label="Email Verification Link" value={sec.emailVerifyExpiryHours} min={1} max={168} suffix="hours"
                                                 hint="How long an email-verification link stays valid."
                                                 onChange={v => setSP('emailVerifyExpiryHours', v)} />
                                </div>
                            </Section>

                            <Section title="Password Policy" desc="Enforce strong passwords for all users.">
                                <div className="max-w-xs">
                                    <NumberField label="Minimum Password Length" value={sec.minPasswordLength} min={8} max={64} suffix="chars"
                                                 hint="Applied at registration and password reset. Uppercase, lowercase, digit and special character are always required."
                                                 onChange={v => setSP('minPasswordLength', v)} />
                                </div>
                            </Section>

                            <Section title="API Rate Limits" desc="Protect the platform from abuse by throttling API requests.">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <NumberField label="General API Limit" value={sec.rateLimitGeneralPerMin} min={10} max={300} suffix="req / min"
                                                 hint="Applies to all authenticated endpoints not covered by a stricter rule."
                                                 onChange={v => setSP('rateLimitGeneralPerMin', v)} />
                                    <NumberField label="Contact Verification Limit" value={sec.contactVerifyRateLimit} min={1} max={20} suffix="requests"
                                                 hint="Max verification emails / OTPs within the window below."
                                                 onChange={v => setSP('contactVerifyRateLimit', v)} />
                                    <NumberField label="Verification Window" value={sec.contactVerifyWindowMin} min={1} max={60} suffix="minutes"
                                                 hint="Sliding window used to count contact-verification requests."
                                                 onChange={v => setSP('contactVerifyWindowMin', v)} />
                                </div>
                            </Section>

                            <div className="flex justify-end">
                                <SaveBtn loading={savingSec} dirty={dirtySec} label="Save Security Policy" />
                            </div>
                        </form>
                    )}

                    {/* COMMUNICATION */}
                    {tab === 'communication' && (
                        <form onSubmit={handleComm} className="space-y-5">
                            <Section title="Email Sender" desc="Controls how outgoing system emails appear to recipients.">
                                <div className="space-y-5">
                                    <Field label="Sender Display Name" hint="Shown in the From field of all outgoing emails (e.g. 'Umoja SACCO').">
                                        <input type="text" required value={fromName} placeholder="Secure SACCO" className={inputCls}
                                               onChange={e => { setFromName(e.target.value); setDirtyComm(true); }} />
                                    </Field>
                                    <Field label="Support Email Address" hint="Shown in member-facing UI and email footers. Leave blank to hide.">
                                        <input type="email" value={suppEmail} placeholder="support@yoursacco.co.ke" className={inputCls}
                                               onChange={e => { setSuppEmail(e.target.value); setDirtyComm(true); }} />
                                    </Field>
                                </div>
                            </Section>

                            <InfoBanner>
                                <strong>Email API key is environment-only.</strong> The Resend API key and the <code className="font-mono bg-amber-100 px-1 rounded">MAIL_FROM</code> address are
                                managed via environment variables for security and cannot be changed here. Update <code className="font-mono bg-amber-100 px-1 rounded">RESEND_API_KEY</code> and{' '}
                                <code className="font-mono bg-amber-100 px-1 rounded">MAIL_FROM</code> in your <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file and restart the server.
                            </InfoBanner>

                            <div className="flex justify-end">
                                <SaveBtn loading={savingComm} dirty={dirtyComm} label="Save Communication Settings" />
                            </div>
                        </form>
                    )}


                    {/* SAVINGS SCHEDULE */}
                    {tab === 'schedule' && (
                        <form onSubmit={handleSched} className="space-y-5">
                            <Section
                                title="Savings Schedule"
                                desc="Define the day members are expected to make savings / repayments and the hard deadline for the week."
                            >
                                <div className="space-y-6">
                                    {/* Savings day */}
                                    <Field label="Savings Day" hint="The primary day of the week on which members are expected to contribute.">
                                        <div className="grid grid-cols-7 gap-1">
                                            {DAYS_OF_WEEK.map(d => (
                                                <button
                                                    key={d} type="button"
                                                    onClick={() => { setSavingsDay(d); setDirtySched(true); }}
                                                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ` +
                                                        (savingsDay === d
                                                            ? 'bg-slate-900 text-white border-slate-900'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
                                                >
                                                    {d.slice(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1.5">Selected: <strong>{savingsDay.charAt(0) + savingsDay.slice(1).toLowerCase()}</strong></p>
                                    </Field>

                                    {/* Deadline day */}
                                    <Field
                                        label="Deadline Day"
                                        hint={deadlineNextDay
                                            ? `Members have until the day after ${savingsDay.charAt(0) + savingsDay.slice(1).toLowerCase()} to complete payment.`
                                            : `The deadline is the same day as savings day (${savingsDay.charAt(0) + savingsDay.slice(1).toLowerCase()}).`}
                                    >
                                        <div className="flex gap-3">
                                            {[
                                                { val: false, label: 'Same day as savings day' },
                                                { val: true,  label: 'Next day after savings day' },
                                            ].map(opt => (
                                                <button
                                                    key={String(opt.val)} type="button"
                                                    onClick={() => { setDeadlineNextDay(opt.val); setDirtySched(true); }}
                                                    className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ` +
                                                        (deadlineNextDay === opt.val
                                                            ? 'bg-slate-900 text-white border-slate-900'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>

                                    {/* Deadline time */}
                                    <Field
                                        label="Deadline Time (EAT)"
                                        hint={`Failure to meet the obligation by ${String(deadlineHour).padStart(2,'0')}:${String(deadlineMinute).padStart(2,'0')} will trigger the SAVINGS_MISSED_CONTRIBUTION penalty.`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">Hour (0–23)</label>
                                                <input
                                                    type="number" min={0} max={23} value={deadlineHour}
                                                    onChange={e => { setDeadlineHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0))); setDirtySched(true); }}
                                                    className={inputCls}
                                                />
                                            </div>
                                            <span className="text-2xl font-bold text-slate-400 mt-4">:</span>
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">Minute (0–59)</label>
                                                <input
                                                    type="number" min={0} max={59} value={deadlineMinute}
                                                    onChange={e => { setDeadlineMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0))); setDirtySched(true); }}
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                                            <strong>Summary:</strong> Members must save on{' '}
                                            <strong>{savingsDay.charAt(0) + savingsDay.slice(1).toLowerCase()}</strong>. Deadline is{' '}
                                            <strong>
                                                {deadlineNextDay
                                                    ? `${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][(DAYS_OF_WEEK.indexOf(savingsDay) + 1) % 7]}`
                                                    : savingsDay.charAt(0) + savingsDay.slice(1).toLowerCase()}{' '}
                                                at {String(deadlineHour).padStart(2,'0')}:{String(deadlineMinute).padStart(2,'0')} EAT
                                            </strong>.
                                            Members who haven't saved by this time will be marked <strong>OVERDUE</strong> and a penalty will be raised.
                                        </div>
                                    </Field>
                                </div>
                            </Section>

                            <div className="flex justify-end">
                                <SaveBtn loading={savingSched} dirty={dirtySched} label="Save Schedule" />
                            </div>
                        </form>
                    )}

                    {/* MODULES */}
                    {tab === 'modules' && (
                        <form onSubmit={handleModules} className="space-y-5">
                            <Section title="System Modules" desc="Enable or disable core platform features. Changes are reflected in the sidebar immediately after saving.">
                                <div className="space-y-3">
                                    {Object.entries(MODULE_CONFIG).map(([key, cfg]) => {
                                        const on = mods[key] ?? false;
                                        return (
                                            <button key={key} type="button"
                                                    onClick={() => setMods(m => ({ ...m, [key]: !m[key] }))}
                                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border cursor-pointer text-left
                                                    transition-all select-none ring-1
                                                    ${on ? `${cfg.cls.ring} ${cfg.cls.bg}` : 'border-slate-200 bg-slate-50/40 ring-transparent hover:bg-slate-50'}`}>
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                                                    ${on ? cfg.cls.bg : 'bg-white border border-slate-200'}`}>
                                                    <span className={on ? cfg.cls.icon : 'text-slate-300'}>{cfg.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold ${on ? cfg.cls.text : 'text-slate-500'}`}>{cfg.label}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{cfg.desc}</p>
                                                </div>
                                                {on
                                                    ? <ToggleRight size={28} className={cfg.cls.icon} />
                                                    : <ToggleLeft size={28} className="text-slate-300" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Section>

                            <div className="flex justify-end">
                                <SaveBtn loading={savingMods} label="Save Module Configuration" />
                            </div>
                        </form>
                    )}

                    {/* ─── PENALTIES TAB ─────────────────────────────── */}
                    {tab === 'penalties' && (
                        <div className="space-y-5">
                            {/* Intro card */}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Penalty Rules</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Define fine amounts for late attendance, absenteeism, missed savings, and loan defaults. Changes take effect on the next evaluation run.
                                        </p>
                                    </div>
                                    <button onClick={openCreateRule}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shrink-0">
                                        <Plus size={13} /> New Rule
                                    </button>
                                </div>

                                {rulesLoading ? (
                                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                                        <Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading rules…</span>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-6">
                                        {/* Group rules by category */}
                                        {[
                                            { key: 'MEETING', label: 'Meeting Attendance', icon: '📅', desc: 'Fines applied automatically when attendance is recorded.', color: 'blue' },
                                            { key: 'SAVINGS', label: 'Savings Contributions', icon: '💰', desc: 'Fines for missing mandatory savings within the obligation period.', color: 'emerald' },
                                            { key: 'LOAN', label: 'Loan Repayments', icon: '🏦', desc: 'Fines applied when a weekly loan installment is underpaid or missed.', color: 'amber' },
                                        ].map(({ key, label, icon, desc, color }) => {
                                            const groupRules = rules.filter(r => r.code.startsWith(key));
                                            const colorMap: Record<string, string> = {
                                                blue: 'bg-blue-50 border-blue-100 text-blue-700',
                                                emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                                                amber: 'bg-amber-50 border-amber-100 text-amber-700',
                                            };
                                            return (
                                                <div key={key}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${colorMap[color]}`}>
                                                            {icon} {label}
                                                        </span>
                                                        <div className="flex-1 h-px bg-slate-100" />
                                                        <span className="text-[10px] text-slate-400">{groupRules.length} rule{groupRules.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mb-3 ml-1">{desc}</p>
                                                    {groupRules.length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic ml-1">No rules defined.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {groupRules.sort((a, b) => a.code.localeCompare(b.code)).map(rule => (
                                                                <div key={rule.id}
                                                                     className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all
                                                                        ${rule.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                                    {/* Active toggle */}
                                                                    <button type="button" onClick={() => toggleRuleActive(rule)}
                                                                            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
                                                                            transition-colors cursor-pointer focus:outline-none
                                                                            ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                                                                            ${rule.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                    </button>

                                                                    {/* Rule info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-sm font-semibold text-slate-800">{rule.name}</span>
                                                                            {!rule.isActive && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold">DISABLED</span>}
                                                                        </div>
                                                                        {rule.description && (
                                                                            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{rule.description}</p>
                                                                        )}
                                                                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{rule.code}</p>
                                                                    </div>

                                                                    {/* Fine amount */}
                                                                    <div className="text-right shrink-0">
                                                                        <div className="text-sm font-bold text-slate-900">
                                                                            {rule.baseAmountType === 'PERCENTAGE'
                                                                                ? `${rule.baseAmountValue}% of shortfall`
                                                                                : `KES ${rule.baseAmountValue.toLocaleString()}`}
                                                                        </div>
                                                                        {rule.interestMode !== 'NONE' && rule.interestRate > 0 && (
                                                                            <div className="text-[10px] text-amber-600">
                                                                                +{rule.interestRate}% {rule.interestMode.toLowerCase()} / {rule.interestPeriodDays}d
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Edit button */}
                                                                    <button onClick={() => openEditRule(rule)}
                                                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Other / custom rules */}
                                        {(() => {
                                            const other = rules.filter(r => !['MEETING', 'SAVINGS', 'LOAN'].some(prefix => r.code.startsWith(prefix)));
                                            if (!other.length) return null;
                                            return (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold bg-slate-100 text-slate-600 border-slate-200">
                                                            ⚙️ Other / Custom
                                                        </span>
                                                        <div className="flex-1 h-px bg-slate-100" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        {other.map(rule => (
                                                            <div key={rule.id}
                                                                 className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all
                                                                    ${rule.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                                <button type="button" onClick={() => toggleRuleActive(rule)}
                                                                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${rule.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                </button>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-semibold text-slate-800">{rule.name}</div>
                                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{rule.code}</p>
                                                                </div>
                                                                <div className="text-sm font-bold text-slate-900 shrink-0">
                                                                    {rule.baseAmountType === 'PERCENTAGE' ? `${rule.baseAmountValue}%` : `KES ${rule.baseAmountValue.toLocaleString()}`}
                                                                </div>
                                                                <button onClick={() => openEditRule(rule)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
                                                                    <Pencil size={13} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Meeting lateness tiers explainer */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                                <TriangleAlert size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                <div className="text-xs text-blue-700 leading-relaxed">
                                    <strong>How meeting lateness tiers work:</strong> The system checks the rule code to determine which tier applies.
                                    <code className="font-mono bg-blue-100 px-1 rounded mx-1">MEETING_LATE_30</code> applies to members arriving within 2 hours,
                                    <code className="font-mono bg-blue-100 px-1 rounded mx-1">MEETING_LATE_120</code> applies for over 2 hours late, and
                                    <code className="font-mono bg-blue-100 px-1 rounded mx-1">MEETING_ABSENT</code> applies when a member is marked absent.
                                    You can add additional tiers using <strong>New Rule</strong> — use the code format <code className="font-mono bg-blue-100 px-1 rounded">MEETING_LATE_&lt;minutes&gt;</code>.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Edit / Create Rule Modal ───────────────────── */}
                    {(editingRule || isCreatingRule) && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">
                                            {isCreatingRule ? 'Create New Penalty Rule' : `Edit: ${editingRule?.name}`}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {isCreatingRule ? 'Define a new fine type.' : `Code: ${editingRule?.code}`}
                                        </p>
                                    </div>
                                    <button onClick={() => { setEditingRule(null); setIsCreatingRule(false); }}
                                            className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
                                </div>
                                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                    {/* Code — only editable on create */}
                                    {isCreatingRule && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Rule Code</label>
                                            <input type="text" value={ruleForm.code ?? ''} placeholder="e.g. MEETING_LATE_45"
                                                   onChange={e => setRuleForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                                                   className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-slate-900" />
                                            <p className="text-[10px] text-slate-400 mt-1">Unique identifier. Use prefix: MEETING_, SAVINGS_, LOAN_</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Display Name</label>
                                        <input type="text" value={ruleForm.name ?? ''} placeholder="e.g. Late to Meeting (30 min)"
                                               onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                                               className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Description</label>
                                        <textarea rows={2} value={ruleForm.description ?? ''} placeholder="When is this rule applied?"
                                                  onChange={e => setRuleForm(f => ({ ...f, description: e.target.value }))}
                                                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900" />
                                    </div>

                                    {/* Fine type + amount */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Fine Type</label>
                                            <select value={ruleForm.baseAmountType ?? 'FIXED'}
                                                    onChange={e => setRuleForm(f => ({ ...f, baseAmountType: e.target.value as AmountType }))}
                                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                                                <option value="FIXED">Fixed (KES)</option>
                                                <option value="PERCENTAGE">% of shortfall</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                                {ruleForm.baseAmountType === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (KES)'}
                                            </label>
                                            <input type="number" min="0" step="0.01"
                                                   value={ruleForm.baseAmountValue ?? 0}
                                                   onChange={e => setRuleForm(f => ({ ...f, baseAmountValue: parseFloat(e.target.value) || 0 }))}
                                                   className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
                                        </div>
                                    </div>

                                    {/* Interest (optional) */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Accruing Interest (optional)</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Mode</label>
                                                <select value={ruleForm.interestMode ?? 'NONE'}
                                                        onChange={e => setRuleForm(f => ({ ...f, interestMode: e.target.value as InterestMode }))}
                                                        className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                                                    <option value="NONE">None</option>
                                                    <option value="FLAT">Flat</option>
                                                    <option value="SIMPLE">Simple</option>
                                                    <option value="COMPOUND">Compound</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rate (%)</label>
                                                <input type="number" min="0" step="0.01" value={ruleForm.interestRate ?? 0}
                                                       onChange={e => setRuleForm(f => ({ ...f, interestRate: parseFloat(e.target.value) || 0 }))}
                                                       disabled={ruleForm.interestMode === 'NONE'}
                                                       className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-40" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Every (days)</label>
                                                <input type="number" min="1" value={ruleForm.interestPeriodDays ?? 1}
                                                       onChange={e => setRuleForm(f => ({ ...f, interestPeriodDays: parseInt(e.target.value) || 1 }))}
                                                       disabled={ruleForm.interestMode === 'NONE'}
                                                       className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-40" />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400">Most meeting/savings penalties use None. Loan penalties can compound weekly.</p>
                                    </div>

                                    {/* Active toggle */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">Rule is Active</label>
                                        <button type="button"
                                                onClick={() => setRuleForm(f => ({ ...f, isActive: !f.isActive }))}
                                                className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors cursor-pointer
                                                ${ruleForm.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                                                ${ruleForm.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 px-6 pb-6">
                                    <button onClick={() => { setEditingRule(null); setIsCreatingRule(false); }}
                                            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={handleSaveRule} disabled={savingRule || !ruleForm.name || (isCreatingRule && !ruleForm.code)}
                                            className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold
                                                   flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
                                        {savingRule ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                        {savingRule ? 'Saving…' : isCreatingRule ? 'Create Rule' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaccoSettingsPage;