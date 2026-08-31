import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import { register, fetchCompanies, fetchSupervisors } from '../services/api';
import AuthShell from './AuthShell';
import CustomSelect from './CustomSelect';
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

const inputClass = "w-full bg-slate-50 text-slate-900 text-sm rounded-xl border-2 border-slate-200 pl-10 pr-10 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
const plainInputClass = "w-full bg-slate-50 text-slate-900 text-sm rounded-xl border-2 border-slate-200 px-3.5 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium";

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
      const registrationPayload = {
        username: form.username.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role.toUpperCase(),
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
      };
      await register(registrationPayload);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { id: 1, label: 'Basic Info' },
    { id: 2, label: 'Academic Info' },
    { id: 3, label: 'Placement Info' },
    { id: 4, label: 'Finish' },
  ];

  const yearOptions = [
    { value: '', label: 'Select Year' },
    { value: '1', label: 'Year 1' },
    { value: '2', label: 'Year 2' },
    { value: '3', label: 'Year 3' },
    { value: '4', label: 'Year 4' },
    { value: '5', label: 'Year 5' },
  ];


  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] flex flex-col p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Register to get started</p>
        </div>

        {error && <div className="alert alert-error show">{error}</div>}

        {/* Step indicator */}
        <div className="flex items-center justify-between w-full mb-6 px-2">
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                    s.id === step
                      ? 'bg-primary text-white border-primary shadow-md'
                      : s.id < step
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-500 border-slate-300'
                  }`}
                >
                  {s.id < step ? '✓' : s.id}
                </div>
                <span
                  className={`mt-2 text-[11px] font-semibold text-center max-w-[70px] leading-tight hidden sm:block ${
                    s.id === step ? 'text-teal-900' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 rounded-full mx-2 ${
                    s.id < step ? 'bg-primary' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <label htmlFor="username" className={labelClass}>Username</label>
                <div className="relative">
                  <input type="text" id="username" className={inputClass} placeholder="Enter your username" autoComplete="username" value={form.username} onChange={(e) => setField('username', e.target.value)} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none flex items-center justify-center text-sm font-bold">@</span>
                </div>
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <div className="relative">
                  <input type="email" id="email" className={inputClass} placeholder="Enter your email" autoComplete="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none flex items-center justify-center text-xs">@</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className={labelClass}>First Name</label>
                  <input type="text" id="firstName" className={plainInputClass} placeholder="First name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>Last Name</label>
                  <input type="text" id="lastName" className={plainInputClass} placeholder="Last name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <CustomSelect id="register-role" value={form.role} onChange={(val) => setField('role', val)} options={['STUDENT', 'SUPERVISOR', 'COMPANY', 'ADMIN']} />
              </div>
              <div>
                <label htmlFor="password" className={labelClass}>Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} id="password" className={inputClass} placeholder="Enter your password" autoComplete="new-password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none flex items-center justify-center text-xs">🔒</span>
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" className={inputClass} placeholder="Confirm your password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none flex items-center justify-center text-xs">🔒</span>
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary transition-colors" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword((s) => !s)}>
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.agreeTerms} onChange={(e) => setField('agreeTerms', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                <span className="text-sm text-slate-600">I agree to the terms and conditions</span>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label htmlFor="registrationNumber" className={labelClass}>Registration Number</label>
                <input type="text" id="registrationNumber" className={plainInputClass} placeholder="Enter registration number" value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} />
              </div>
              <div>
                <label htmlFor="degreeProgram" className={labelClass}>Degree Program</label>
                <input type="text" id="degreeProgram" className={plainInputClass} placeholder="Enter degree program" value={form.degreeProgram} onChange={(e) => setField('degreeProgram', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Year of Study</label>
                <CustomSelect id="register-yearOfStudy" value={form.yearOfStudy} onChange={(val) => setField('yearOfStudy', val)} options={yearOptions} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label htmlFor="register-internshipCompany" className={labelClass}>Internship Company</label>
                <input
                  type="text"
                  id="register-internshipCompany"
                  list="company-list"
                  className={plainInputClass}
                  placeholder="Select or type company"
                  value={form.internshipCompany}
                  onChange={(e) => setField('internshipCompany', e.target.value)}
                />
                <datalist id="company-list">
                  {companies.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="register-universitySupervisor" className={labelClass}>University Supervisor</label>
                <input
                  type="text"
                  id="register-universitySupervisor"
                  list="supervisor-list"
                  className={plainInputClass}
                  placeholder="Select or type supervisor"
                  value={form.universitySupervisor}
                  onChange={(e) => setField('universitySupervisor', e.target.value)}
                />
                <datalist id="supervisor-list">
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.username} />
                  ))}
                </datalist>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Review Your Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Username', form.username],
                  ['Email', form.email],
                  ['Full Name', `${form.firstName} ${form.lastName}`],
                  ['Role', form.role],
                  ['Registration Number', form.registrationNumber],
                  ['Degree Program', form.degreeProgram],
                  ['Year of Study', form.yearOfStudy],
                  ['Internship Company', form.internshipCompany],
                  ['University Supervisor', form.universitySupervisor],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white rounded-lg p-3 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{label}</span>
                    <p className="text-sm text-slate-700 mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {step > 1 && (
              <button type="button" onClick={prevStep} className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors shadow-xs">
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={nextStep} disabled={step === 1 && !step1Valid} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                Next
              </button>
            ) : (
              <button type="submit" disabled={loading} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Creating Account...' : 'Submit Student'}
              </button>
            )}
          </div>
        </form>

        <div className="text-center mt-5 pt-5 border-t border-slate-200">
          <p className="text-xs text-slate-500 font-medium">
            <Link to="/login" className="text-primary font-semibold hover:underline">Already have an account? Sign in</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
