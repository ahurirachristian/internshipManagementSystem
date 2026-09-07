import { useEffect, useState } from 'react';
import { Search, Building2 } from 'lucide-react';
import { fetchSchools } from '../../services/api';

export default function AcademicUnitsManagement() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSchools();
      setUnits(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? units.filter((u) =>
        (u.schoolName || '').toLowerCase().includes(q) ||
        (u.schoolCode || '').toLowerCase().includes(q)
      )
    : units;

  const unitById = {};
  units.forEach((u) => { unitById[u.schoolId] = u; });

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
            placeholder="Search academic units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} unit(s)</span>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Parent Unit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No academic units found.</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.schoolId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-mono text-xs">{u.schoolId}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.schoolCode || '—'}</td>
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {u.schoolName}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.type || '—'}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {u.parentSchoolId ? (unitById[u.parentSchoolId]?.schoolName || u.parentSchoolId) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
