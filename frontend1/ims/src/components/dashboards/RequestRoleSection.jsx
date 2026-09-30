import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  createRoleRequest,
  fetchMyRoleRequests,
  fetchUniversityOptions,
} from '../../services/api';

const REQUESTABLE = ['SUPERVISOR', 'COMPANY', 'ADMIN'];

export default function RequestRoleSection() {
  const [requests, setRequests] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [role, setRole] = useState('SUPERVISOR');
  const [universityId, setUniversityId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function load() {
    fetchMyRoleRequests().then((list) => setRequests(Array.isArray(list) ? list : [])).catch(() => {});
  }

  useEffect(() => {
    load();
    fetchUniversityOptions().then((list) => setUniversities(Array.isArray(list) ? list : [])).catch(() => {});
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await createRoleRequest({
        requestedRole: role,
        universityId: role === 'SUPERVISOR' && universityId ? Number(universityId) : null,
        companyName: role === 'COMPANY' ? companyName.trim() : null,
        comment: comment.trim() || null,
      });
      setMessage('Request submitted. An administrator will review it.');
      setComment('');
      load();
    } catch (err) {
      setError(err.message || 'Could not submit your request.');
    } finally {
      setLoading(false);
    }
  }

  const pending = requests.filter((r) => r.status === 'PENDING');
  const inputClass = 'w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2.5 focus:border-primary focus:outline-none transition-all font-medium';

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Request a Role</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Ask an administrator for a different role. Your dashboard switches automatically once approved.
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Pending approval: {pending.map((r) => r.requestedRole).join(', ')}
        </div>
      )}

      {message && <div className="alert alert-success show">{message}</div>}
      {error && <div className="alert alert-error show">{error}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="request-role">
            Role
          </label>
          <select id="request-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            {REQUESTABLE.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {role === 'SUPERVISOR' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="request-university">
              University
            </label>
            <select
              id="request-university"
              className={inputClass}
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
            >
              <option value="">Select university</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.shortForm} — {u.fullName}</option>
              ))}
            </select>
          </div>
        )}

        {role === 'COMPANY' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="request-company">
              Company
            </label>
            <input
              id="request-company"
              className={inputClass}
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="request-comment">
            Reason (optional)
          </label>
          <input
            id="request-comment"
            className={inputClass}
            placeholder="Add a short note"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>

      {requests.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {requests.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{r.requestedRole}</span>
              <span className="text-slate-500 dark:text-slate-400">{r.status}{r.reviewComment ? ` — ${r.reviewComment}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
