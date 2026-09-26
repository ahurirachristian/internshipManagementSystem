import { useEffect, useState } from 'react';
import {
  Settings,
  Bell,
  MessageSquare,
  BookOpen,
  Palette,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import CustomSelect from '../CustomSelect';
import { fetchMySettings, updateMySettings } from '../../services/api';

// Design-system dropdown options (see components/CustomSelect.jsx, the same
// control the Audit Logs / User Management / Placement filters use).
const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const NOTIFICATION_TOGGLES = [
  {
    field: 'emailNotifications',
    label: 'Email Notifications',
    description: 'Receive email updates about your internship progress.',
    Icon: Bell,
  },
  {
    field: 'smsNotifications',
    label: 'SMS Notifications',
    description: 'Receive SMS alerts for important deadlines.',
    Icon: MessageSquare,
  },
  {
    field: 'diaryReminders',
    label: 'Diary Reminders',
    description: 'Get reminders to fill in your day diary.',
    Icon: BookOpen,
  },
];

export default function SettingsSection() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  async function persist(updated) {
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

  async function handleToggle(field) {
    if (!settings) return;
    await persist({ ...settings, [field]: !settings[field] });
  }

  async function handleThemeChange(theme) {
    if (!settings) return;
    await persist({ ...settings, theme });
  }

  if (loading) {
    return <div className="status-message">Loading settings...</div>;
  }

  if (error && !settings) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!settings) {
    return (
      <div className="card-panel">
        <h2>Settings</h2>
        <p>No settings available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {success && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess('')}
            className="text-emerald-600 hover:text-emerald-900 p-1 rounded"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-600 hover:text-rose-900 p-1 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Preferences</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage your account preferences and notifications
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {NOTIFICATION_TOGGLES.map(({ field, label, description, Icon }) => (
            <div
              key={field}
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!settings[field]}
                aria-label={label}
                disabled={saving}
                onClick={() => handleToggle(field)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  settings[field] ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings[field] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}

          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose your preferred interface theme.
                </p>
              </div>
            </div>
            <div className="w-full sm:w-44 shrink-0">
              <CustomSelect
                id="settings-theme"
                value={settings.theme}
                onChange={handleThemeChange}
                options={THEME_OPTIONS}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
