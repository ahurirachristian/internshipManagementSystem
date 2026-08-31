import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import CompanyEditModal from '../CompanyEditModal';
import StudentEditModal from '../StudentEditModal';
import CompanySupervisorModal from '../CompanySupervisorModal';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCompany,
  fetchStudentsByCompany,
  updateCompany,
  createStudent,
  updateStudent,
  deleteStudent,
  fetchIndustrialSupervisors,
  createIndustrialSupervisor,
  updateIndustrialSupervisor,
  deleteIndustrialSupervisor,
  fetchAllEvaluations,
} from '../../services/api';
import {
  Building2,
  Pencil,
  GraduationCap,
  AlertCircle,
  X,
  CheckCircle,
  Plus,
  Trash2,
  User,
  Users,
  ClipboardCheck,
  TrendingUp,
  Activity,
  Briefcase,
  Calendar,
  Star,
} from 'lucide-react';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [sidebarSection, setSidebarSection] = useState('overview');
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [interns, setInterns] = useState([]);
  const [internsLoading, setInternsLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (user.companyId == null) {
      setCompany(null);
      setCompanyLoading(false);
      return;
    }
    setCompanyLoading(true);
    setError('');
    let cancelled = false;
    fetchCompany(user.companyId)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load company profile.');
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.companyId, refresh]);

  useEffect(() => {
    if (user.companyId != null) {
      loadInterns();
    }
  }, [user.companyId]);

  useEffect(() => {
    if (interns.length > 0) {
      loadEvaluations();
      if (companies.length === 0) {
        loadCompanies();
      }
    } else {
      setEvaluations([]);
      setActivity([]);
    }
  }, [interns]);

  useEffect(() => {
    if (evaluations.length > 0 || interns.length === 0) {
      buildActivity();
    }
  }, [evaluations, staff]);

  async function loadInterns() {
    setInternsLoading(true);
    setError('');
    try {
      setInterns(await fetchStudentsByCompany(user.companyId));
    } catch (err) {
      setError(err.message || 'Unable to load interns.');
    } finally {
      setInternsLoading(false);
    }
  }

  async function loadEvaluations() {
    setEvaluationsLoading(true);
    setError('');
    try {
      const all = await fetchAllEvaluations();
      const studentIds = new Set(interns.map((i) => i.id));
      const companyEvals = (all || []).filter(
        (e) => studentIds.has(e.studentId) && e.supervisorType === 'COMPANY'
      );
      setEvaluations(companyEvals);
    } catch (err) {
      setError(err.message || 'Unable to load evaluations.');
    } finally {
      setEvaluationsLoading(false);
    }
  }

  async function loadCompanies() {
    setCompaniesLoading(true);
    setError('');
    try {
      const ids = new Set();
      if (user.companyId != null) ids.add(user.companyId);
      interns.forEach((i) => {
        if (i.internshipCompanyId != null) ids.add(i.internshipCompanyId);
      });
      const loaded = await Promise.all(
        [...ids].map((id) => fetchCompany(id).catch(() => null))
      );
      setCompanies(loaded.filter(Boolean));
    } catch (err) {
      setError(err.message || 'Unable to load companies.');
    } finally {
      setCompaniesLoading(false);
    }
  }

  function buildActivity() {
    const events = [];
    interns.forEach((intern) => {
      const name = `${intern.firstName} ${intern.lastName}`;
      if (intern.startDate) {
        events.push({ id: `start-${intern.id}`, type: 'start', title: `Internship started`, intern: name, date: intern.startDate });
      }
      if (intern.endDate) {
        events.push({ id: `end-${intern.id}`, type: 'end', title: `Internship ends`, intern: name, date: intern.endDate });
      }
      evalPerIntern(intern.id)?.forEach((ev) => {
        events.push({ id: `eval-${ev.id}`, type: 'eval', title: `Evaluation submitted`, intern: name, date: ev.createdAt, score: companyEvalAvg(ev) });
      });
    });
    staff.forEach((s) => {
      events.push({ id: `staff-${s.id}`, type: 'staff', title: s.isPrimary ? 'Primary supervisor on staff' : 'Staff member added', intern: s.fullName, date: s.createdAt });
    });
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivity(events.slice(0, 6));
  }

  function evalPerIntern(studentId) {
    return evaluations.filter((e) => e.studentId === studentId);
  }

  function companyEvalAvg(ev) {
    const scores = [ev.punctuality, ev.practicalWorkEthics, ev.attendance, ev.workplacePerformance].filter(
      (v) => typeof v === 'number'
    );
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  function internStatus(intern) {
    if (intern.internshipCompanyId == null) return 'Pending';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (intern.startDate && new Date(intern.startDate) > today) return 'Pending';
    if (intern.endDate && new Date(intern.endDate) < today) return 'Completed';
    return 'Active';
  }

  function supervisorName(supervisorId) {
    if (supervisorId == null) return null;
    const found = staff.find((s) => String(s.id) === String(supervisorId));
    return found ? found.fullName || found.name : null;
  }

  const filteredInterns = interns.filter((i) => statusFilter === 'all' || internStatus(i) === statusFilter);

  async function loadStaff() {
    setStaffLoading(true);
    setError('');
    try {
      const data = await fetchIndustrialSupervisors(user.companyId);
      setStaff(data);
    } catch (err) {
      setError(err.message || 'Unable to load company field supervisors.');
    } finally {
      setStaffLoading(false);
    }
  }

  async function handleCompanySave(payload) {
    const target = selectedCompany || company;
    await updateCompany(target.id, payload);
    setNotice('Company updated successfully.');
    setRefresh((value) => value + 1);
  }

  async function handleStudentSave(payload) {
    setError('');
    setNotice('');
    try {
      const payloadWithCompany = {
        ...payload,
        internshipCompanyId: user.companyId,
      };
      if (selectedStudent) {
        await updateStudent(selectedStudent.id, payloadWithCompany);
        setNotice('Student updated successfully.');
      } else {
        await createStudent(payloadWithCompany);
        setNotice('Student added successfully.');
      }
      await loadInterns();
    } catch (err) {
      setError(err.message || 'Failed to save student.');
      throw err;
    }
  }

  async function handleDeleteStudent(id) {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    setError('');
    setNotice('');
    try {
      await deleteStudent(id);
      setNotice('Student deleted successfully.');
      await loadInterns();
    } catch (err) {
      setError(err.message || 'Failed to delete student.');
    }
  }

  async function handleStaffSave(payload) {
    setError('');
    setNotice('');
    try {
      const data = selectedStaff
        ? await updateIndustrialSupervisor(selectedStaff.id, payload)
        : await createIndustrialSupervisor({ ...payload, companyId: user.companyId });
      if (data && data.loginUsername) {
        setNotice(`Field supervisor added. Login: ${data.loginUsername} (default password is their first name).`);
      } else {
        setNotice(selectedStaff ? 'Field supervisor updated successfully.' : 'Field supervisor added successfully.');
      }
      await loadStaff();
    } catch (err) {
      setError(err.message || 'Failed to save field supervisor.');
      throw err;
    }
  }

  async function handleDeleteStaff(id) {
    if (!window.confirm('Are you sure you want to delete this field supervisor?')) return;
    setError('');
    setNotice('');
    try {
      await deleteIndustrialSupervisor(id);
      setNotice('Field supervisor deleted successfully.');
      await loadStaff();
    } catch (err) {
      setError(err.message || 'Failed to delete field supervisor.');
    }
  }

  function renderCompanies() {
    if (user.companyId == null) {
      return (
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No companies linked</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">Your account is not linked to a company yet. Please contact an administrator.</p>
        </div>
      );
    }
    if (companiesLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium py-4">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading companies...</span>
        </div>
      );
    }

    return (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Companies</h3>
            <p className="text-[11px] text-slate-500">Companies allocated to your interns</p>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '720px' }} aria-label="Linked companies">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3 px-3 pl-5">Company</th>
                <th scope="col" className="py-3 px-3">Industry</th>
                <th scope="col" className="py-3 px-3">Size</th>
                <th scope="col" className="py-3 px-3">Location</th>
                <th scope="col" className="py-3 px-3">Contact</th>
                <th scope="col" className="py-3 px-3">Assigned Interns</th>
                <th scope="col" className="py-3 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {companies.length > 0 ? (
                companies.map((c) => {
                  const assignedInterns = interns.filter((i) => String(i.internshipCompanyId) === String(c.id));
                  return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">{c.name}</div>
                          {c.registrationNumber && (
                            <div className="text-[10px] text-slate-400">Reg. {c.registrationNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">{c.industry || '—'}</td>
                    <td className="py-3 px-3 text-xs text-slate-600">{c.size || '—'}</td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">{c.email || c.phone || '—'}</td>
                    <td className="py-3 px-3 text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {assignedInterns.length}
                      </span>
                    </td>
                    <td className="py-3 px-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany(c);
                          setEditOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-bold text-[#063b33] bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                        title="Edit Company"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center">
                      <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No companies found</h3>
                      <p className="text-xs text-slate-500 mt-1">No companies are linked to your interns yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderInterns() {
    if (user.companyId == null) {
      return (
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No company linked</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">Your account is not linked to a company, so no interns can be listed.</p>
        </div>
      );
    }
    if (internsLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium py-4">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading interns...</span>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" aria-label="Assigned interns">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
              <th scope="col" className="py-3 px-3 pl-4">Name</th>
              <th scope="col" className="py-3 px-3">Degree</th>
              <th scope="col" className="py-3 px-3">Field Supervisor</th>
              <th scope="col" className="py-3 px-3">Status</th>
              <th scope="col" className="py-3 px-3">Start</th>
              <th scope="col" className="py-3 px-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredInterns.length > 0 ? (
              filteredInterns.map((intern) => {
                const status = internStatus(intern);
                const supName = supervisorName(intern.indSupervisorId);
                const statusStyle =
                  status === 'Active'
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';
                return (
                <tr key={intern.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 pl-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{intern.firstName} {intern.lastName}</div>
                        <div className="text-[10px] text-slate-400">{intern.studentNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600">{intern.degreeProgram}</td>
                  <td className="py-3 px-3 text-xs">
                    {supName ? (
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {supName}
                      </span>
                    ) : (
                      <span className="text-slate-300">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}`}>
                      {status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600">
                    {intern.startDate ? new Date(intern.startDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-3 pr-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(intern);
                          setStudentModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                        title="Edit Student"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(intern.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No interns assigned</h3>
                    <p className="text-xs text-slate-500 mt-1">No interns have been placed at your company yet.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderStaff() {
    if (user.companyId == null) {
      return (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No company linked</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Your account is not linked to a company, so no staff can be listed.</p>
          </div>
        </section>
      );
    }
    if (staffLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading company staff...</span>
        </div>
      );
    }
    return (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Field Supervisors</h3>
              <p className="text-[11px] text-slate-500">Company staff who supervise interns and evaluate them</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedStaff(null);
              setStaffModalOpen(true);
            }}
            className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supervisor</span>
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '750px' }} aria-label="Field supervisors">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">Name</th>
                <th scope="col" className="py-3.5 px-3">Role / Title</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Contact</th>
                <th scope="col" className="py-3.5 px-3">Department</th>
                <th scope="col" className="py-3.5 px-3">Login</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {staff.length > 0 ? (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 pl-5">
                      <span className="font-bold text-slate-900">{s.fullName}</span>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{s.role || '—'}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{s.email || '—'}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{s.contact || '—'}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{s.department || '—'}</td>
                    <td className="py-3.5 px-3 text-xs">
                      {s.username ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {s.username}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 pr-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(s);
                            setStaffModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Staff"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(s.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <User className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">No field supervisors registered</h3>
                      <p className="text-xs text-slate-500 mt-1">Add field supervisors to your company so they can supervise and evaluate interns.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderStats() {
    const avg =
      evaluations.length > 0
        ? Math.round(
            evaluations.reduce((sum, e) => sum + (companyEvalAvg(e) || 0), 0) /
              evaluations.length
          )
        : 0;
    const cards = [
      {
        icon: <Users className="w-4 h-4" />,
        label: 'Total Interns',
        value: interns.length,
        bg: 'bg-blue-50 border-blue-200 text-blue-700',
      },
      {
        icon: <ClipboardCheck className="w-4 h-4" />,
        label: 'Evaluations',
        value: evaluations.length,
        bg: 'bg-teal-50 border-teal-200 text-teal-700',
      },
      {
        icon: <Star className="w-4 h-4" />,
        label: 'Avg. Score',
        value: evaluations.length ? `${avg}%` : '—',
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
      },
      {
        icon: <Briefcase className="w-4 h-4" />,
        label: 'Staff Members',
        value: staff.length,
        bg: 'bg-violet-50 border-violet-200 text-violet-700',
      },
    ];
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-3.5"
          >
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-none">{card.value}</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-1">{card.label}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderProgress() {
    if (internsLoading) {
      return <div className="text-sm text-slate-500 py-6">Loading intern progress...</div>;
    }
    if (!interns.length) {
      return (
        <div className="text-sm text-slate-500 py-6 text-center">No interns to track progress for.</div>
      );
    }
    return (
      <div className="space-y-3">
        {interns.map((intern) => {
          const evals = evalPerIntern(intern.id);
          const hasStart = Boolean(intern.startDate);
          const hasEval = evals.length > 0;
          const completed = [hasStart, hasEval].filter(Boolean).length;
          const pct = Math.round((completed / 2) * 100);
          const avg = evals.length ? companyEvalAvg(evals[0]) : null;
          return (
            <div
              key={intern.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{intern.firstName} {intern.lastName}</div>
                    <div className="text-[11px] text-slate-500">{intern.degreeProgram || 'Intern'}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-teal-700">{pct}%</div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-700 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className={`w-2 h-2 rounded-full ${hasStart ? 'bg-teal-600' : 'bg-slate-300'}`} />
                  Started {intern.startDate ? new Date(intern.startDate).toLocaleDateString() : '—'}
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className={`w-2 h-2 rounded-full ${hasEval ? 'bg-teal-600' : 'bg-slate-300'}`} />
                  {hasEval ? `Evaluated (${avg}%)` : 'Not yet evaluated'}
                </div>
                {intern.endDate && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-3 h-3" />
                    Ends {new Date(intern.endDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderEvaluations() {
    if (evaluationsLoading) {
      return <div className="text-sm text-slate-500 py-6">Loading evaluations...</div>;
    }
    if (!interns.length) {
      return <div className="text-sm text-slate-500 py-6 text-center">No interns to evaluate.</div>;
    }
    return (
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" style={{ minWidth: '650px' }} aria-label="Intern evaluations">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
              <th scope="col" className="py-3 px-3 pl-4">Intern</th>
              <th scope="col" className="py-3 px-3">Punctuality</th>
              <th scope="col" className="py-3 px-3">Work Ethics</th>
              <th scope="col" className="py-3 px-3">Attendance</th>
              <th scope="col" className="py-3 px-3">Performance</th>
              <th scope="col" className="py-3 px-3 pr-4 text-right">Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {interns.map((intern) => {
              const ev = evalPerIntern(intern.id)[0];
              const avg = ev ? companyEvalAvg(ev) : null;
              const cells = [
                ['Punctuality', ev?.punctuality],
                ['Work Ethics', ev?.practicalWorkEthics],
                ['Attendance', ev?.attendance],
                ['Performance', ev?.workplacePerformance],
              ];
              return (
                <tr key={intern.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 pl-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{intern.firstName} {intern.lastName}</div>
                        <div className="text-[10px] text-slate-400">{ev ? 'Evaluated' : 'Not evaluated'}</div>
                      </div>
                    </div>
                  </td>
                  {cells.map(([label, val]) => (
                    <td key={label} className="py-3 px-3 text-xs text-slate-600">
                      {typeof val === 'number' ? (
                        <span className={`font-semibold ${val >= 50 ? 'text-green-600' : 'text-rose-600'}`}>
                          {val}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  ))}
                  <td className="py-3 px-3 pr-4 text-right">
                    {avg != null ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {avg}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderActivity() {
    if (!activity.length) {
      return <div className="text-sm text-slate-500 py-6 text-center">No recent activity yet.</div>;
    }
    const typeStyles = {
      start: { icon: <Calendar className="w-4 h-4" />, bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
      eval: { icon: <ClipboardCheck className="w-4 h-4" />, bg: 'bg-blue-50 border-blue-200 text-blue-700' },
      staff: { icon: <User className="w-4 h-4" />, bg: 'bg-violet-50 border-violet-200 text-violet-700' },
      end: { icon: <Calendar className="w-4 h-4" />, bg: 'bg-amber-50 border-amber-200 text-amber-700' },
    };
    const formatDate = (d) => {
      const date = new Date(d);
      if (isNaN(date)) return '';
      return date.toLocaleDateString();
    };
    return (
      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
        <ul className="space-y-4">
          {activity.map((item) => {
            const style = typeStyles[item.type] || typeStyles.start;
            return (
              <li key={item.id} className="flex gap-3.5 relative">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 relative z-10 ${style.bg}`}>
                  {style.icon}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{item.title}</span>
                    <span className="text-[11px] text-slate-400">{formatDate(item.date)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.intern}</p>
                  {item.score != null && (
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      Score: {item.score}%
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Company Dashboard"
      subtitle="Welcome,"
      tabs={null}
      activeTab={null}
      onTabChange={null}
      sidebarCompany={company}
      sidebarInterns={interns}
      sidebarCompanyLoading={companyLoading}
      sidebarActiveSection={sidebarSection}
      onSidebarSectionChange={(section) => {
        setSidebarSection(section);
        if (section === 'profile' && companies.length === 0) {
          if (user.companyId != null && interns.length === 0) {
            loadInterns().then(() => loadCompanies());
          } else {
            loadCompanies();
          }
        }
        if (section === 'interns' && user.companyId != null && interns.length === 0) {
          loadInterns();
        }
        if (section === 'interns' && user.companyId != null && staff.length === 0) {
          loadStaff();
        }
        if (section === 'staff' && user.companyId != null && staff.length === 0) {
          loadStaff();
        }
        if (section === 'evaluations' && user.companyId != null && evaluations.length === 0) {
          loadEvaluations();
        }
      }}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Notice Banner */}
        {notice && (
          <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1 rounded" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

        {sidebarSection === 'profile' ? (
          renderCompanies()
        ) : sidebarSection === 'interns' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assigned Interns</h3>
                  <p className="text-[11px] text-slate-500">{interns.length} student{interns.length !== 1 ? 's' : ''} placed at your company</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentModalOpen(true);
                }}
                className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">Status:</span>
              {[
                { value: 'all', label: 'All' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Active', label: 'Active' },
                { value: 'Completed', label: 'Completed' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-[#063b33] text-white border-[#063b33]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {renderInterns()}
          </div>
        ) : sidebarSection === 'overview' ? (
          <div className="space-y-6">
            {renderStats()}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Placement Status</h3>
                  <p className="text-[11px] text-slate-500">Cohort breakdown by placement status</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Pending', 'Active', 'Completed'].map((status) => {
                  const count = interns.filter((i) => internStatus(i) === status).length;
                  const pct = interns.length ? Math.round((count / interns.length) * 100) : 0;
                  const color =
                    status === 'Active'
                      ? 'text-teal-700 bg-teal-50 border-teal-200'
                      : status === 'Completed'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200';
                  return (
                    <div key={status} className={`rounded-xl border p-4 ${color}`}>
                      <div className="text-2xl font-extrabold leading-none">{count}</div>
                      <div className="text-[11px] font-semibold mt-1">{status}</div>
                      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] mt-1 opacity-70">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Intern Progress</h3>
                    <p className="text-[11px] text-slate-500">Track your interns' progress</p>
                  </div>
                </div>
                {renderProgress()}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                    <p className="text-[11px] text-slate-500">Latest updates</p>
                  </div>
                </div>
                {renderActivity()}
              </div>
            </div>
          </div>
        ) : sidebarSection === 'evaluations' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Intern Evaluations</h3>
                  <p className="text-[11px] text-slate-500">Company supervisor scores for your interns</p>
                </div>
              </div>
            </div>
            {renderEvaluations()}
          </div>
        ) : (
          renderStaff()
        )}
      </div>

      {editOpen && selectedCompany && (
        <CompanyEditModal
          company={selectedCompany}
          title={`Edit Company - ${selectedCompany.name}`}
          onClose={() => {
            setEditOpen(false);
            setSelectedCompany(null);
          }}
          onSubmit={handleCompanySave}
        />
      )}

      {studentModalOpen && (
        <StudentEditModal
          student={selectedStudent}
          title={selectedStudent ? 'Edit Student' : 'Add Student'}
          onClose={() => {
            setStudentModalOpen(false);
            setSelectedStudent(null);
          }}
          onSubmit={handleStudentSave}
          companies={[company]}
          supervisors={[]}
          industrialSupervisors={staff}
        />
      )}

      {staffModalOpen && (
        <CompanySupervisorModal
          supervisor={selectedStaff}
          title={selectedStaff ? 'Edit Field Supervisor' : 'Add Field Supervisor'}
          onClose={() => {
            setStaffModalOpen(false);
            setSelectedStaff(null);
          }}
          onSubmit={handleStaffSave}
        />
      )}
    </DashboardLayout>
  );
}
