import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail } from 'lucide-react';
import { forgotPassword } from '../services/api';
import AuthShell from './AuthShell';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Request failed.');
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
          <h1 className="text-xl font-bold text-slate-900">Forgot Password</h1>
          <p className="text-sm text-slate-500 mt-1">We&rsquo;ll email you a reset link</p>
        </div>

        {error && <div className="alert alert-error show">{error}</div>}

        {sent ? (
          <div className="alert alert-success show">
            If that email exists, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  className={inputClass}
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              className="w-full py-3 bg-gradient-to-br from-primary to-primary text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:from-primary hover:to-primary active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="text-center mt-5 pt-5 border-t border-slate-200">
          <p className="text-xs text-slate-500 font-medium">
            <Link to="/login" className="text-primary font-semibold hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
