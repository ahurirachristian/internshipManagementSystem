import { useEffect, useState } from 'react';
import { User, X } from 'lucide-react';

export default function CompanySupervisorModal({ supervisor, title, onClose, onSubmit }) {
  const [form, setForm] = useState(
    supervisor
      ? {
          firstName: supervisor.firstName || '',
          lastName: supervisor.lastName || '',
          email: supervisor.email || '',
          username: supervisor.username || '',
          role: supervisor.role || supervisor.jobTitle || '',
          department: supervisor.department || '',
          phoneNumber: supervisor.contact || supervisor.phoneNumber || '',
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          role: '',
          department: '',
          phoneNumber: '',
        }
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

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.firstName.trim()) {
      setError('First name is required.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        username: form.username.trim() || null,
        email: form.email.trim() || null,
        role: form.role.trim() || null,
        department: form.department.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save staff member.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supervisor-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="supervisor-modal-title" className="text-base font-bold text-slate-900 truncate">
                {title}
              </h3>
              <p className="text-xs text-slate-500 truncate">Field supervisor details for your company</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 sm:mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm animate-in fade-in"
          >
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="sup-first" className={labelClass}>
                First Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="sup-first"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                className={inputClass}
                placeholder="e.g. Jane"
              />
            </div>
            <div>
              <label htmlFor="sup-last" className={labelClass}>
                Last Name
              </label>
              <input
                id="sup-last"
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                className={inputClass}
                placeholder="e.g. Doe"
              />
            </div>
            <div>
              <label htmlFor="sup-email" className={labelClass}>
                Email Address
              </label>
              <input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className={inputClass}
                placeholder="e.g. jane.doe@company.com"
              />
            </div>
            <div>
              <label htmlFor="sup-username" className={labelClass}>
                Login Username
              </label>
              <input
                id="sup-username"
                value={form.username}
                onChange={(e) => setField('username', e.target.value)}
                className={inputClass}
                placeholder="e.g. jane (auto-generated if blank)"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">
                Used to create a login for this field supervisor.
              </p>
            </div>
            <div>
              <label htmlFor="sup-role" className={labelClass}>
                Role / Job Title
              </label>
              <input
                id="sup-role"
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                className={inputClass}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div>
              <label htmlFor="sup-contact" className={labelClass}>
                Contact / Phone Number
              </label>
              <input
                id="sup-contact"
                value={form.phoneNumber}
                onChange={(e) => setField('phoneNumber', e.target.value)}
                className={inputClass}
                placeholder="e.g. +256701234567"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="sup-dept" className={labelClass}>
                Department
              </label>
              <input
                id="sup-dept"
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                className={inputClass}
                placeholder="e.g. Technology"
              />
            </div>
          </div>
        </form>

        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors shadow-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={busy}
            className="px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving...' : 'Save Field Supervisor'}
          </button>
        </div>
      </div>
    </div>
  );
}
