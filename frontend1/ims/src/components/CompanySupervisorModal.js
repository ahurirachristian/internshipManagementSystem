import { useEffect, useState } from 'react';
import { User, X } from 'lucide-react';

/**
 * PC4: field-supervisor create/edit for the company dashboard.
 *
 * <p>The reference component had seven inputs. P6's endpoint persists five, so
 * this form has five too:
 *
 * <ul>
 *   <li>`username` — not an input. P6 derives it from the name and guarantees
 *       uniqueness server-side; letting the browser pick it would reintroduce
 *       the collision the service already resolves.</li>
 *   <li>`role` — not an input. P6 creates every field supervisor as a
 *       INDUSTRIAL_SUPERVISOR user scoped to the company. A free-text "Role / Job Title"
 *       field would look like it sets the access role and silently not.</li>
 * </ul>
 *
 * <p>What remains maps one-to-one onto `POST /api/companies/me/supervisors`.
 */
export default function CompanySupervisorModal({ supervisor, title, onClose, onSubmit }) {
  const [form, setForm] = useState({
    firstName: supervisor?.firstName || '',
    lastName: supervisor?.lastName || '',
    email: supervisor?.email || '',
    phoneNumber: supervisor?.phoneNumber || '',
    department: supervisor?.department || '',
  });
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
    if (supervisor && Object.values(form).every((value) => !value.trim())) {
      setError('Nothing to save — every field is blank.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phoneNumber.trim() || null,
        department: form.department.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save the field supervisor.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-xs font-medium';
  const labelClass =
    'block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supervisor-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="supervisor-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Field supervisor details for your company
              </p>
            </div>
          </div>
          <button
            type="button"
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
            className="mx-4 sm:mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm"
          >
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
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

          {!supervisor && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Their login username is generated from their name. The temporary password
              follows the <code>username123</code> pattern and must be changed at first sign-in.
            </p>
          )}
        </form>

        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors shadow-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={busy}
            className="px-3.5 py-2 rounded-xl bg-primary hover:opacity-90 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving...' : 'Save Field Supervisor'}
          </button>
        </div>
      </div>
    </div>
  );
}
