import { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  BookOpen,
  X,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import {
  fetchUniversityCourses,
  createUniversityCourse,
  updateUniversityCourse,
  deleteUniversityCourse,
} from '../services/api';
import ExportButton from './ExportButton';
import Pagination from './Pagination';

const ITEMS_PER_PAGE = 10;

const COURSE_LEVELS = [
  'Certificate',
  'Diploma',
  'Bachelors',
  'Masters',
  'PhD',
  'PGD',
  'Short Course',
];

const initialForm = {
  courseName: '',
  duration: '',
  level: '',
};

export default function CoursesManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return courses.filter((course) => {
      if (levelFilter && course.level !== levelFilter) return false;
      if (!q) return true;
      return (
        (course.courseName || '').toLowerCase().includes(q) ||
        (course.duration || '').toLowerCase().includes(q) ||
        (course.level || '').toLowerCase().includes(q)
      );
    });
  }, [courses, searchQuery, levelFilter]);

  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);

  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, levelFilter]);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const coursesData = await fetchUniversityCourses();
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (err) {
      setCourses([]);
      setError(err.message || 'Unable to load courses.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(existingCourse) {
    setEditingId(existingCourse?.courseId ?? null);
    setForm(existingCourse ? {
      courseName: existingCourse.courseName || '',
      duration: existingCourse.duration || '',
      level: existingCourse.level || '',
    } : initialForm);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.courseName.trim()) {
      setError('Course name is required.');
      return;
    }
    if (!form.duration.trim()) {
      setError('Duration is required.');
      return;
    }
    if (form.level && !COURSE_LEVELS.includes(form.level)) {
      setError('Please select a valid course level.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        courseName: form.courseName.trim(),
        duration: form.duration.trim(),
        level: form.level || null,
      };

      if (editingId) {
        await updateUniversityCourse(editingId, payload);
      } else {
        await createUniversityCourse(payload);
      }

      closeModal();
      await refresh();
    } catch (err) {
      setError(err.message || 'Unable to save course.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(course) {
    if (!window.confirm(`Delete "${course.courseName}"? Unit links to this course will also be removed.`)) return;
    setLoading(true);
    setError('');
    try {
      await deleteUniversityCourse(course.courseId);
      await refresh();
    } catch (err) {
      setError(err.message || err.payload?.error || 'Unable to delete course.');
    } finally {
      setLoading(false);
    }
  }

  const selectClass = "w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-700/70 uppercase tracking-wider mb-1.5">
            <span>Settings</span>
            <span className="text-slate-400">/</span>
            <span>Courses</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="w-full sm:w-52 bg-white text-slate-900 text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
              aria-label="Search courses"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
            aria-label="Filter by level"
          >
            <option value="">All Levels</option>
            {COURSE_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <div className="flex items-center gap-2.5">
            <ExportButton data={courses} fileName="courses" exportUrl="/api/university/courses/export/csv" />
            <button
              type="button"
              onClick={() => openModal(null)}
              className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Course</span>
            </button>
          </div>
        </div>
      </div>

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
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading courses...</span>
        </div>
      )}

      {/* Table */}
      <section id="courses-table-container" aria-labelledby="courses-table-title" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '720px' }} aria-label="Courses list">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">ID</th>
                <th scope="col" className="py-3.5 px-3">Course Name</th>
                <th scope="col" className="py-3.5 px-3">Level</th>
                <th scope="col" className="py-3.5 px-3">Duration</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedCourses.length > 0 ? paginatedCourses.map((course) => (
                <tr key={course.courseId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 pl-5 text-xs font-medium text-slate-500">{course.courseId}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900">{course.courseName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    {course.level ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        {course.level}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{course.duration}</td>
                  <td className="py-3.5 px-3 pr-5 text-right">
                    <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                      <li>
                        <button
                          type="button"
                          onClick={() => openModal(course)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                          aria-label={`Edit ${course.courseName}`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => handleDelete(course)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                          aria-label={`Delete ${course.courseName}`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    </ul>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery || levelFilter ? <Search className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800">
                        {searchQuery || levelFilter ? 'No results found' : 'No courses found'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {searchQuery || levelFilter ? (
                          <>No courses match your search criteria. Try different filters.</>
                        ) : (
                          <>Click &ldquo;Add Course&rdquo; to create the first course.</>
                        )}
                      </p>
                      {!searchQuery && !levelFilter && (
                        <button
                          type="button"
                          onClick={() => openModal(null)}
                          className="px-3.5 py-2 bg-[#063b33] hover:bg-[#042823] text-white font-bold text-xs rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                        >
                          Add Course
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredCourses.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCourses.length)} of {filteredCourses.length} courses
            </span>
            <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} />
          </div>
        )}
      </section>

      {/* Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 id="course-modal-title" className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Course' : 'Add Course'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label htmlFor="cr-courseName" className={labelClass}>
                    Course Name <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="cr-courseName"
                    type="text"
                    value={form.courseName}
                    onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                    placeholder="e.g. Bachelor Of Science In Computer Science"
                    required
                    className={selectClass}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cr-duration" className={labelClass}>
                      Duration <span className="text-rose-600" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="cr-duration"
                      type="text"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="e.g. 3 Years"
                      required
                      className={selectClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-level" className={labelClass}>Level</label>
                    <select
                      id="cr-level"
                      value={form.level}
                      onChange={(e) => setForm({ ...form, level: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">Select Level</option>
                      {COURSE_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div />
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Course'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
