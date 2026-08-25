import { useEffect, useState } from 'react';
import { ClipboardCheck, Briefcase, GraduationCap, X } from 'lucide-react';
import { fetchEvaluationsByStudent, createEvaluation, updateEvaluation } from '../services/api';

const emptyCompanyForm = {
  punctuality: '',
  practicalWorkEthics: '',
  attendance: '',
  workplacePerformance: '',
};

const emptyUniversityForm = {
  logbookQuality: '',
  academicReport: '',
  presentation: '',
  overallGrade: '',
};

export default function EvaluationFormModal({ placement, onClose, onSaved }) {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [universityForm, setUniversityForm] = useState(emptyUniversityForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (placement?.studentId) {
      loadEvaluations(placement.studentId);
    }
  }, [placement]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function loadEvaluations(studentId) {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEvaluationsByStudent(studentId);
      setEvaluations(data || []);
      const companyEval = data?.find((e) => e.supervisorType === 'COMPANY');
      const universityEval = data?.find((e) => e.supervisorType === 'UNIVERSITY');
      if (companyEval) {
        setCompanyForm({
          punctuality: String(companyEval.punctuality ?? ''),
          practicalWorkEthics: String(companyEval.practicalWorkEthics ?? ''),
          attendance: String(companyEval.attendance ?? ''),
          workplacePerformance: String(companyEval.workplacePerformance ?? ''),
        });
      }
      if (universityEval) {
        setUniversityForm({
          logbookQuality: String(universityEval.logbookQuality ?? ''),
          academicReport: String(universityEval.academicReport ?? ''),
          presentation: String(universityEval.presentation ?? ''),
          overallGrade: String(universityEval.overallGrade ?? ''),
        });
      }
    } catch (err) {
      setError(err.message || 'Unable to load evaluations.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanySubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        studentId: placement.studentId,
        placementId: placement.id,
        supervisorType: 'COMPANY',
        supervisorUsername: placement.companySupervisor,
        punctuality: Number(companyForm.punctuality),
        practicalWorkEthics: Number(companyForm.practicalWorkEthics),
        attendance: Number(companyForm.attendance),
        workplacePerformance: Number(companyForm.workplacePerformance),
        logbookQuality: null,
        academicReport: null,
        presentation: null,
        overallGrade: null,
      };
      const existing = evaluations.find((e) => e.supervisorType === 'COMPANY');
      if (existing) {
        await updateEvaluation(existing.id, payload);
      } else {
        await createEvaluation(payload);
      }
      await loadEvaluations(placement.studentId);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message || 'Unable to save company evaluation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUniversitySubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        studentId: placement.studentId,
        placementId: placement.id,
        supervisorType: 'UNIVERSITY',
        supervisorUsername: placement.universitySupervisor,
        punctuality: null,
        practicalWorkEthics: null,
        attendance: null,
        workplacePerformance: null,
        logbookQuality: Number(universityForm.logbookQuality),
        academicReport: Number(universityForm.academicReport),
        presentation: Number(universityForm.presentation),
        overallGrade: Number(universityForm.overallGrade),
      };
      const existing = evaluations.find((e) => e.supervisorType === 'UNIVERSITY');
      if (existing) {
        await updateEvaluation(existing.id, payload);
      } else {
        await createEvaluation(payload);
      }
      await loadEvaluations(placement.studentId);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message || 'Unable to save university evaluation.');
    } finally {
      setSubmitting(false);
    }
  }

  const companyEval = evaluations.find((e) => e.supervisorType === 'COMPANY');
  const universityEval = evaluations.find((e) => e.supervisorType === 'UNIVERSITY');

  const inputClass = "w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eval-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[900px] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="eval-modal-title" className="text-base font-bold text-slate-900 truncate">Dual Supervisor Evaluation</h3>
              <p className="text-xs text-slate-500 truncate">Company and university supervisor scoring</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-4 sm:mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm animate-in fade-in">
            <span className="font-medium">{error}</span>
          </div>
        )}

        {loading && (
          <div className="p-6 text-center text-sm text-slate-500">Loading evaluations...</div>
        )}

        {!loading && (
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Evaluation */}
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Company Supervisor Evaluation</h4>
                </div>

                <div>
                  <label htmlFor="punctuality" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Punctuality</label>
                  <input
                    id="punctuality"
                    type="number"
                    min="0"
                    max="100"
                    value={companyForm.punctuality}
                    onChange={(e) => setCompanyForm({ ...companyForm, punctuality: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="practicalWorkEthics" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Practical Work Ethics</label>
                  <input
                    id="practicalWorkEthics"
                    type="number"
                    min="0"
                    max="100"
                    value={companyForm.practicalWorkEthics}
                    onChange={(e) => setCompanyForm({ ...companyForm, practicalWorkEthics: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="attendance" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Attendance</label>
                  <input
                    id="attendance"
                    type="number"
                    min="0"
                    max="100"
                    value={companyForm.attendance}
                    onChange={(e) => setCompanyForm({ ...companyForm, attendance: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="workplacePerformance" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Workplace Performance</label>
                  <input
                    id="workplacePerformance"
                    type="number"
                    min="0"
                    max="100"
                    value={companyForm.workplacePerformance}
                    onChange={(e) => setCompanyForm({ ...companyForm, workplacePerformance: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : companyEval ? 'Update Company Scores' : 'Save Company Scores'}
                  </button>
                </div>
              </form>

              {/* University Evaluation */}
              <form onSubmit={handleUniversitySubmit} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-800">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">University Supervisor Evaluation</h4>
                </div>

                <div>
                  <label htmlFor="logbookQuality" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Logbook Quality</label>
                  <input
                    id="logbookQuality"
                    type="number"
                    min="0"
                    max="100"
                    value={universityForm.logbookQuality}
                    onChange={(e) => setUniversityForm({ ...universityForm, logbookQuality: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="academicReport" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Academic Report</label>
                  <input
                    id="academicReport"
                    type="number"
                    min="0"
                    max="100"
                    value={universityForm.academicReport}
                    onChange={(e) => setUniversityForm({ ...universityForm, academicReport: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="presentation" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Presentation</label>
                  <input
                    id="presentation"
                    type="number"
                    min="0"
                    max="100"
                    value={universityForm.presentation}
                    onChange={(e) => setUniversityForm({ ...universityForm, presentation: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="overallGrade" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Overall Grade</label>
                  <input
                    id="overallGrade"
                    type="number"
                    min="0"
                    max="100"
                    value={universityForm.overallGrade}
                    onChange={(e) => setUniversityForm({ ...universityForm, overallGrade: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : universityEval ? 'Update University Scores' : 'Save University Scores'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
