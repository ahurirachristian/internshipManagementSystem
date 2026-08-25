import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, X, AlertCircle, Search } from 'lucide-react';
import {
  fetchSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  fetchAcademicUnits,
} from '../../services/api';
import ExportButton from '../ExportButton';
import Pagination from '../Pagination';

const ITEMS_PER_PAGE = 10;
const TYPES = ['COLLEGE', 'SCHOOL', 'DIRECTORATE'];

const initialForm = {
  schoolId: '',
  schoolCode: '',
  schoolName: '',
  type: '',
  parentSchoolId: '',
};

export default function SchoolsManagement() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const schoolById = useMemo(() => {
    const map = {};
    schools.forEach((s) => { map[s.schoolId] = s; });
    return map;
  }, [schools]);

  const filteredSchools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return schools;
    return schools.filter((s) =>
      (s.schoolName || '').toLowerCase().includes(q) ||
      (s.schoolCode || '').toLowerCase().includes(q) ||
      (s.type || '').toLowerCase().includes(q)
    );
  }, [schools, searchQuery]);

  const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);

  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSchools.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSchools, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  async function load() {
    setLoading(true);
    try {
      setSchools(await fetchSchools());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(initialForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(school) {
    setForm({
      schoolId: school.schoolId,
      schoolCode: school.schoolCode || '',
      schoolName: school.schoolName || '',
      type: school.type || '',
      parentSchoolId: school.parentSchoolId || '',
    });
    setEditingId(school.schoolId);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        schoolId: Number(form.schoolId),
        parentSchoolId: form.parentSchoolId ? Number(form.parentSchoolId) : null,
      };
      if (editingId) {
        await updateSchool(editingId, payload);
      } else {
        await createSchool(payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this school? Children will be unlinked.')) return;
    try {
      await deleteSchool(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function handleExport() {
    const header = 'SchoolID,SchoolCode,SchoolName,ParentSchoolID,Type';
    const rows = filteredSchools.map((s) =>
      [s.schoolId, s.schoolCode || '', s.schoolName, s.parentSchoolId || '', s.type || ''].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schools.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
        <ExportButton onExport={handleExport} />
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" /> Add School
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-600">ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Parent</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
            ) : paginatedSchools.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No schools found.</td></tr>
            ) : paginatedSchools.map((s) => (
              <tr key={s.schoolId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{s.schoolId}</td>
                <td className="px-4 py-3">{s.schoolCode || '—'}</td>
                <td className="px-4 py-3 font-medium">{s.schoolName}</td>
                <td className="px-4 py-3">
                  {s.type && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{s.type}</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{s.parentSchoolId || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(s)} className="p-1 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.schoolId)} className="p-1 text-slate-500 hover:text-red-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit School' : 'Create School'}</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">School ID *</label>
                <input type="number" required value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">School Name *</label>
                <input required value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                  <input value={form.schoolCode} onChange={(e) => setForm({ ...form, schoolCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg">
                    <option value="">—</option>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent School ID</label>
                <input type="number" value={form.parentSchoolId} onChange={(e) => setForm({ ...form, parentSchoolId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
