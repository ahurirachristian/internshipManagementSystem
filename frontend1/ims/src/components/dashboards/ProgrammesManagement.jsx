import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, X, AlertCircle, Search } from 'lucide-react';
import {
  fetchProgrammes,
  createProgramme,
  updateProgramme,
  deleteProgramme,
  fetchSchools,
  fetchDepartments,
} from '../../services/api';
import ExportButton from '../ExportButton';
import Pagination from '../Pagination';

const ITEMS_PER_PAGE = 10;
const LEVELS = ['Certificate', 'Diploma', 'Bachelors', 'Masters', 'PhD'];

const initialForm = {
  programmeId: '',
  programmeCode: '',
  programmeName: '',
  programmeLevel: '',
  durationYears: '',
  schoolId: '',
  departmentId: '',
};

export default function ProgrammesManagement() {
  const [programmes, setProgrammes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
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

  const deptById = useMemo(() => {
    const map = {};
    departments.forEach((d) => { map[d.departmentId] = d; });
    return map;
  }, [departments]);

  const filteredProgrammes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return programmes;
    return programmes.filter((p) =>
      (p.programmeName || '').toLowerCase().includes(q) ||
      (p.programmeCode || '').toLowerCase().includes(q)
    );
  }, [programmes, searchQuery]);

  const totalPages = Math.ceil(filteredProgrammes.length / ITEMS_PER_PAGE);
  const paginatedProgrammes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProgrammes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProgrammes, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  async function load() {
    setLoading(true);
    try {
      const [progs, schs, depts] = await Promise.all([
        fetchProgrammes(), fetchSchools(), fetchDepartments(),
      ]);
      setProgrammes(progs);
      setSchools(schs);
      setDepartments(depts);
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

  function openEdit(prog) {
    setForm({
      programmeId: prog.programmeId,
      programmeCode: prog.programmeCode || '',
      programmeName: prog.programmeName || '',
      programmeLevel: prog.programmeLevel || '',
      durationYears: prog.durationYears || '',
      schoolId: prog.schoolId || '',
      departmentId: prog.departmentId || '',
    });
    setEditingId(prog.programmeId);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        programmeId: Number(form.programmeId),
        schoolId: Number(form.schoolId),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        durationYears: Number(form.durationYears),
      };
      if (editingId) {
        await updateProgramme(editingId, payload);
      } else {
        await createProgramme(payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this programme?')) return;
    try {
      await deleteProgramme(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function handleExport() {
    const header = 'ProgrammeID,SchoolID,DepartmentID,ProgrammeCode,ProgrammeName,Level,DurationYears';
    const rows = filteredProgrammes.map((p) =>
      [p.programmeId, p.schoolId, p.departmentId || '', p.programmeCode, p.programmeName, p.programmeLevel, p.durationYears].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programmes.csv';
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
            placeholder="Search programmes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
        <ExportButton onExport={handleExport} />
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" /> Add Programme
        </button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Level</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">School</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Department</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : paginatedProgrammes.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No programmes found.</td></tr>
            ) : paginatedProgrammes.map((p) => (
              <tr key={p.programmeId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800/40">
                <td className="px-4 py-3 font-mono text-xs">{p.programmeId}</td>
                <td className="px-4 py-3">{p.programmeCode}</td>
                <td className="px-4 py-3 font-medium">{p.programmeName}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">{p.programmeLevel}</span>
                </td>
                <td className="px-4 py-3">{p.durationYears}yr</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{schoolById[p.schoolId]?.schoolName || p.schoolId}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{deptById[p.departmentId]?.departmentName || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-teal-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.programmeId)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit Programme' : 'Create Programme'}</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Programme ID *</label>
                <input type="number" required value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value })}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code *</label>
                  <input required value={form.programmeCode} onChange={(e) => setForm({ ...form, programmeCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Level *</label>
                  <select required value={form.programmeLevel} onChange={(e) => setForm({ ...form, programmeLevel: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg">
                    <option value="">Select...</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input required value={form.programmeName} onChange={(e) => setForm({ ...form, programmeName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (years) *</label>
                <input type="number" min="1" required value={form.durationYears} onChange={(e) => setForm({ ...form, durationYears: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">School *</label>
                <select required value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg">
                  <option value="">Select school...</option>
                  {schools.map((s) => <option key={s.schoolId} value={s.schoolId}>{s.schoolName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg">
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                </select>
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
