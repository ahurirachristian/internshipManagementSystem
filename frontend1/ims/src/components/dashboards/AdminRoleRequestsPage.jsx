import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { approveRoleRequest, denyRoleRequest, fetchRoleRequests } from '../../services/api';

export default function AdminRoleRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetchRoleRequests('PENDING')
      .then((list) => setRequests(Array.isArray(list) ? list : []))
      .catch((err) => setError(err.message || 'Unable to load role requests.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(request) {
    // PC7: a field-supervisor request carries the company it is scoped to.
    const context = request.requestedRole === 'SUPERVISOR'
      ? ` (university #${request.contextUniversityId ?? '—'})`
      : request.requestedRole === 'INDUSTRIAL_SUPERVISOR'
        ? ` (company: ${request.contextCompanyName ?? '—'})`
        : request.requestedRole === 'COMPANY'
          ? ` (${request.contextCompanyName ?? '—'})`
          : '';
    if (!window.confirm(`Approve the ${request.requestedRole}${context} request?`)) return;
    setError('');
    try {
      await approveRoleRequest(request.id, {
        universityId: request.contextUniversityId,
        companyName: request.contextCompanyName,
      });
      load();
    } catch (err) {
      setError(err.message || 'Unable to approve the request.');
    }
  }

  async function deny(request) {
    const comment = window.prompt('Optional reason for declining:') || '';
    setError('');
    try {
      await denyRoleRequest(request.id, comment);
      load();
    } catch (err) {
      setError(err.message || 'Unable to deny the request.');
    }
  }

  return (
    <DashboardLayout
      title="Role Requests"
      subtitle="Approve or decline requests from your users"
      searchable={false}
    >
      <div className="space-y-4">
        {error && <div className="alert alert-error show">{error}</div>}
        {loading && <p className="text-xs text-slate-500">Loading role requests...</p>}

        {!loading && requests.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
            No pending role requests.
          </div>
        )}

        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {request.requestedRole}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                User #{request.userId}
                {request.contextUniversityId ? ` · university #${request.contextUniversityId}` : ''}
                {request.contextCompanyName ? ` · ${request.contextCompanyName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => approve(request)}
                className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => deny(request)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
