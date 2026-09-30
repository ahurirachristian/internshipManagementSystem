import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  fetchPlacements,
  fetchCompanies,
  fetchStudents,
  fetchUniversitySupervisorRows,
  approvePlacement,
  rejectPlacement,
} from '../../services/api';

/**
 * P7 (R9): university approval queue — OFFERED placements for the
 * supervisor's university, with supervisor assignment on approve.
 */
export default function UniversityPlacementsPage() {
  const { user } = useAuth();
  const [placements, setPlacements] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [students, setStudents] = useState([]);
  const [supervisorRows, setSupervisorRows] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      fetchPlacements(),
      fetchCompanies(),
      fetchStudents(),
      fetchUniversitySupervisorRows(),
    ])
      .then(([placementData, companyData, studentData, supervisorData]) => {
        setPlacements(Array.isArray(placementData) ? placementData : []);
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setStudents(Array.isArray(studentData) ? studentData : []);
        setSupervisorRows(
          (Array.isArray(supervisorData) ? supervisorData : [])
            .filter((row) => String(row.universityId) === String(user?.universityId))
        );
      })
      .catch((err) => setError(err.message || 'Unable to load placements.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(placement) {
    const supervisorId = selectedSupervisor[placement.id];
    if (!supervisorId) {
      setError('Select a university supervisor first.');
      return;
    }
    setError('');
    setNotice('');
    try {
      await approvePlacement(placement.id, Number(supervisorId));
      setNotice('Offer approved — the student, company, and supervisor have been notified.');
      load();
    } catch (err) {
      setError(err.message || 'Unable to approve the offer.');
    }
  }

  async function handleReject(placement) {
    if (!window.confirm('Decline this placement offer?')) return;
    setError('');
    setNotice('');
    try {
      await rejectPlacement(placement.id);
      setNotice('Offer declined — the student and company have been notified.');
      load();
    } catch (err) {
      setError(err.message || 'Unable to decline the offer.');
    }
  }

  const companyName = (id) => companies.find((c) => String(c.id) === String(id))?.name || `Company #${id}`;
  const studentName = (id) => {
    const s = students.find((st) => String(st.id) === String(id));
    return s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.studentNumber : `Student #${id}`;
  };
  const offered = placements.filter((p) => p.status === 'OFFERED');

  return (
    <DashboardLayout title="Placement Approvals" subtitle="Review internship offers for your university" searchable={false}>
      <div className="space-y-5">
        {notice && <div className="alert alert-success show">{notice}</div>}
        {error && <div className="alert alert-error show">{error}</div>}

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pending offers</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Companies asked to place their students here. Assign a university supervisor to approve.
            </p>
          </div>
          {loading ? (
            <p className="p-5 text-xs text-slate-500">Loading offers...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Offered</th>
                    <th className="px-4 py-3">Assign supervisor</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {offered.map((placement) => (
                    <tr key={placement.id}>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">
                        {studentName(placement.studentId)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{companyName(placement.companyId)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Offered</td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs"
                          value={selectedSupervisor[placement.id] || ''}
                          onChange={(e) =>
                            setSelectedSupervisor({ ...selectedSupervisor, [placement.id]: e.target.value })
                          }
                        >
                          <option value="">Select supervisor</option>
                          {supervisorRows.map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-right space-x-1.5">
                        <button
                          type="button"
                          className="px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700"
                          onClick={() => handleApprove(placement)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600"
                          onClick={() => handleReject(placement)}
                        >
                          Decline
                        </button>
                      </td>
                    </tr>
                  ))}
                  {offered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No pending offers right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
