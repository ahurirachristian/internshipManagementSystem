import { useEffect, useState } from 'react';
import { fetchMySettings, updateMySettings } from '../../services/api';

<<<<<<< HEAD
=======
const inputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";

>>>>>>> developer
export default function SettingsSection() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
<<<<<<< HEAD
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  async function handleToggle(field) {
    if (!settings) return;
    const updated = { ...settings, [field]: !settings[field] };
    setSettings(updated);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await updateMySettings(updated);
      setSettings(saved);
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeChange(e) {
    if (!settings) return;
    const updated = { ...settings, theme: e.target.value };
    setSettings(updated);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await updateMySettings(updated);
      setSettings(saved);
      setSuccess('Settings saved successfully.');
=======
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
>>>>>>> developer
    } catch (err) {
      setError(err.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
<<<<<<< HEAD
    return <div className="status-message">Loading settings...</div>;
  }

  if (error && !settings) {
    return <div className="alert alert-error">{error}</div>;
=======
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
>>>>>>> developer
  }

  if (!settings) {
    return (
<<<<<<< HEAD
      <div className="card-panel">
        <h2>Settings</h2>
        <p>No settings available.</p>
=======
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Settings</h2>
        <p className="text-sm text-slate-500">No settings available.</p>
>>>>>>> developer
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="card-panel">
      <h2>Settings</h2>
      <p>Manage your account preferences and notifications.</p>
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <div className="settings-grid">
        <div className="setting-item">
          <div>
            <div className="setting-label">Email Notifications</div>
            <div className="setting-description">Receive email updates about your internship progress.</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
              disabled={saving}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div>
            <div className="setting-label">SMS Notifications</div>
            <div className="setting-description">Receive SMS alerts for important deadlines.</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={() => handleToggle('smsNotifications')}
              disabled={saving}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div>
            <div className="setting-label">Diary Reminders</div>
            <div className="setting-description">Get reminders to fill in your day diary.</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.diaryReminders}
              onChange={() => handleToggle('diaryReminders')}
              disabled={saving}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div>
            <div className="setting-label">Theme</div>
            <div className="setting-description">Choose your preferred interface theme.</div>
          </div>
          <select
            value={settings.theme}
            onChange={handleThemeChange}
            disabled={saving}
            className="form-input"
            style={{ minWidth: '150px' }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>
=======
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
>>>>>>> developer
    </div>
  );
}
