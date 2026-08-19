import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, fetchCompanies, fetchSupervisors, saveMyProfile } from '../services/api';
import AuthShell from './AuthShell';
import './LoginPage.css';

const emptyForm = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  role: 'STUDENT',
  agreeTerms: false,
  registrationNumber: '',
  degreeProgram: '',
  yearOfStudy: '',
  phoneNumber: '',
  internshipCompany: '',
  universitySupervisor: '',
  industrialSupervisorId: '',
  companyId: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    fetchCompanies().then(setCompanies).catch(() => {});
    fetchSupervisors('UNIVERSITY').then(setSupervisors).catch(() => {});
  }, []);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const step1Valid = form.username.trim() && form.email.trim() && form.firstName.trim() && form.lastName.trim() && form.password && form.confirmPassword && form.agreeTerms;
  const step2Valid = form.registrationNumber.trim() && form.degreeProgram.trim() && form.yearOfStudy;
  const step3Valid = form.internshipCompany.trim() && form.universitySupervisor.trim();

  function validateStep1() {
    if (!step1Valid) {
      setError('Please fill all fields and agree to the terms.');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
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
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((s) => s + 1);
  }

  function prevStep() {
    setError('');
    setStep((s) => s - 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.username.trim(), form.password, form.confirmPassword, form.role.toUpperCase());
      const profilePayload = {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        studentNumber: form.username.trim(),
        registrationNumber: form.registrationNumber.trim(),
        degreeProgram: form.degreeProgram.trim(),
        yearOfStudy: Number(form.yearOfStudy),
        phoneNumber: form.phoneNumber.trim() || 'Pending',
        internshipCompany: form.internshipCompany.trim(),
        universitySupervisor: form.universitySupervisor.trim(),
        industrialSupervisorId: form.industrialSupervisorId.trim() || 'Pending',
        companyId: form.companyId ? Number(form.companyId) : null,
        pictureUrl: '/images/student-placeholder.png',
      };
      await saveMyProfile(profilePayload);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="register-form-card">
          <div className="login-header">
          <div className="logo">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h1>Create Account</h1>
          <p>Register to get started</p>
        </div>

        {error && <div className="alert alert-error show">{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '32px', padding: '0 16px' }}>
          {[
            { num: 1, title: 'Basic Info' },
            { num: 2, title: 'Academic Info' },
            { num: 3, title: 'Placement Info' },
            { num: 4, title: 'Finish' },
          ].map((s, idx, arr) => (
            <React.Fragment key={s.num}>
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
                    ...(s.num === step ? { background: '#0f766e', color: '#ffffff', borderColor: '#0f766e', boxShadow: '0 4px 6px -1px rgba(15, 118, 110, 0.3)' } : {}),
                    ...(s.num < step ? { background: '#0f766e', color: '#ffffff', borderColor: '#0f766e' } : {}),
                  }}
                >
                  {s.num}
                </div>
                <span
                  style={{
                    marginTop: '8px',
                    fontSize: '0.75rem',
                    fontWeight: s.num === step ? 700 : 500,
                    textAlign: 'center',
                    color: s.num === step ? '#134e4a' : '#6b7280',
                  }}
                >
                  {s.title}
                </span>
              </div>
              {idx < arr.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '4px',
                    margin: '0 8px',
                    background: s.num < step ? '#0f766e' : '#d1d5db',
                    borderRadius: '2px',
                    marginTop: '-18px',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          {step === 1 && (
            <>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <input type="text" id="username" className="form-control" placeholder="Enter your username" autoComplete="username" value={form.username} onChange={(e) => setField('username', e.target.value)} />
                  <i className="fa-solid fa-user"></i>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <input type="email" id="email" className="form-control" placeholder="Enter your email" autoComplete="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  <i className="fa-solid fa-envelope"></i>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <div className="input-wrapper">
                    <input type="text" id="firstName" className="form-control" placeholder="First name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                    <i className="fa-solid fa-user"></i>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <div className="input-wrapper">
                    <input type="text" id="lastName" className="form-control" placeholder="Last name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                    <i className="fa-solid fa-user"></i>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <div className="input-wrapper">
                  <select id="role" className="form-control" value={form.role} onChange={(e) => setField('role', e.target.value)}>
                    <option value="STUDENT">Student</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="COMPANY">Company</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <i className="fa-solid fa-user-tag"></i>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <input type={showPassword ? 'text' : 'password'} id="password" className="form-control" placeholder="Enter your password" autoComplete="new-password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
                  <i className="fa-solid fa-lock"></i>
                  <button type="button" className="toggle-password" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)}>
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" className="form-control" placeholder="Confirm your password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} />
                  <i className="fa-solid fa-lock"></i>
                  <button type="button" className="toggle-password" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword((s) => !s)}>
                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.agreeTerms} onChange={(e) => setField('agreeTerms', e.target.checked)} />
                <span>I agree to the terms and conditions</span>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label htmlFor="registrationNumber">Registration Number</label>
                <div className="input-wrapper">
                  <input type="text" id="registrationNumber" className="form-control" placeholder="Enter registration number" value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} />
                  <i className="fa-solid fa-id-card"></i>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="degreeProgram">Degree Program</label>
                <div className="input-wrapper">
                  <input type="text" id="degreeProgram" className="form-control" placeholder="Enter degree program" value={form.degreeProgram} onChange={(e) => setField('degreeProgram', e.target.value)} />
                  <i className="fa-solid fa-graduation-cap"></i>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="yearOfStudy">Year of Study</label>
                <div className="input-wrapper">
                  <select id="yearOfStudy" className="form-control" value={form.yearOfStudy} onChange={(e) => setField('yearOfStudy', e.target.value)}>
                    <option value="">Select year</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                    <option value="5">Year 5</option>
                  </select>
                  <i className="fa-solid fa-calendar"></i>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="form-group">
                <label htmlFor="internshipCompany">Internship Company</label>
                <div className="input-wrapper">
                  <select id="internshipCompany" className="form-control" value={form.internshipCompany} onChange={(e) => setField('internshipCompany', e.target.value)}>
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.name}>{company.name}</option>
                    ))}
                  </select>
                  <i className="fa-solid fa-building"></i>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="universitySupervisor">University Supervisor</label>
                <div className="input-wrapper">
                  <select id="universitySupervisor" className="form-control" value={form.universitySupervisor} onChange={(e) => setField('universitySupervisor', e.target.value)}>
                    <option value="">Select supervisor</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.username}>{supervisor.username}</option>
                    ))}
                  </select>
                  <i className="fa-solid fa-user-tie"></i>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="review-card">
              <h3>Review Your Information</h3>
              <div className="review-grid">
                <div className="review-item">
                  <span className="review-label">Username</span>
                  <span className="review-value">{form.username}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Email</span>
                  <span className="review-value">{form.email}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Full Name</span>
                  <span className="review-value">{form.firstName} {form.lastName}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Role</span>
                  <span className="review-value">{form.role}</span>
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
                  <span className="review-label">Internship Company</span>
                  <span className="review-value">{form.internshipCompany}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">University Supervisor</span>
                  <span className="review-value">{form.universitySupervisor}</span>
                </div>
              </div>
            </div>
          )}

          <div className="wizard-actions">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: '#e5e7eb',
                  color: '#374151',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  marginRight: '12px',
                }}
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={step === 1 && !step1Valid}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  background: '#0f766e',
                  color: '#ffffff',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  background: '#0f766e',
                  color: '#ffffff',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Creating Account...' : 'Submit Student'}
              </button>
            )}
          </div>
        </form>

        <div className="login-footer">
          <p>
            <Link to="/login">Already have an account? Sign in</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}


