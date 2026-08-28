import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Pencil,
  Trash2,
  ClipboardCheck,
  Plus,
  X,
  AlertCircle,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { fetchStudents, fetchCompanies, fetchSupervisors, fetchPlacements, createPlacement, updatePlacement, deletePlacement } from '../services/api';
import EvaluationFormModal from './EvaluationForm';
import ExportButton from './ExportButton';
import CustomSelect from './CustomSelect';
import { TableCard } from './ui/TableCard';
import { FilterTabs } from './ui/FilterTabs';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';
import { KpiCard } from './ui/KpiCard';

const ITEMS_PER_PAGE = 10;

const initialForm = {
  studentId: '',
  companyId: '',
  universitySupervisor: '',
  companySupervisor: '',
  status: 'PENDING',
};

const statusStyles = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border border-blue-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const STATUS_TABS = ['All', 'PENDING', 'ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export default function PlacementMatching() {
  const [placements, setPlacements] = useState([]);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [universitySupervisors, setUniversitySupervisors] = useState([]);
  const [companySupervisors, setCompanySupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [evaluationPlacement, setEvaluationPlacement] = useState(null);
  const [detailPlacement, setDetailPlacement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState('All');

  useEffect(() => {
    refreshPlacements();
    loadStudents();
    loadCompanies();
    loadSupervisors();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeStatus]);

  const filteredPlacements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return placements.filter((p) => {
      const matchStatus = activeStatus === 'All' || p.status === activeStatus;
      if (!matchStatus) return false;
      if (!q) return true;
      const student = students.find((s) => String(s.id) === String(p.studentId));
      const company = companies.find((c) => String(c.id) === String(p.companyId));
      const studentName = student ? (student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()) : '';
      const companyName = company ? company.name : '';
      return (
        studentName.toLowerCase().includes(q) ||
        companyName.toLowerCase().includes(q) ||
        (p.universitySupervisor || '').toLowerCase().includes(q) ||
        (p.companySupervisor || '').toLowerCase().includes(q) ||
        (p.status || '').toLowerCase().includes(q)
      );
    });
  }, [placements, students, companies, searchQuery, activeStatus]);

  const totalPages = Math.ceil(filteredPlacements.length / ITEMS_PER_PAGE);

  const paginatedPlacements = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlacements.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPlacements, currentPage]);

  const statusTabs = useMemo(
    () =>
      STATUS_TABS.map((s) => ({
        id: s,
        label: s === 'All' ? 'All Placements' : s,
        count: s === 'All' ? placements.length : placements.filter((p) => p.status === s).length,
      })),
    [placements]
  );

  const activeCount = placements.filter((p) => p.status === 'ACTIVE').length;
  const completedCount = placements.filter((p) => p.status === 'COMPLETED').length;
  const pendingCount = placements.filter((p) => p.status === 'PENDING').length;

  async function refreshPlacements() {
    setLoading(true);
    setError('');
    try {
      setPlacements(await fetchPlacements());
    } catch (err) {
      setPlacements([]);
      if (err.status !== 404) {
        setError(err.message || 'Unable to load placements.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      setStudents(await fetchStudents());
    } catch (err) {
      console.error('Failed to load students', err);
    }
  }

  async function loadCompanies() {
    try {
      setCompanies(await fetchCompanies());
    } catch (err) {
      console.error('Failed to load companies', err);
    }
  }

  async function loadSupervisors() {
    try {
      const uni = await fetchSupervisors('UNIVERSITY');
      setUniversitySupervisors(Array.isArray(uni) ? uni : []);
    } catch (err) {
      console.error('Failed to load university supervisors', err);
      setUniversitySupervisors([]);
    }

    try {
      const comp = await fetchSupervisors('COMPANY');
      setCompanySupervisors(Array.isArray(comp) ? comp : []);
    } catch (err) {
      console.error('Failed to load company supervisors', err);
      setCompanySupervisors([]);
    }
  }

  function openModal(existingPlacement) {
    setEditingId(existingPlacement?.id ?? null);
    setForm(existingPlacement ? {
      studentId: String(existingPlacement.studentId ?? ''),
      companyId: String(existingPlacement.companyId ?? ''),
      universitySupervisor: existingPlacement.universitySupervisor || '',
      companySupervisor: existingPlacement.companySupervisor || '',
      status: existingPlacement.status || 'PENDING',
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

    if (!form.studentId || !form.companyId) {
      setError('Student and Company are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        studentId: Number(form.studentId),
        companyId: Number(form.companyId),
        universitySupervisor: form.universitySupervisor || '',
        companySupervisor: form.companySupervisor || '',
        status: form.status,
      };

      if (editingId) {
        await updatePlacement(editingId, payload);
      } else {
        await createPlacement(payload);
      }

      await refreshPlacements();
      closeModal();
    } catch (err) {
      setError(err.message || 'Unable to save placement.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this placement?')) return;
    setLoading(true);
    try {
      await deletePlacement(id);
      await refreshPlacements();
    } catch (err) {
      setError(err.message || 'Unable to delete placement.');
    } finally {
      setLoading(false);
    }
  }

  function getStudentName(studentId) {
    const student = students.find((s) => String(s.id) === String(studentId));
    return student ? (student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()) : 'Unknown';
  }

  function getCompanyName(companyId) {
    const company = companies.find((c) => String(c.id) === String(companyId));
    return company ? company.name : 'Unknown';
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Error Banner */}
      {error && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm">
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
          <span>Loading placements...</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Active Placements"
          value={activeCount}
          period={`${completedCount} completed`}
          icon="CheckCircle2"
          badgeColor="emerald"
        />
        <KpiCard
          title="Pending Assignments"
          value={pendingCount}
          period="awaiting supervisor"
          icon="FileText"
          badgeColor="rose"
        />
        <KpiCard
          title="Total Placements"
          value={placements.length}
          period="this programme"
          icon="Users"
          badgeColor="teal"
        />
      </div>

      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:flex-none">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search placements..."
            className="w-full sm:w-52 bg-white text-slate-900 text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
            aria-label="Search placements"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <ExportButton data={placements} fileName="placements" exportUrl="/api/placements/export/csv" />
          <button
            type="button"
            onClick={() => openModal(null)}
            className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Supervisors</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <TableCard
        title="Placements"
        subtitle="Assign supervisors and track placement lifecycle"
        icon={ArrowRightLeft}
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-slate-900/40">
          <FilterTabs tabs={statusTabs} activeTab={activeStatus} onChange={setActiveStatus} />
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search placements..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Company</th>
                <th className="px-4 py-3.5">University Supervisor</th>
                <th className="px-4 py-3.5">Company Supervisor</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
              {paginatedPlacements.length > 0 ? paginatedPlacements.map((placement) => (
                <tr key={placement.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">
                          {getStudentName(placement.studentId)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block truncate">ID: {placement.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{getCompanyName(placement.companyId)}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{placement.universitySupervisor || 'Unassigned'}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{placement.companySupervisor || 'Unassigned'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[placement.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {placement.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setDetailPlacement(placement)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/60 transition-colors border border-gray-200/60 dark:border-slate-700"
                        title="View details"
                        aria-label="View placement details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal(placement)}
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors"
                        aria-label="Edit placement"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEvaluation(placement)}
                        className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/60 dark:border-teal-800/60 transition-colors"
                        aria-label="Evaluate placement"
                        title="Evaluate"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(placement.id)}
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 transition-colors"
                        aria-label="Delete placement"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      title="No placements found"
                      description={`No placements found${activeStatus !== 'All' ? ` with status "${activeStatus}"` : ''}${searchQuery ? ` matching "${searchQuery}"` : ''}.`}
                      actionLabel={activeStatus !== 'All' || searchQuery ? 'Clear Filter' : 'Assign Supervisors'}
                      onAction={() => {
                        if (activeStatus !== 'All' || searchQuery) {
                          setActiveStatus('All');
                          setSearchQuery('');
                        } else {
                          openModal(null);
                        }
                      }}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPlacements.length >= ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPlacements.length)} of {filteredPlacements.length} placements
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 5) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce((acc, page, i, arr) => {
                  if (i > 0 && page - arr[i - 1] > 1) acc.push('...');
                  acc.push(page);
                  return acc;
                }, [])
                .map((page, i) =>
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400">...</span>
                  ) : (
                    <button
                      type="button"
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </TableCard>

      {/* Detail Modal */}
      <Modal
        isOpen={Boolean(detailPlacement)}
        onClose={() => setDetailPlacement(null)}
        title="Placement Details"
        subtitle={`Placement #${detailPlacement?.id}`}
        maxWidth="max-w-lg"
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={() => setDetailPlacement(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              Close
            </button>
          </div>
        }
      >
        {detailPlacement && (
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Student</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 block">{getStudentName(detailPlacement.studentId)}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Company</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 block">{getCompanyName(detailPlacement.companyId)}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">University Supervisor</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 block">{detailPlacement.universitySupervisor || 'Unassigned'}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Company Supervisor</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 block">{detailPlacement.companySupervisor || 'Unassigned'}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/50 dark:border-teal-800/40 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Current Status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[detailPlacement.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {detailPlacement.status}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit / Create Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editingId ? 'Edit Placement' : 'Assign Supervisors'}
          subtitle="Assign a student to a host company and its supervisors"
          maxWidth="max-w-lg"
          footer={
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-95 text-white shadow-xs disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Placement'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="pl-student" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student <span className="text-rose-600">*</span>
              </label>
              <CustomSelect
                id="pl-student"
                value={form.studentId}
                onChange={(value) => setForm({ ...form, studentId: value })}
                options={students.map((student) => ({
                  value: String(student.id),
                  label: `${student.fullName || ''} (${student.studentNumber || ''})`,
                }))}
                placeholder="Select student"
                required
              />
            </div>
            <div>
              <label htmlFor="pl-company" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company <span className="text-rose-600">*</span>
              </label>
              <CustomSelect
                id="pl-company"
                value={form.companyId}
                onChange={(value) => setForm({ ...form, companyId: value })}
                options={companies.map((company) => ({
                  value: String(company.id),
                  label: company.name,
                }))}
                placeholder="Select company"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pl-uni-sup" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  University Supervisor
                </label>
                <CustomSelect
                  id="pl-uni-sup"
                  value={form.universitySupervisor}
                  onChange={(value) => setForm({ ...form, universitySupervisor: value })}
                  options={universitySupervisors.map((supervisor) => ({
                    value: supervisor.username,
                    label: supervisor.username,
                  }))}
                  placeholder="Unassigned"
                />
              </div>
              <div>
                <label htmlFor="pl-co-sup" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Supervisor
                </label>
                <CustomSelect
                  id="pl-co-sup"
                  value={form.companySupervisor}
                  onChange={(value) => setForm({ ...form, companySupervisor: value })}
                  options={companySupervisors.map((supervisor) => ({
                    value: supervisor.username,
                    label: supervisor.username,
                  }))}
                  placeholder="Select company supervisor"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pl-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <CustomSelect
                id="pl-status"
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'ASSIGNED', label: 'Assigned' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Evaluation Modal */}
      {evaluationPlacement && (
        <EvaluationFormModal
          placement={evaluationPlacement}
          onClose={() => setEvaluationPlacement(null)}
          onSaved={refreshPlacements}
        />
      )}
    </div>
  );

  function openEvaluation(placement) {
    setEvaluationPlacement(placement);
  }
}
