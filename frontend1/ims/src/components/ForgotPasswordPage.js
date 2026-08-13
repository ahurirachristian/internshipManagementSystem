import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import AuthShell from './AuthShell';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!username.trim() || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(username.trim(), newPassword, confirmPassword);
      navigate('/login', { state: { reset: true } });
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h1>Forgot Password</h1>
          <p>Reset your password using your username</p>
        </div>

        {error && <div className="alert alert-error show">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="username"
                className="form-control"
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <i className="fa-solid fa-user"></i>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                className="form-control"
                placeholder="Enter new password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <i className="fa-solid fa-lock"></i>
              <button
                type="button"
                className="toggle-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="form-control"
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <i className="fa-solid fa-lock"></i>
              <button
                type="button"
                className="toggle-password"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword((s) => !s)}
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}