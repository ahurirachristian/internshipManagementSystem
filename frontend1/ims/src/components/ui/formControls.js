/**
 * Canonical styling for native form controls — <select> and the date/time inputs.
 *
 * These classes were copy-pasted per field, which is how six different "select"
 * dialects ended up across the app (2px borders, slate-50 fills, missing dark
 * mode, bare browser defaults). One definition here means a control added later
 * picks up the design system instead of inventing a new look, and a palette
 * change lands everywhere at once.
 *
 * Verbatim from the audit-log filter controls, which were the reference look.
 * Note the controls a file shares between <select> and <input> keep their own
 * class: changing an input's appearance is a separate decision, so those files
 * reference CONTROL_CLASS on the <select> alone.
 */
export const CONTROL_CLASS =
  'w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium';

/** Appended to CONTROL_CLASS for controls the user cannot currently act on. */
export const CONTROL_DISABLED_CLASS = 'disabled:opacity-60 disabled:cursor-not-allowed';
