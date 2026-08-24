import React, { useEffect, useState } from 'react';
import { UserCog, X } from 'lucide-react';
import CustomSelect from './CustomSelect';

const emptyForm = {
  studentName: '',
  studentNo: '',
  regNo: '',
  intake: '',
  program: '',
  courseName: '',
  mobileNo: '',
  email: '',
  yearOfStudy: '',
  academicYear: '',
  semester: '',
  organisation: '',
  location: '',
  academicSupervisor: '',
  academicSupervisorContact: '',
  fieldSupervisor: '',
  fieldSupervisorContact: '',
  startDate: '',
  endDate: '',
  unitId: '',
  courseId: '',
  academicSupervisorId: '',
  fieldSupervisorId: '',
};

export default function StudentEditModal({ student, title, onClose, onSubmit }) {
  const [stepState, setStepState] = useState(1);
  const [form, setForm] = useState(
    student
      ? {
          studentName: student.studentName || '',
          studentNo: student.studentNo || '',
          regNo: student.regNo || '',
          intake: student.intake || '',
          program: student.program || '',
          courseName: student.courseName || '',
          mobileNo: student.mobileNo || '',
          email: student.email || '',
          yearOfStudy: student.yearOfStudy || '',
          academicYear: student.academicYear || '',
          semester: student.semester || '',
          organisation: student.organisation || '',
          location: student.location || '',
          academicSupervisor: student.academicSupervisor || '',
          academicSupervisorContact: student.academicSupervisorContact || '',
          fieldSupervisor: student.fieldSupervisor || '',
          fieldSupervisorContact: student.fieldSupervisorContact || '',
          startDate: student.startDate || '',
          endDate: student.endDate || '',
          unitId: student.unitId ?? '',
          courseId: student.courseId ?? '',
          academicSupervisorId: student.academicSupervisorId ?? '',
          fieldSupervisorId: student.fieldSupervisorId ?? '',
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

  const step1Valid = form.studentName.trim() && form.studentNo.trim() && form.regNo.trim() && form.email.trim();
  const step2Valid = form.intake.trim() && form.program.trim() && form.courseName.trim() && form.yearOfStudy.trim();
  const step3Valid = form.organisation.trim() && form.location.trim() && form.academicSupervisor.trim();

  function validateStep1() {
    if (!step1Valid) { setError('Name, student number, reg number and email are required.'); return false; }
    setError(''); return true;
  }
  function validateStep2() {
    if (!step2Valid) { setError('Intake, program, course name and year of study are required.'); return false; }
    setError(''); return true;
  }
  function validateStep3() {
    if (!step3Valid) { setError('Organisation, location and academic supervisor are required.'); return false; }
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
        ...form,
        unitId: form.unitId === '' ? null : Number(form.unitId),
        courseId: form.courseId === '' ? null : Number(form.courseId),
        academicSupervisorId: form.academicSupervisorId === '' ? null : Number(form.academicSupervisorId),
        fieldSupervisorId: form.fieldSupervisorId === '' ? null : Number(form.fieldSupervisorId),
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
                <label htmlFor="edit-studentName" className={labelClass}>Student Name <span className="text-rose-600">*</span></label>
                <input id="edit-studentName" value={form.studentName} onChange={(e) => setField('studentName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-studentNo" className={labelClass}>Student No. <span className="text-rose-600">*</span></label>
                <input id="edit-studentNo" value={form.studentNo} onChange={(e) => setField('studentNo', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-regNo" className={labelClass}>Registration No. <span className="text-rose-600">*</span></label>
                <input id="edit-regNo" value={form.regNo} onChange={(e) => setField('regNo', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-email" className={labelClass}>Email <span className="text-rose-600">*</span></label>
                <input id="edit-email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-mobileNo" className={labelClass}>Mobile No.</label>
                <input id="edit-mobileNo" value={form.mobileNo} onChange={(e) => setField('mobileNo', e.target.value)} className={inputClass} />
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
                <label htmlFor="edit-program" className={labelClass}>Program <span className="text-rose-600">*</span></label>
                <input id="edit-program" value={form.program} onChange={(e) => setField('program', e.target.value)} className={inputClass} placeholder="e.g. BSCCS" />
              </div>
              <div>
                <label htmlFor="edit-courseName" className={labelClass}>Course Name <span className="text-rose-600">*</span></label>
                <input id="edit-courseName" value={form.courseName} onChange={(e) => setField('courseName', e.target.value)} className={inputClass} />
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
                <label htmlFor="edit-organisation" className={labelClass}>Organisation <span className="text-rose-600">*</span></label>
                <input id="edit-organisation" value={form.organisation} onChange={(e) => setField('organisation', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-location" className={labelClass}>Location <span className="text-rose-600">*</span></label>
                <input id="edit-location" value={form.location} onChange={(e) => setField('location', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-academicSupervisor" className={labelClass}>Academic Supervisor <span className="text-rose-600">*</span></label>
                <input id="edit-academicSupervisor" value={form.academicSupervisor} onChange={(e) => setField('academicSupervisor', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-academicSupervisorContact" className={labelClass}>Academic Supervisor Contact</label>
                <input id="edit-academicSupervisorContact" value={form.academicSupervisorContact} onChange={(e) => setField('academicSupervisorContact', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-fieldSupervisor" className={labelClass}>Field Supervisor</label>
                <input id="edit-fieldSupervisor" value={form.fieldSupervisor} onChange={(e) => setField('fieldSupervisor', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-fieldSupervisorContact" className={labelClass}>Field Supervisor Contact</label>
                <input id="edit-fieldSupervisorContact" value={form.fieldSupervisorContact} onChange={(e) => setField('fieldSupervisorContact', e.target.value)} className={inputClass} />
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
                  ['Student Name', form.studentName],
                  ['Student No.', form.studentNo],
                  ['Registration No.', form.regNo],
                  ['Email', form.email],
                  ['Intake', form.intake],
                  ['Program', form.program],
                  ['Course Name', form.courseName],
                  ['Year of Study', form.yearOfStudy],
                  ['Academic Year', form.academicYear],
                  ['Semester', form.semester],
                  ['Organisation', form.organisation],
                  ['Location', form.location],
                  ['Academic Supervisor', form.academicSupervisor],
                  ['Field Supervisor', form.fieldSupervisor],
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
