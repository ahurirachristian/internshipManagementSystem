import { useEffect, useState } from 'react';
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2>Dual Supervisor Evaluation</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="status-message">Loading evaluations...</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <form onSubmit={handleCompanySubmit} className="modal-form">
            <h3 style={{ marginBottom: '1rem' }}>Company Supervisor Evaluation</h3>
            <label>
              Punctuality
              <input
                type="number"
                min="0"
                max="100"
                value={companyForm.punctuality}
                onChange={(e) => setCompanyForm({ ...companyForm, punctuality: e.target.value })}
              />
            </label>
            <label>
              Practical Work Ethics
              <input
                type="number"
                min="0"
                max="100"
                value={companyForm.practicalWorkEthics}
                onChange={(e) => setCompanyForm({ ...companyForm, practicalWorkEthics: e.target.value })}
              />
            </label>
            <label>
              Attendance
              <input
                type="number"
                min="0"
                max="100"
                value={companyForm.attendance}
                onChange={(e) => setCompanyForm({ ...companyForm, attendance: e.target.value })}
              />
            </label>
            <label>
              Workplace Performance
              <input
                type="number"
                min="0"
                max="100"
                value={companyForm.workplacePerformance}
                onChange={(e) => setCompanyForm({ ...companyForm, workplacePerformance: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Saving...' : companyEval ? 'Update Company Scores' : 'Save Company Scores'}
              </button>
            </div>
          </form>

          <form onSubmit={handleUniversitySubmit} className="modal-form">
            <h3 style={{ marginBottom: '1rem' }}>University Supervisor Evaluation</h3>
            <label>
              Logbook Quality
              <input
                type="number"
                min="0"
                max="100"
                value={universityForm.logbookQuality}
                onChange={(e) => setUniversityForm({ ...universityForm, logbookQuality: e.target.value })}
              />
            </label>
            <label>
              Academic Report
              <input
                type="number"
                min="0"
                max="100"
                value={universityForm.academicReport}
                onChange={(e) => setUniversityForm({ ...universityForm, academicReport: e.target.value })}
              />
            </label>
            <label>
              Presentation
              <input
                type="number"
                min="0"
                max="100"
                value={universityForm.presentation}
                onChange={(e) => setUniversityForm({ ...universityForm, presentation: e.target.value })}
              />
            </label>
            <label>
              Overall Grade
              <input
                type="number"
                min="0"
                max="100"
                value={universityForm.overallGrade}
                onChange={(e) => setUniversityForm({ ...universityForm, overallGrade: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Saving...' : universityEval ? 'Update University Scores' : 'Save University Scores'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
