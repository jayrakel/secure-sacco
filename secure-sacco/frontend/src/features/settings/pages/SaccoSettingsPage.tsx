import React, { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings-api';
import type { SaccoSettings } from '../api/settings-api';
import { useSettings } from '../context/SettingsContext';

const SaccoSettingsPage: React.FC = () => {
    const { refreshSettings } = useSettings(); // Use context to update the sidebar
    const [initialLoad, setInitialLoad] = useState(true);
    const [settings, setSettings] = useState<SaccoSettings | null>(null);

    // Core Form State
    const [saccoName, setSaccoName] = useState('');
    const [prefix, setPrefix] = useState('');
    const [padLength, setPadLength] = useState<number>(7);

    // Feature Flags State
    const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({
        members: true,
        loans: false,
        savings: false,
        reports: false
    });

    // UI State
    const [prefixManuallyEdited, setPrefixManuallyEdited] = useState(false);
    const [isSavingCore, setIsSavingCore] = useState(false);
    const [isSavingFlags, setIsSavingFlags] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsApi.getSettings();
                setSettings(data);
                if (data.initialized) {
                    setSaccoName(data.saccoName || '');
                    setPrefix(data.prefix || '');
                    setPadLength(data.padLength || 7);
                    setPrefixManuallyEdited(true);
                    if (data.enabledModules) {
                        setEnabledModules(data.enabledModules);
                    }
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load settings.');
            } finally {
                setInitialLoad(false);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (prefixManuallyEdited || saccoName.trim().length < 2) return;
        const timeoutId = setTimeout(async () => {
            try {
                const data = await settingsApi.generatePrefix(saccoName);
                setPrefix(data.prefix);
            } catch (err) {
                console.error('Prefix generation failed', err);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [saccoName, prefixManuallyEdited]);

    const handleCoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingCore(true);
        setError(''); setSuccess('');

        const payload = { saccoName, prefix: prefix.toUpperCase(), padLength };

        try {
            if (settings?.initialized) {
                await settingsApi.updateCoreSettings(payload);
                setSuccess('Core settings updated successfully.');
            } else {
                await settingsApi.initializeSettings(payload);
                setSuccess('SACCO settings initialized successfully.');
                setSettings({ ...settings, initialized: true, ...payload });
            }
            await refreshSettings();
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save settings.');
        } finally {
            setIsSavingCore(false);
        }
    };

    const handleFlagsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingFlags(true);
        setError(''); setSuccess('');

        try {
            await settingsApi.updateFeatureFlags({ flags: enabledModules });
            setSuccess('System modules updated successfully.');
            await refreshSettings(); // Tells Sidebar to instantly update
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update modules.');
        } finally {
            setIsSavingFlags(false);
        }
    };

    if (initialLoad) return <div className="p-6 text-gray-600">Loading settings...</div>;

    return (
        <div className="max-w-3xl mx-auto mt-8 space-y-8">

            {/* Messages */}
            {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">{error}</div>}
            {success && <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm">{success}</div>}

            {/* CORE SETTINGS CARD */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="border-b border-gray-200 pb-4 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {settings?.initialized ? 'Global SACCO Settings' : 'Initialize SACCO Platform'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Configure your core organizational identity details.</p>
                </div>

                <form onSubmit={handleCoreSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Official SACCO Name</label>
                        <input
                            type="text" required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            value={saccoName} onChange={(e) => setSaccoName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Member Number Prefix (3 Letters)</label>
                            <div className="relative">
                                <input
                                    type="text" required maxLength={3} minLength={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm uppercase focus:ring-blue-500 focus:border-blue-500"
                                    value={prefix} onChange={(e) => { setPrefix(e.target.value); setPrefixManuallyEdited(true); }}
                                />
                                {!prefixManuallyEdited && prefix && (
                                    <span className="absolute right-3 top-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Auto-suggested</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Member Number Pad Length</label>
                            <input
                                type="number" required min={1}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                value={padLength} onChange={(e) => setPadLength(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit" disabled={isSavingCore || prefix.length !== 3}
                        className="w-full sm:w-auto bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isSavingCore ? 'Saving...' : settings?.initialized ? 'Update Settings' : 'Initialize Platform'}
                    </button>
                </form>
            </div>

            {/* SYSTEM MODULES CARD (FEATURE FLAGS) */}
            <div className={`bg-white rounded-lg shadow p-6 border border-gray-200 transition-opacity ${!settings?.initialized ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="border-b border-gray-200 pb-4 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">System Modules</h2>
                    <p className="text-sm text-gray-500 mt-1">Enable or disable core system features dynamically.</p>
                </div>

                <form onSubmit={handleFlagsSubmit} className="space-y-6">
                    <div className="space-y-4 max-w-sm">
                        {['members', 'loans', 'savings', 'reports'].map(module => (
                            <div key={module} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 capitalize">{module} Management</span>
                                <button
                                    type="button"
                                    onClick={() => setEnabledModules(prev => ({ ...prev, [module]: !prev[module] }))}
                                    className={`${
                                        enabledModules[module] ? 'bg-emerald-600' : 'bg-gray-200'
                                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
                                >
                  <span
                      aria-hidden="true"
                      className={`${
                          enabledModules[module] ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit" disabled={isSavingFlags}
                        className="w-full sm:w-auto bg-slate-800 text-white py-2 px-6 rounded-md hover:bg-slate-900 transition-colors disabled:opacity-50"
                    >
                        {isSavingFlags ? 'Saving...' : 'Save Module Configuration'}
                    </button>
                </form>
            </div>

        </div>
    );
};

export default SaccoSettingsPage;