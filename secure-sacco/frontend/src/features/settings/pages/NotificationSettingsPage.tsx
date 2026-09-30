import React, { useState, useEffect } from 'react';
import { Shield, Bell, Smartphone, Mail, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { settingsApi, type NotificationPreferenceDto } from '../api/settingsApi';

export const NotificationSettingsPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferenceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToastMsg({ ok, msg });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getNotificationPreferences();
      setPreferences(data);
    } catch {
      showToast(false, 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferenceDto) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: !preferences[key]
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    try {
      setSaving(true);
      await settingsApi.updateNotificationPreferences(preferences);
      showToast(true, 'Notification settings saved successfully');
    } catch {
      showToast(false, 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!preferences) return null;

  const ToggleSwitch = ({ checked, onChange, disabled = false }: { checked: boolean, onChange: () => void, disabled?: boolean }) => {
    const isChecked = Boolean(checked);
    return (
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`${
          isChecked ? 'bg-primary-600' : 'bg-slate-200'
        } relative inline-flex flex-shrink-0 h-7 w-14 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50`}
      >
        <span className={`${
          isChecked ? 'translate-x-7' : 'translate-x-0'
        } pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`} />
      </button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Control how and when you receive alerts from Secure Sacco.
        </p>
      </div>

      {toastMsg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-sm ${toastMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toastMsg.ok ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <AlertCircle size={15} className="text-red-500 shrink-0" />}
          <span className="flex-1">{toastMsg.msg}</span>
        </div>
      )}

      {/* Global Delivery Channels */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-primary-500" />
            Delivery Channels
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Master switches for Email and SMS. Turning these off disables all notifications for that channel.</p>
          </div>
        </div>
        <div className="px-4 py-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive alerts to your registered email address.</p>
              </div>
            </div>
            <ToggleSwitch checked={preferences.emailEnabled} onChange={() => handleToggle('emailEnabled')} disabled={saving} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive urgent alerts via text message.</p>
              </div>
            </div>
            <ToggleSwitch checked={preferences.smsEnabled} onChange={() => handleToggle('smsEnabled')} disabled={saving} />
          </div>
        </div>
      </div>

      {/* Specific Events */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary-500" />
            Event Preferences
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Choose which specific events trigger a notification.</p>
          </div>
        </div>
        <div className="px-4 py-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Guarantor Requests</p>
              <p className="text-sm text-gray-500">When someone asks you to guarantee a loan, or responds to your request.</p>
            </div>
            <ToggleSwitch checked={preferences.notifyOnGuarantorRequests} onChange={() => handleToggle('notifyOnGuarantorRequests')} disabled={saving} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Loan Updates</p>
              <p className="text-sm text-gray-500">Status changes on your loan applications (Approvals, Rejections).</p>
            </div>
            <ToggleSwitch checked={preferences.notifyOnLoanUpdates} onChange={() => handleToggle('notifyOnLoanUpdates')} disabled={saving} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Transactions</p>
              <p className="text-sm text-gray-500">Alerts for deposits, withdrawals, and loan repayments.</p>
            </div>
            <ToggleSwitch checked={preferences.notifyOnTransactions} onChange={() => handleToggle('notifyOnTransactions')} disabled={saving} />
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
