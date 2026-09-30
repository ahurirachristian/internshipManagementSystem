import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock } from 'lucide-react';
import { changeMyPassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';
import './LoginPage.css';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, homeFor, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      const me = await refreshUser();
      navigate(homeFor(me?.role || user?.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-slate-50 text-slate-900 text-sm rounded-xl border-2 border-slate-200 pl-10 pr-10 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] flex flex-col p-6 sm:p-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Set a New Password</h1>
          <p className="text-sm text-slate-500 mt-1">You must change your temporary password before continuing</p>
        </div>

        {error && <div className="alert alert-error show">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current-password" className={labelClass}>Current Password</label>
            <div className="relative">
              <input
                type="password"
                id="current-password"
                className={inputClass}
                placeholder="Enter your current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="new-password" className={labelClass}>New Password</label>
            <div className="relative">
              <input
                type="password"
                id="new-password"
                className={inputClass}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className={labelClass}>Confirm New Password</label>
            <div className="relative">
              <input
                type="password"
                id="confirm-password"
                className={inputClass}
                placeholder="Repeat your new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            className="w-full py-3 bg-gradient-to-br from-primary to-primary text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-2"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Password'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
