import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchSupervisors } from '../../services/api';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSupervisors('UNIVERSITY');
      setStaff(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? staff.filter((s) =>
        (s.username || s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.departmentName || s.department || '').toLowerCase().includes(q)
      )
    : staff;

  const displayName = (s) => s.username || s.name || s.fullName || '—';
  const displayEmail = (s) => s.email || '—';
  const displayRole = (s) => s.role || s.userRole || 'Supervisor';
  const displayDept = (s) => s.departmentName || s.department || s.schoolName || '—';

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 dark:bg-rose-950/40 dark:border-rose-800 rounded-lg text-sm text-red-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} staff member(s)</span>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Department</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No staff found.</td></tr>
            ) : filtered.map((s) => (
              <tr key={s.id ?? s.userId ?? s.username ?? displayName(s)} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-mono text-xs">{s.id ?? s.userId ?? '—'}</td>
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-teal-800 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {String(displayName(s)).slice(0, 2).toUpperCase()}
                  </span>
                  {displayName(s)}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{displayRole(s)}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{displayEmail(s)}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{displayDept(s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
