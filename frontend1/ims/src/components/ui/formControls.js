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

/**
 * The part every native control shares — surface, border, focus ring, motion.
 * Split out so the two densities below cannot drift apart in colour, which is
 * the part the design system actually cares about.
 *
 * `ds-control` is a marker, not a utility: App.css hangs the native-arrow
 * suppression off it. A <select> left at appearance:auto keeps the platform's
 * own arrow, and no Tailwind class can remove it, so without this marker a
 * correctly-coloured select still reads as unstyled. CustomSelect's <button>
 * carries the marker too and is unaffected, because those rules are scoped to
 * `select` — it draws its own chevron.
 */
const CONTROL_SURFACE =
  'ds-control bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs';

/** Default density: modals, filter bars and stacked forms. */
export const CONTROL_CLASS = `w-full ${CONTROL_SURFACE} text-xs px-3.5 py-2.5 font-medium`;

/**
 * Table-cell density. Same palette, 1px smaller padding, so a dropdown inside a
 * row of text does not force that row taller than its neighbours.
 */
export const COMPACT_CONTROL_CLASS = `w-full ${CONTROL_SURFACE} ds-control-sm text-xs px-2 py-1.5`;

/** Appended to either density for controls the user cannot currently act on. */
export const CONTROL_DISABLED_CLASS = 'disabled:opacity-60 disabled:cursor-not-allowed';
