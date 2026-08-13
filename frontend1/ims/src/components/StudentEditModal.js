import { useState } from 'react';

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

export default function StudentEditModal({ student, title, onClose, onSubmit }) {
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

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

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
        <form onSubmit={handleSubmit} className="modal-form">
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
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </label>
          <label>
            Student Number
            <input
              value={form.studentNumber}
              onChange={(e) => setField('studentNumber', e.target.value)}
            />
          </label>
          <label>
            Registration Number
            <input
              value={form.registrationNumber}
              onChange={(e) => setField('registrationNumber', e.target.value)}
            />
          </label>
          <label>
            Degree Program
            <input
              value={form.degreeProgram}
              onChange={(e) => setField('degreeProgram', e.target.value)}
            />
          </label>
          <label>
            Year of Study
            <input
              type="number"
              min="1"
              max="5"
              value={form.yearOfStudy}
              onChange={(e) => setField('yearOfStudy', e.target.value)}
            />
          </label>
          <label>
            Phone Number
            <input
              value={form.phoneNumber}
              onChange={(e) => setField('phoneNumber', e.target.value)}
            />
          </label>
          <label>
            Internship Company
            <input
              value={form.internshipCompany}
              onChange={(e) => setField('internshipCompany', e.target.value)}
            />
          </label>
          <label>
            University Supervisor
            <input
              value={form.universitySupervisor}
              onChange={(e) => setField('universitySupervisor', e.target.value)}
            />
          </label>
          <label>
            Industrial Supervisor ID
            <input
              value={form.industrialSupervisorId}
              onChange={(e) => setField('industrialSupervisorId', e.target.value)}
            />
          </label>
          <label>
            Company ID
            <input
              type="number"
              value={form.companyId}
              onChange={(e) => setField('companyId', e.target.value)}
            />
          </label>
          <label>
            Picture URL
            <input
              value={form.pictureUrl}
              onChange={(e) => setField('pictureUrl', e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
