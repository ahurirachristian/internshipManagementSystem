import { useEffect, useState } from 'react';
import { fetchMySettings, updateMySettings } from '../../services/api';

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
    } catch (err) {
      setError(err.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
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
    </div>
  );
}
