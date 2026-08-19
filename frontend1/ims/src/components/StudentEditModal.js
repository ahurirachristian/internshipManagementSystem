import React, { useState } from 'react';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  studentNumber: '',
  registrationNumber: '',
  degreeProgram: '',
  yearOfStudy: '',
  phoneNumber: '',
  internshipCompany: '',
  universitySupervisor: '',
  industrialSupervisorId: '',
  companyId: '',
  pictureUrl: '',
};

export default function StudentEditModal({ student, title, onClose, onSubmit, companies = [], supervisors = [] }) {
  const [stepState, setStepState] = useState(1);
  const [form, setForm] = useState(
    student
      ? {
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          email: student.email || '',
          studentNumber: student.studentNumber || '',
          registrationNumber: student.registrationNumber || '',
          degreeProgram: student.degreeProgram || '',
          yearOfStudy: student.yearOfStudy ?? '',
          phoneNumber: student.phoneNumber || '',
          internshipCompany: student.internshipCompany || '',
          universitySupervisor: student.universitySupervisor || '',
          industrialSupervisorId: student.industrialSupervisorId || '',
          companyId: student.companyId ?? '',
          pictureUrl: student.pictureUrl || '',
        }
      : emptyForm
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const step1Valid = form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.studentNumber.trim();
  const step2Valid = form.registrationNumber.trim() && form.degreeProgram.trim() && form.yearOfStudy;
  const step3Valid = form.internshipCompany.trim() && form.universitySupervisor.trim();

  function validateStep1() {
    if (!step1Valid) {
      setError('All basic fields are required.');
      return false;
    }
    setError('');
    return true;
  }

  function validateStep2() {
    if (!step2Valid) {
      setError('All academic fields are required.');
      return false;
    }
    setError('');
    return true;
  }

  function validateStep3() {
    if (!step3Valid) {
      setError('Please select both company and supervisor.');
      return false;
    }
    setError('');
    return true;
  }

  function nextStep() {
    if (stepState === 1 && !validateStep1()) return;
    if (stepState === 2 && !validateStep2()) return;
    if (stepState === 3 && !validateStep3()) return;
    setStepState((s) => s + 1);
  }

  function prevStep() {
    setError('');
    setStepState((s) => s - 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        ...form,
        yearOfStudy: form.yearOfStudy === '' ? null : Number(form.yearOfStudy),
        companyId: form.companyId === '' ? null : Number(form.companyId),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save student.');
    } finally {
      setBusy(false);
    }
  }

  const yearOptions = ['', 1, 2, 3, 4, 5].map((year) => (
    <option key={year} value={year}>
      {year === '' ? 'Select Year' : `Year ${year}`}
    </option>
  ));

  const companyOptions = [
    <option key="none" value="">Assign Later</option>,
    ...companies.map((company) => (
      <option key={company.id} value={company.id}>
        {company.name}
      </option>
    )),
  ];

  const supervisorOptions = [
    <option key="none" value="">Assign Later</option>,
    ...supervisors.map((supervisor) => (
      <option key={supervisor.id} value={supervisor.username}>
        {supervisor.username}
      </option>
    )),
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '32px', padding: '0 16px' }}>
          {[
            { num: 1, title: 'Basic Info' },
            { num: 2, title: 'Academic Info' },
            { num: 3, title: 'Placement Info' },
            { num: 4, title: 'Finish' },
          ].map((step, idx, arr) => (
            <React.Fragment key={step.num}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: '2px solid #d1d5db',
                    background: '#ffffff',
                    color: '#6b7280',
                    transition: 'all 0.2s',
                    ...(step.num === stepState ? { background: '#0f766e', color: '#ffffff', borderColor: '#0f766e', boxShadow: '0 4px 6px -1px rgba(15, 118, 110, 0.3)' } : {}),
                    ...(step.num < stepState ? { background: '#0f766e', color: '#ffffff', borderColor: '#0f766e' } : {}),
                  }}
                >
                  {step.num}
                </div>
                <span
                  style={{
                    marginTop: '8px',
                    fontSize: '0.75rem',
                    fontWeight: step.num === stepState ? 700 : 500,
                    textAlign: 'center',
                    color: step.num === stepState ? '#134e4a' : '#6b7280',
                  }}
                >
                  {step.title}
                </span>
              </div>
              {idx < arr.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '4px',
                    margin: '0 8px',
                    background: step.num < stepState ? '#0f766e' : '#d1d5db',
                    borderRadius: '2px',
                    marginTop: '-18px',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} className='modal-form' style={{ marginTop: '24px' }}>
          <div className="modal-body">
            {stepState === 1 && (
              <>
                <label>
                  First Name
                  <input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                </label>
                <label>
                  Last Name
                  <input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                </label>
                <label>
                  Email
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </label>
                <label>
                  Student Number
                  <input value={form.studentNumber} onChange={(e) => setField('studentNumber', e.target.value)} />
                </label>
              </>
            )}

            {stepState === 2 && (
              <>
                <label>
                  Registration Number
                  <input value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} />
                </label>
                <label>
                  Degree Program
                  <input value={form.degreeProgram} onChange={(e) => setField('degreeProgram', e.target.value)} />
                </label>
                <label>
                  Year of Study
                  <select value={form.yearOfStudy} onChange={(e) => setField('yearOfStudy', e.target.value)}>
                    {yearOptions}
                  </select>
                </label>
                <label>
                  Phone Number
                  <input value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} />
                </label>
              </>
            )}

            {stepState === 3 && (
              <>
                <label>
                  Internship Company
                  <select value={form.internshipCompany} onChange={(e) => setField('internshipCompany', e.target.value)}>
                    {companyOptions}
                  </select>
                </label>
                <label>
                  University Supervisor
                  <select value={form.universitySupervisor} onChange={(e) => setField('universitySupervisor', e.target.value)}>
                    {supervisorOptions}
                  </select>
                </label>
                <label>
                  Industrial Supervisor ID
                  <input value={form.industrialSupervisorId} onChange={(e) => setField('industrialSupervisorId', e.target.value)} />
                </label>
                <label>
                  Company ID
                  <input type="number" value={form.companyId} onChange={(e) => setField('companyId', e.target.value)} />
                </label>
                <label>
                  Picture URL
                  <input value={form.pictureUrl} onChange={(e) => setField('pictureUrl', e.target.value)} />
                </label>
              </>
            )}

            {stepState === 4 && (
              <div className="review-card">
                <h3>Review Information</h3>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Full Name</span>
                    <span className="review-value">{form.firstName} {form.lastName}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Email</span>
                    <span className="review-value">{form.email}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Student Number</span>
                    <span className="review-value">{form.studentNumber}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Registration Number</span>
                    <span className="review-value">{form.registrationNumber}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Degree Program</span>
                    <span className="review-value">{form.degreeProgram}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Year of Study</span>
                    <span className="review-value">{form.yearOfStudy}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Phone Number</span>
                    <span className="review-value">{form.phoneNumber}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Internship Company</span>
                    <span className="review-value">{form.internshipCompany}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">University Supervisor</span>
                    <span className="review-value">{form.universitySupervisor}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Industrial Supervisor ID</span>
                    <span className="review-value">{form.industrialSupervisorId}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Company ID</span>
                    <span className="review-value">{form.companyId}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className='modal-footer'>
            {stepState > 1 && (
              <button type='button' onClick={prevStep} style={{ padding: '8px 20px', borderRadius: '8px', background: '#e5e7eb', color: '#374151', fontWeight: 500, border: 'none', cursor: 'pointer', marginRight: '12px' }}>Back</button>
            )}
            {stepState < 4 ? (
              <button type='button' onClick={nextStep} style={{ padding: '8px 24px', borderRadius: '8px', background: '#0f766e', color: '#ffffff', fontWeight: 500, border: 'none', cursor: 'pointer' }}>Next</button>
            ) : (
              <button type='submit' disabled={busy} style={{ padding: '8px 24px', borderRadius: '8px', background: '#0f766e', color: '#ffffff', fontWeight: 500, border: 'none', cursor: 'pointer' }}>{busy ? 'Saving...' : 'Save Student'}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}


