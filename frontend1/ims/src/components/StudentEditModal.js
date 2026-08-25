import React, { useEffect, useState } from 'react';
import { UserCog, X } from 'lucide-react';
import CustomSelect from './CustomSelect';

const emptyForm = {
  firstName: '',
  lastName: '',
  username: '',
  studentNumber: '',
  registrationNumber: '',
  intake: '',
  degreeProgram: '',
  yearOfStudy: '',
  academicYear: '',
  semester: '',
  phoneNumber: '',
  internshipCompanyId: '',
  uniSupervisorId: '',
  indSupervisorId: '',
  startDate: '',
  endDate: '',
};

export default function StudentEditModal({ student, title, onClose, onSubmit }) {
  const [stepState, setStepState] = useState(1);
  const [form, setForm] = useState(
    student
      ? {
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          username: student.username || '',
          studentNumber: student.studentNumber || '',
          registrationNumber: student.registrationNumber || '',
          intake: student.intake || '',
          degreeProgram: student.degreeProgram || '',
          yearOfStudy: student.yearOfStudy != null ? String(student.yearOfStudy) : '',
          academicYear: student.academicYear || '',
          semester: student.semester || '',
          phoneNumber: student.phoneNumber || '',
          internshipCompanyId: student.internshipCompanyId != null ? String(student.internshipCompanyId) : '',
          uniSupervisorId: student.uniSupervisorId != null ? String(student.uniSupervisorId) : '',
          indSupervisorId: student.indSupervisorId != null ? String(student.indSupervisorId) : '',
          startDate: student.startDate || '',
          endDate: student.endDate || '',
        }
      : emptyForm
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const step1Valid = form.firstName.trim() && form.studentNumber.trim() && form.registrationNumber.trim();
  const step2Valid = form.intake.trim() && form.degreeProgram.trim() && form.yearOfStudy.trim();
  const step3Valid = true;

  function validateStep1() {
    if (!step1Valid) { setError('First name, student number and registration number are required.'); return false; }
    setError(''); return true;
  }
  function validateStep2() {
    if (!step2Valid) { setError('Intake, degree program and year of study are required.'); return false; }
    setError(''); return true;
  }
  function validateStep3() {
    setError(''); return true;
  }

  function nextStep() {
    if (stepState === 1 && !validateStep1()) return;
    if (stepState === 2 && !validateStep2()) return;
    if (stepState === 3 && !validateStep3()) return;
    setStepState((s) => s + 1);
  }

  function prevStep() { setError(''); setStepState((s) => s - 1); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        studentNumber: form.studentNumber.trim(),
        registrationNumber: form.registrationNumber.trim(),
        intake: form.intake.trim() || null,
        degreeProgram: form.degreeProgram.trim(),
        yearOfStudy: form.yearOfStudy === '' ? null : Number(form.yearOfStudy),
        academicYear: form.academicYear.trim() || null,
        semester: form.semester.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        internshipCompanyId: form.internshipCompanyId === '' ? null : Number(form.internshipCompanyId),
        uniSupervisorId: form.uniSupervisorId === '' ? null : Number(form.uniSupervisorId),
        indSupervisorId: form.indSupervisorId === '' ? null : Number(form.indSupervisorId),
        startDate: form.startDate.trim() || null,
        endDate: form.endDate.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save student.');
    } finally {
      setBusy(false);
    }
  }

  const yearOptions = ['', '1', '2', '3', '4', '5'].map((v) => v === '' ? { value: '', label: 'Select Year' } : { value: v, label: v });
  const semesterOptions = ['', 'One', 'Two'].map((v) => v === '' ? { value: '', label: 'Select Semester' } : { value: v, label: v });
  const academicYearOptions = ['', 'One', 'Two', 'Three', 'Four', 'Five'].map((v) => v === '' ? { value: '', label: 'Select Academic Year' } : { value: v, label: v });

  const steps = [
    { id: 1, label: 'Personal Info' },
    { id: 2, label: 'Academic Info' },
    { id: 3, label: 'Placement Info' },
    { id: 4, label: 'Review' },
  ];

  const inputClass = "w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5";

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="student-edit-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="student-edit-modal-title" className="text-base font-bold text-slate-900 truncate">{title}</h3>
              <p className="text-xs text-slate-500 truncate">Step {stepState} of 4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-4 sm:mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm animate-in fade-in">
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between w-full px-6 py-5">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${step.id === stepState ? 'bg-teal-700 text-white border-teal-700 shadow-md' : step.id < stepState ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-500 border-slate-300'}`}>
                  {step.id < stepState ? '✓' : step.id}
                </div>
                <span className={`mt-2 text-[11px] font-semibold text-center max-w-[70px] leading-tight ${step.id === stepState ? 'text-teal-900' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 rounded-full mx-2 ${step.id < stepState ? 'bg-teal-700' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {stepState === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="edit-firstName" className={labelClass}>First Name <span className="text-rose-600">*</span></label>
                <input id="edit-firstName" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-lastName" className={labelClass}>Last Name</label>
                <input id="edit-lastName" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-studentNumber" className={labelClass}>Student No. <span className="text-rose-600">*</span></label>
                <input id="edit-studentNumber" value={form.studentNumber} onChange={(e) => setField('studentNumber', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-registrationNumber" className={labelClass}>Registration No. <span className="text-rose-600">*</span></label>
                <input id="edit-registrationNumber" value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-username" className={labelClass}>Account Username</label>
                <input id="edit-username" value={form.username} readOnly disabled className={`${inputClass} bg-slate-100 text-slate-500`} />
              </div>
              <div>
                <label htmlFor="edit-phoneNumber" className={labelClass}>Phone Number</label>
                <input id="edit-phoneNumber" value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {stepState === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="edit-intake" className={labelClass}>Intake <span className="text-rose-600">*</span></label>
                <input id="edit-intake" value={form.intake} onChange={(e) => setField('intake', e.target.value)} className={inputClass} placeholder="e.g. AUG/2024" />
              </div>
              <div>
                <label htmlFor="edit-degreeProgram" className={labelClass}>Degree Program <span className="text-rose-600">*</span></label>
                <input id="edit-degreeProgram" value={form.degreeProgram} onChange={(e) => setField('degreeProgram', e.target.value)} className={inputClass} placeholder="e.g. BSc Computer Science" />
              </div>
              <div>
                <label className={labelClass}>Year of Study <span className="text-rose-600">*</span></label>
                <CustomSelect id="edit-yearOfStudy" value={form.yearOfStudy} onChange={(val) => setField('yearOfStudy', val)} options={yearOptions} />
              </div>
              <div>
                <label className={labelClass}>Academic Year</label>
                <CustomSelect id="edit-academicYear" value={form.academicYear} onChange={(val) => setField('academicYear', val)} options={academicYearOptions} />
              </div>
              <div>
                <label className={labelClass}>Semester</label>
                <CustomSelect id="edit-semester" value={form.semester} onChange={(val) => setField('semester', val)} options={semesterOptions} />
              </div>
            </div>
          )}

          {stepState === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="edit-internshipCompanyId" className={labelClass}>Internship Company ID</label>
                <input id="edit-internshipCompanyId" type="number" min="0" value={form.internshipCompanyId} onChange={(e) => setField('internshipCompanyId', e.target.value)} className={inputClass} placeholder="empty = unassigned" />
              </div>
              <div>
                <label htmlFor="edit-uniSupervisorId" className={labelClass}>University Supervisor ID</label>
                <input id="edit-uniSupervisorId" type="number" min="0" value={form.uniSupervisorId} onChange={(e) => setField('uniSupervisorId', e.target.value)} className={inputClass} placeholder="university_supervisors.id" />
              </div>
              <div>
                <label htmlFor="edit-indSupervisorId" className={labelClass}>Industry Supervisor ID</label>
                <input id="edit-indSupervisorId" type="number" min="0" value={form.indSupervisorId} onChange={(e) => setField('indSupervisorId', e.target.value)} className={inputClass} placeholder="industrial_supervisors.id" />
              </div>
              <div>
                <label htmlFor="edit-startDate" className={labelClass}>Start Date</label>
                <input id="edit-startDate" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-endDate" className={labelClass}>End Date</label>
                <input id="edit-endDate" type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {stepState === 4 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Review Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['First Name', form.firstName],
                  ['Last Name', form.lastName],
                  ['Student No.', form.studentNumber],
                  ['Registration No.', form.registrationNumber],
                  ['Intake', form.intake],
                  ['Degree Program', form.degreeProgram],
                  ['Year of Study', form.yearOfStudy],
                  ['Academic Year', form.academicYear],
                  ['Semester', form.semester],
                  ['Phone Number', form.phoneNumber],
                  ['Company ID', form.internshipCompanyId],
                  ['Uni Supervisor ID', form.uniSupervisorId],
                  ['Industry Supervisor ID', form.indSupervisorId],
                  ['Start Date', form.startDate],
                  ['End Date', form.endDate],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white rounded-lg p-3 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{label}</span>
                    <p className="text-sm text-slate-700 mt-1">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          {stepState > 1 && (
            <button type="button" onClick={prevStep}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors shadow-xs">
              Back
            </button>
          )}
          {stepState < 4 ? (
            <button type="button" onClick={nextStep}
              className="px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none">
              Next
            </button>
          ) : (
            <button type="submit" onClick={handleSubmit} disabled={busy}
              className="px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? 'Saving...' : 'Save Student'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
