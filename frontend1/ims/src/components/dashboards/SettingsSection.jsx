import { useEffect, useState } from 'react';
import { fetchMySettings, updateMySettings } from '../../services/api';

const inputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";

export default function SettingsSection() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMySettings();
      setSettings(data);
    } catch (err) {
      setError(err.message || 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateMySettings(settings);
      setNotice('Settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm">
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Settings</h2>
        <p className="text-sm text-slate-500">No settings available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Settings</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Manage your notification and display preferences.</p>
      {notice && (
        <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-950 text-sm mb-4">
          <span className="font-medium">{notice}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div className="flex items-center gap-3">
          <input
            id="email-notifications"
            type="checkbox"
            checked={!!settings.emailNotifications}
            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
            className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
          />
          <label htmlFor="email-notifications" className="text-sm text-slate-700 dark:text-slate-300">
            Email Notifications
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="sms-notifications"
            type="checkbox"
            checked={!!settings.smsNotifications}
            onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
            className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
          />
          <label htmlFor="sms-notifications" className="text-sm text-slate-700 dark:text-slate-300">
            SMS Notifications
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="dark-mode"
            type="checkbox"
            checked={!!settings.darkMode}
            onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
            className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
          />
          <label htmlFor="dark-mode" className="text-sm text-slate-700 dark:text-slate-300">
            Dark Mode
          </label>
        </div>
        <div>
          <label htmlFor="language" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
            Language
          </label>
          <select
            id="language"
            value={settings.language || 'en'}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            className={inputClass}
          >
            <option value="en">English</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
