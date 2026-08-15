import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../DashboardLayout';

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

  function renderTable() {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><i className="fa-solid fa-list-check"></i> Audit Logs</span>
          <span className="card-hint">System activity and change history</span>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td className="u-name">{formatDate(log.timestamp || log.createdAt)}</td>
                    <td>{log.username || log.user?.username || '—'}</td>
                    <td>{log.role || log.user?.role || '—'}</td>
                    <td>
                      <span className={`badge ${getActionBadge(log.action)}`}>
                        <span className="dot"></span>
                        {log.action || '—'}
                      </span>
                    </td>
                    <td>{log.targetEntity || '—'}</td>
                    <td>{log.details || log.description || '—'}</td>
                    <td>{log.ipAddress || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <div className="empty-icon">&#128221;</div>
                      <h3>{searchQuery ? 'No matching audit logs' : 'No audit logs'}</h3>
                      <p>
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
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Audit Logs"
      subtitle="Review system activity, changes, and access history"
      searchable={false}
    >
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading audit logs...</div>}

      {!loading && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-filter"></i> Filters</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ flex: '1 1 240px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#4b5563',
                  }}
                >
                  Search
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Username, action, target, details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#4b5563',
                  }}
                >
                  Action
                </label>
                <select
                  className="form-control"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  {ACTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#4b5563',
                  }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#4b5563',
                  }}
                >
                  End Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {renderTable()}
        </>
      )}
    </DashboardLayout>
  );
}

function getActionBadge(action) {
  const map = {
    CREATE: 'badge-success',
    UPDATE: 'badge-info',
    DELETE: 'badge-danger',
    LOGIN: 'badge-success',
    LOGOUT: 'badge-warning',
    VIEW: 'badge-info',
    EXPORT: 'badge-info',
  };
  return map[(action || '').toUpperCase()] || 'badge-info';
}

