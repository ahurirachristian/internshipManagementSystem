import { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { fetchProgrammes, fetchDepartments } from '../../services/api';

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [progs, depts] = await Promise.all([fetchProgrammes(), fetchDepartments()]);
      setCourses(Array.isArray(progs) ? progs : []);
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const deptById = useMemo(() => {
    const map = {};
    departments.forEach((d) => { map[d.departmentId] = d; });
    return map;
  }, [departments]);

  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? courses.filter((p) =>
        (p.programmeName || '').toLowerCase().includes(q) ||
        (p.programmeCode || '').toLowerCase().includes(q)
      )
    : courses;

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
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} course(s)</span>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Course Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Department</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Level</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Duration</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No courses found.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.programmeId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-mono text-xs">{p.programmeId}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.programmeCode || '—'}</td>
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  {p.programmeName}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                  {p.departmentId ? (deptById[p.departmentId]?.departmentName || p.departmentId) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{p.programmeLevel || '—'}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                  {p.durationYears ? `${p.durationYears} yr(s)` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
