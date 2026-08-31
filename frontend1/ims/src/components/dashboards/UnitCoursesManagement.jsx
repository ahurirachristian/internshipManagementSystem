import { useEffect, useMemo, useState } from 'react';
import { Search, Layers, BookOpen } from 'lucide-react';
import { fetchProgrammes, fetchSchools } from '../../services/api';

export default function UnitCoursesManagement() {
  const [programmes, setProgrammes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [progs, schs] = await Promise.all([fetchProgrammes(), fetchSchools()]);
      setProgrammes(Array.isArray(progs) ? progs : []);
      setUnits(Array.isArray(schs) ? schs : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const unitById = useMemo(() => {
    const map = {};
    units.forEach((u) => { map[u.schoolId] = u; });
    return map;
  }, [units]);

  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? programmes.filter((p) =>
        (p.programmeName || '').toLowerCase().includes(q) ||
        (p.programmeCode || '').toLowerCase().includes(q)
      )
    : programmes;

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      const key = p.schoolId ?? 'Unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.entries(map).map(([schoolId, courses]) => ({
      schoolId,
      unitName: unitById[schoolId]?.schoolName || (schoolId !== 'Unassigned' ? `Unit ${schoolId}` : 'Unassigned'),
      courses,
    }));
  }, [filtered, unitById]);

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
            placeholder="Search unit courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} course(s)</span>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Loading...
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          No unit courses found.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.schoolId} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{group.unitName}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">{group.courses.length} course(s)</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {group.courses.map((p) => (
                    <tr key={p.programmeId} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs w-16">{p.programmeId}</td>
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        {p.programmeName}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{p.programmeCode || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{p.programmeLevel || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
