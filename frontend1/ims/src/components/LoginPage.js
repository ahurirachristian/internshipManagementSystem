import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';
import CustomSelect from './CustomSelect';
import './LoginPage.css';

export default function LoginPage() {
  const { login, homeFor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const notice = location.state?.registered
    ? 'Account created successfully. Please sign in.'
    : location.state?.reset
      ? 'Password updated successfully. Please sign in.'
      : '';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const payload = await login(username.trim(), password, role.toUpperCase());
      navigate(homeFor(payload.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
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
          <h1 className="text-xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        {notice && <div className="alert alert-success show">{notice}</div>}
        {error && <div className="alert alert-error show">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className={labelClass}>Username</label>
            <div className="relative">
              <input
                type="text"
                id="username"
                className={inputClass}
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Role</label>
            <CustomSelect
              id="login-role"
              value={role}
              onChange={setRole}
              options={['STUDENT', 'SUPERVISOR', 'COMPANY', 'ADMIN']}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={inputClass}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            className="w-full py-3 bg-gradient-to-br from-primary to-primary text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:from-primary hover:to-primary active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-2"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-5 pt-5 border-t border-slate-200">
          <p className="text-xs text-slate-500 font-medium">
            <Link to="/register" className="text-primary font-semibold hover:underline">Create an account</Link>
            <span className="mx-2 text-slate-300">|</span>
            <Link to="/forgot-password" className="text-primary font-semibold hover:underline">Forgot password?</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
