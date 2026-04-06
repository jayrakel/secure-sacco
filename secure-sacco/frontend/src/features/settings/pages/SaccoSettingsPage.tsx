import React, { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings-api';
import type { SaccoSettings } from '../api/settings-api';
import { useSettings } from '../context/useSettings';
import { Settings, Image, Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

// ─── Reusable form field ──────────────────────────────────────────────────────
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
        {children}
        {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
);

const inputCls =
    'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white placeholder-slate-300 transition';

// ─── Module names ─────────────────────────────────────────────────────────────
const MODULE_LABELS: Record<string, { label: string; desc: string }> = {
    members: { label: 'Members', desc: 'Member registration, directory and profile management.' },
    loans: { label: 'Loans', desc: 'Loan applications, approvals, disbursement and repayments.' },
    savings: { label: 'Savings', desc: 'Member savings accounts, deposits and withdrawals.' },
    reports: { label: 'Reports', desc: 'Financial analytics, statements and performance reports.' },
};

const SaccoSettingsPage: React.FC = () => {
    const { refreshSettings } = useSettings();
    const [initialLoad, setInitialLoad] = useState(true);
    const [settings, setSettings] = useState<SaccoSettings | null>(null);

    const [saccoName, setSaccoName] = useState('');
    const [prefix, setPrefix] = useState('');
    const [padLength, setPadLength] = useState<number>(7);
    const [registrationFee, setRegistrationFee] = useState<number>(1000);
    const [logoUrl, setLogoUrl] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');
    const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({
        members: true,
        loans: false,
        savings: false,
        reports: false,
    });

    const [prefixManuallyEdited, setPrefixManuallyEdited] = useState(false);
    const [isSavingCore, setIsSavingCore] = useState(false);
    const [isSavingFlags, setIsSavingFlags] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        settingsApi
            .getSettings()
            .then((data) => {
                setSettings(data);
                if (data.initialized) {
                    setSaccoName(data.saccoName || '');
                    setPrefix(data.prefix?.replace('-', '') || '');
                    setPadLength(data.padLength || 7);
                    setRegistrationFee(data.registrationFee || 1000);
                    setLogoUrl(data.logoUrl || '');
                    setFaviconUrl(data.faviconUrl || '');
                    setPrefixManuallyEdited(true);
                    if (data.enabledModules) setEnabledModules(data.enabledModules);
                }
            })
            .catch((error: unknown) => {
                setError(getApiErrorMessage(error, 'Failed to load settings.'));
            })
            .finally(() => setInitialLoad(false));
    }, []);

    useEffect(() => {
        if (prefixManuallyEdited || saccoName.trim().length < 2) return;

        const id = setTimeout(async () => {
            try {
                const d = await settingsApi.generatePrefix(saccoName);
                setPrefix(d.prefix);
            } catch (error: unknown) {
                console.error(getApiErrorMessage(error, 'Failed to generate prefix.'));
            }
        }, 500);

        return () => clearTimeout(id);
    }, [saccoName, prefixManuallyEdited]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Enforce a 2MB size limit to keep the database fast
            if (file.size > 6 * 1024 * 1024) {
                setError('Image is too large. Please select a file under 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result as string); // Converts image to Base64 string
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingCore(true);
        setError('');
        setSuccess('');

        const payload = {
            saccoName,
            prefix: prefix.toUpperCase(),
            padLength,
            registrationFee,
            logoUrl,
            faviconUrl,
        };

        try {
            if (settings?.initialized) {
                await settingsApi.updateCoreSettings(payload);
            } else {
                await settingsApi.initializeSettings(payload);
                setSettings((s) => ({ ...s, initialized: true, ...payload }) as SaccoSettings);
            }
            setSuccess('Core settings saved successfully.');
            await refreshSettings();
        } catch (error: unknown) {
            setError(getApiErrorMessage(error, 'Failed to save settings.'));
        } finally {
            setIsSavingCore(false);
        }
    };

    const handleFlagsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingFlags(true);
        setError('');
        setSuccess('');

        try {
            await settingsApi.updateFeatureFlags({ flags: enabledModules });
            setSuccess('Module configuration saved.');
            await refreshSettings();
        } catch (error: unknown) {
            setError(getApiErrorMessage(error, 'Failed to update modules.'));
        } finally {
            setIsSavingFlags(false);
        }
    };

    if (initialLoad) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="animate-spin text-emerald-600" size={28} />
                <span className="text-sm">Loading settings…</span>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="text-slate-600" size={22} />
                    Platform Settings
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Configure your SACCO&apos;s identity and enable system modules.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                    <CheckCircle2 size={16} className="shrink-0" /> {success}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-sm font-bold text-slate-800">
                        {settings?.initialized ? 'Core Identity' : 'Initialize Platform'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {settings?.initialized
                            ? 'Update your SACCO name, member number format and fee.'
                            : 'Set up your SACCO identity to get started.'}
                    </p>
                </div>

                <form onSubmit={handleCoreSubmit} className="p-6 space-y-5">
                    <Field label="Official SACCO Name">
                        <input
                            type="text"
                            required
                            value={saccoName}
                            onChange={(e) => setSaccoName(e.target.value)}
                            placeholder="e.g. Umoja Savings & Credit"
                            className={inputCls}
                        />
                    </Field>

                    {/* --- NEW BRANDING FIELDS (FILE UPLOAD) --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4 pt-6 border-t border-slate-100">

                        {/* Logo Upload */}
                        <Field label="SACCO Logo" hint="Upload official logo (PNG/JPG, max 6MB).">
                            <div className="flex items-center gap-4 mt-2">
                                {logoUrl ? (
                                    <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 p-1">
                                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                                        <Image size={24} />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/svg+xml"
                                        onChange={(e) => handleImageUpload(e, setLogoUrl)}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                                    />
                                    {logoUrl && (
                                        <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-red-500 mt-2 hover:underline font-medium">
                                            Remove Image
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Field>

                        {/* Favicon Upload */}
                        <Field label="Browser Favicon" hint="Upload tab icon (1:1 aspect ratio, max 6MB).">
                            <div className="flex items-center gap-4 mt-2">
                                {faviconUrl ? (
                                    <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 p-2">
                                        <img src={faviconUrl} alt="Favicon Preview" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                                        <Image size={24} />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/x-icon"
                                        onChange={(e) => handleImageUpload(e, setFaviconUrl)}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                                    />
                                    {faviconUrl && (
                                        <button type="button" onClick={() => setFaviconUrl('')} className="text-xs text-red-500 mt-2 hover:underline font-medium">
                                            Remove Image
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field
                            label="Member Number Prefix"
                            hint="3 uppercase letters used in member IDs (e.g. UMJ → UMJ-0000001)"
                        >
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    maxLength={3}
                                    minLength={3}
                                    value={prefix}
                                    onChange={(e) => {
                                        setPrefix(e.target.value);
                                        setPrefixManuallyEdited(true);
                                    }}
                                    className={`${inputCls} uppercase`}
                                    placeholder="UMJ"
                                />
                                {!prefixManuallyEdited && prefix && (
                                    <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                                        Auto
                                    </span>
                                )}
                            </div>
                        </Field>

                        <Field label="Pad Length" hint="Number of zero-padded digits after the prefix.">
                            <input
                                type="number"
                                required
                                min={1}
                                value={padLength}
                                onChange={(e) => setPadLength(parseInt(e.target.value) || 0)}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field
                        label="Registration Fee (KES)"
                        hint="One-time fee charged to new members via M-Pesa."
                    >
                        <input
                            type="number"
                            required
                            min={0}
                            value={registrationFee}
                            onChange={(e) => setRegistrationFee(parseFloat(e.target.value) || 0)}
                            className={inputCls}
                        />
                    </Field>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSavingCore || prefix.length !== 3}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSavingCore && <Loader2 size={15} className="animate-spin" />}
                            {isSavingCore
                                ? 'Saving…'
                                : settings?.initialized
                                    ? 'Update Settings'
                                    : 'Initialize Platform'}
                        </button>
                    </div>
                </form>
            </div>

            <div
                className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-opacity ${
                    !settings?.initialized ? 'opacity-50 pointer-events-none' : ''
                }`}
            >
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-sm font-bold text-slate-800">System Modules</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Enable or disable core system features. Changes reflect in the sidebar immediately.
                    </p>
                </div>

                <form onSubmit={handleFlagsSubmit} className="p-6 space-y-5">
                    <div className="space-y-3">
                        {Object.entries(MODULE_LABELS).map(([key, { label, desc }]) => (
                            <div
                                key={key}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                    enabledModules[key]
                                        ? 'border-emerald-200 bg-emerald-50/30'
                                        : 'border-slate-100 bg-slate-50/50'
                                }`}
                            >
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEnabledModules((prev) => ({
                                            ...prev,
                                            [key]: !prev[key],
                                        }))
                                    }
                                    className="ml-4 shrink-0"
                                >
                                    {enabledModules[key] ? (
                                        <ToggleRight size={32} className="text-emerald-600" />
                                    ) : (
                                        <ToggleLeft size={32} className="text-slate-300" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isSavingFlags}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                        {isSavingFlags && <Loader2 size={15} className="animate-spin" />}
                        {isSavingFlags ? 'Saving…' : 'Save Module Configuration'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SaccoSettingsPage;