import { useEffect, useMemo, useState } from 'react';
import { Search, Layers, BookOpen, Pencil, Trash2, Plus } from 'lucide-react';
import {
  fetchProgrammes,
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../../services/api';
import { CONTROL_CLASS } from '../ui/formControls';

/**
 * P8: course units per programme — now backed by the real /api/courses
 * endpoints (previously faked from the schools list).
 */
export default function UnitCoursesManagement() {
  const [programmes, setProgrammes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ programmeId: '', courseCode: '', courseName: '', yearOfStudy: '' });
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [progs, courseList] = await Promise.all([fetchProgrammes(), fetchCourses()]);
      setProgrammes(Array.isArray(progs) ? progs : []);
      setCourses(Array.isArray(courseList) ? courseList : []);
    } catch (e) {
      setError(e.message || 'Unable to load unit courses.');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const programmeById = useMemo(() => {
    const map = {};
    programmes.forEach((p) => { map[p.programmeId] = p; });
    return map;
  }, [programmes]);

  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? courses.filter((c) =>
        (c.courseName || '').toLowerCase().includes(q) ||
        (c.courseCode || '').toLowerCase().includes(q) ||
        (programmeById[c.programmeId]?.programmeName || '').toLowerCase().includes(q)
      )
    : courses;

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const key = c.programmeId ?? 'Unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return Object.entries(map).map(([programmeId, list]) => ({
      programmeId,
      programmeName: programmeById[programmeId]?.programmeName || `Programme ${programmeId}`,
      courses: list,
    }));
  }, [filtered, programmeById]);

  function resetForm() {
    setForm({ programmeId: '', courseCode: '', courseName: '', yearOfStudy: '' });
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const payload = {
      programmeId: Number(form.programmeId),
      courseCode: form.courseCode.trim(),
      courseName: form.courseName.trim(),
      yearOfStudy: form.yearOfStudy === '' ? null : Number(form.yearOfStudy),
    };
    try {
      if (editingId) {
        await updateCourse(editingId, payload);
        setNotice('Course updated.');
      } else {
        await createCourse(payload);
        setNotice('Course added.');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e.message || 'Unable to save the course.');
    }
  }

  async function handleDelete(course) {
    if (!window.confirm(`Delete ${course.courseCode}?`)) return;
    setError('');
    try {
      await deleteCourse(course.id);
      load();
    } catch (e) {
      setError(e.message || 'Unable to delete the course.');
    }
  }

  const inputClass = 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20';

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 dark:bg-rose-950/40 dark:border-rose-800 rounded-lg text-sm text-red-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-teal-700" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {editingId ? 'Edit course unit' : 'Add a course unit'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <select
            className={CONTROL_CLASS}
            value={form.programmeId}
            onChange={(e) => setForm({ ...form, programmeId: e.target.value })}
            required
          >
            <option value="">Select programme</option>
            {programmes.map((p) => (
              <option key={p.programmeId} value={p.programmeId}>{p.programmeName}</option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="Course code"
            value={form.courseCode}
            onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Course name"
            value={form.courseName}
            onChange={(e) => setForm({ ...form, courseName: e.target.value })}
            required
          />
          <select
            className={CONTROL_CLASS}
            value={form.yearOfStudy}
            onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
          >
            <option value="">All years</option>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold">
              {editingId ? 'Save changes' : 'Add course'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

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
            <div key={group.programmeId} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{group.programmeName}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">{group.courses.length} course(s)</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {group.courses.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs w-28">{c.courseCode}</td>
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        {c.courseName}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {c.yearOfStudy ? `Year ${c.yearOfStudy}` : 'All years'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id);
                            setForm({
                              programmeId: String(c.programmeId),
                              courseCode: c.courseCode,
                              courseName: c.courseName,
                              yearOfStudy: c.yearOfStudy == null ? '' : String(c.yearOfStudy),
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
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
