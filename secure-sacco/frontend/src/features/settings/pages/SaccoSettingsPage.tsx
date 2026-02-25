import React, { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings-api';
import type { SaccoSettings } from '../api/settings-api';

const SaccoSettingsPage: React.FC = () => {
    const [initialLoad, setInitialLoad] = useState(true);
    const [settings, setSettings] = useState<SaccoSettings | null>(null);

    // Form State
    const [saccoName, setSaccoName] = useState('');
    const [prefix, setPrefix] = useState('');
    const [padLength, setPadLength] = useState<number>(7);

    // UI State
    const [prefixManuallyEdited, setPrefixManuallyEdited] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // 1. Fetch current settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsApi.getSettings();
                setSettings(data);
                if (data.initialized) {
                    setSaccoName(data.saccoName || '');
                    setPrefix(data.prefix || '');
                    setPadLength(data.padLength || 7);
                    setPrefixManuallyEdited(true); // Don't auto-generate if already saved
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load settings.');
            } finally {
                setInitialLoad(false);
            }
        };
        fetchSettings();
    }, []);

    // 2. Debounce prefix generation
    useEffect(() => {
        // Only auto-generate if we haven't manually edited it and name is > 1 char
        if (prefixManuallyEdited || saccoName.trim().length < 2) return;

        const timeoutId = setTimeout(async () => {
            try {
                const data = await settingsApi.generatePrefix(saccoName);
                setPrefix(data.prefix);
            } catch (err) {
                console.error('Prefix generation failed', err);
            }
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(timeoutId);
    }, [saccoName, prefixManuallyEdited]);

    // 3. Handle Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        setSuccess('');

        const payload = { saccoName, prefix: prefix.toUpperCase(), padLength };

        try {
            if (settings?.initialized) {
                await settingsApi.updateCoreSettings(payload);
                setSuccess('Settings updated successfully.');
            } else {
                await settingsApi.initializeSettings(payload);
                setSuccess('SACCO settings initialized successfully.');
                setSettings({ ...settings, initialized: true, ...payload });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (initialLoad) {
        return <div className="p-6 text-gray-600">Loading settings...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto mt-8 bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                    {settings?.initialized ? 'Global SACCO Settings' : 'Initialize SACCO Platform'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {settings?.initialized
                        ? 'Update your core organizational settings. Note that changes to the prefix will affect how new member numbers are generated.'
                        : 'Welcome! Please configure your core SACCO details to initialize the platform.'}
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* SACCO Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Official SACCO Name
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={saccoName}
                        onChange={(e) => setSaccoName(e.target.value)}
                        placeholder="e.g. Betterlink Ventures Limited"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Member Prefix */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Member Number Prefix (3 Letters)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                maxLength={3}
                                minLength={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm uppercase focus:ring-blue-500 focus:border-blue-500"
                                value={prefix}
                                onChange={(e) => {
                                    setPrefix(e.target.value);
                                    setPrefixManuallyEdited(true); // Stop auto-generating if user touches it
                                }}
                                placeholder="e.g. BVL"
                            />
                            {!prefixManuallyEdited && prefix && (
                                <span className="absolute right-3 top-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Auto-suggested
                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            This will be prepended to all member numbers (e.g. <strong>{prefix || 'BVL'}</strong>-2026-0000001).
                        </p>
                    </div>

                    {/* Pad Length */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Member Number Pad Length
                        </label>
                        <input
                            type="number"
                            required
                            min={1}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            value={padLength}
                            onChange={(e) => setPadLength(parseInt(e.target.value) || 0)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            The number of zeros in the sequence (Default: 7).
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={isSaving || prefix.length !== 3}
                        className="w-full sm:w-auto bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? 'Saving...' : settings?.initialized ? 'Update Settings' : 'Initialize Platform'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SaccoSettingsPage;