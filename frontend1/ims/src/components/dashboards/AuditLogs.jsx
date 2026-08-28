import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../DashboardLayout';
import {
  ListChecks,
  Filter,
  Search,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import CustomSelect from '../CustomSelect';

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'VIEW', label: 'View' },
  { value: 'EXPORT', label: 'Export' },
];

const ACTION_BADGE_STYLES = {
  CREATE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border border-blue-200',
  DELETE: 'bg-rose-50 text-rose-700 border border-rose-200',
  LOGIN: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  LOGOUT: 'bg-amber-50 text-amber-700 border border-amber-200',
  VIEW: 'bg-blue-50 text-blue-700 border border-blue-200',
  EXPORT: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const API_ROOT = process.env.REACT_APP_API_ROOT || 'http://localhost:8082';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const url = `${API_ROOT}/api/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (cancelled) return;

      try {
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load audit logs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLogs();
    return () => {
      cancelled = true;
    };
  }, [actionFilter, startDate, endDate]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const username = (log.username || log.user?.username || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const targetEntity = (log.targetEntity || '').toLowerCase();
      const details = (log.details || log.description || '').toLowerCase();
      return (
        username.includes(q) ||
        action.includes(q) ||
        targetEntity.includes(q) ||
        details.includes(q)
      );
    });
  }, [logs, searchQuery]);

  return (
    <DashboardLayout
      title="Audit Logs"
      subtitle="Review system activity, changes, and access history"
      searchable={false}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Error Banner */}
        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 p-1 rounded" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading audit logs...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Filter Section */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Filters</span>
              </div>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="audit-search" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    Search
                  </label>
                  <input
                    id="audit-search"
                    type="text"
                    placeholder="Username, action, target, details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label htmlFor="audit-action" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    Action
                  </label>
                  <CustomSelect
                    id="audit-action"
                    value={actionFilter}
                    onChange={setActionFilter}
                    options={ACTION_TYPES}
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label htmlFor="audit-start" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    Start Date
                  </label>
                  <input
                    id="audit-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label htmlFor="audit-end" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    End Date
                  </label>
                  <input
                    id="audit-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
              </div>
            </section>

            {/* Table */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }} aria-label="Audit logs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                      <th scope="col" className="py-3.5 px-3 pl-5">Timestamp</th>
                      <th scope="col" className="py-3.5 px-3">User</th>
                      <th scope="col" className="py-3.5 px-3">Role</th>
                      <th scope="col" className="py-3.5 px-3">Action</th>
                      <th scope="col" className="py-3.5 px-3">Target Entity</th>
                      <th scope="col" className="py-3.5 px-3">Details</th>
                      <th scope="col" className="py-3.5 px-3 pr-5">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-3.5 px-3 pl-5 font-bold text-slate-900 dark:text-slate-100 text-xs">{formatDate(log.timestamp || log.createdAt)}</td>
                          <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{log.username || log.user?.username || '—'}</td>
                          <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{log.role || log.user?.role || '—'}</td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${ACTION_BADGE_STYLES[(log.action || '').toUpperCase()] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>
                              {log.action || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{log.targetEntity || '—'}</td>
                          <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{log.details || log.description || '—'}</td>
                          <td className="py-3.5 px-3 pr-5 text-xs text-slate-600 dark:text-slate-400 font-mono">{log.ipAddress || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 px-4 text-center">
                          <div className="max-w-sm mx-auto flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                              {searchQuery ? <Search className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                            </div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                              {searchQuery ? 'No results found' : 'No audit logs'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {searchQuery
                                ? 'No audit logs match your search criteria.'
                                : 'No audit logs have been recorded yet.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
