import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CONTROL_CLASS } from '../ui/formControls';
import { createOpportunity } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * S3.4 (opportunity plan §7): the R8 submission form — the full field inventory
 * of §5.2–§5.4, grouped into collapsible sections so a 45-field submission reads
 * as six short ones, with a completeness meter over the whole inventory (R8:
 * "clear and complete enough to onboard someone" is a measurable claim, so the
 * form measures it).
 *
 * <p>Every control uses the shared {@link CONTROL_CLASS} token — no hand-written
 * classNames — because `formControls.test.js` guards exactly that, and a field
 * that invents its own look is how six select dialects happened the first time.
 *
 * <p>What the form deliberately does <b>not</b> collect: origin, status,
 * companyId, verification. Those are derived from the session on the server
 * [H5][H6][H8] (S3.1); a form that offered them would be teaching its user to
 * type a lie. The targeting section appears only for a university supervisor —
 * a company has no university whose schools it could name, and the server
 * refuses the claim anyway (§5.4, S3.1 test).
 *
 * <p>Submit sends whatever subset is filled: empties are dropped so the server
 * sees "unstated" (null) rather than empty strings, matching §5.3's rule that
 * an unstated stipend is not a zero stipend.
 */

const TEXT_FIELDS = [
  'location', 'requirements', 'externalOrgName', 'sourceKind', 'sourceReference',
  'responsibilities', 'deliverablesExpected', 'benefits', 'requiredSkills',
  'niceToHave', 'toolsTechnologies', 'safetyNotes',
  'workMode', 'country', 'city', 'addressDetail', 'startDate', 'endDate',
  'stipendCurrency', 'stipendPeriod',
  'targetSchoolIds', 'targetDepartmentIds', 'targetProgrammeIds',
  'targetYearOfStudy', 'targetDegreeLevels', 'eligibilityNotes',
  'contactPersonName', 'contactRole', 'contactEmail', 'contactPhone',
  'applicationInstructions', 'applicationEmail', 'applicationPhone',
  'applicationUrl', 'requiredAttachments',
];

const NUMBER_FIELDS = ['durationWeeks', 'stipendAmount', 'minCgpa', 'slots'];

/** Everything whose emptiness counts against completeness (booleans excluded). */
const METER_FIELDS = ['title', 'description', 'deadline', ...TEXT_FIELDS, ...NUMBER_FIELDS];

const EMPTY_FORM = {
  title: '',
  description: '',
  deadline: '',
  safetyOrientationRequired: false,
  isPaid: '',
  ...Object.fromEntries([...TEXT_FIELDS, ...NUMBER_FIELDS].map((key) => [key, ''])),
};

const SECTIONS = [
  { id: 'basics', title: 'The basics', subtitle: 'What the role is and who is behind it' },
  { id: 'awareness', title: 'Day-to-day & expectations', subtitle: 'What the student does, learns and stays safe doing' },
  { id: 'logistics', title: 'Logistics & stipend', subtitle: 'Where, when, how long, and what (if anything) it pays' },
  { id: 'audience', title: 'Who it is for', subtitle: 'Targeting — your university\'s schools, departments, programmes' },
  { id: 'contact', title: 'Contact person', subtitle: 'Who to ask before applying' },
  { id: 'apply', title: 'How to apply', subtitle: 'Where the application goes and what to attach' },
];

function buildPayload(form) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    deadline: form.deadline,
  };
  TEXT_FIELDS.forEach((key) => {
    const value = String(form[key]).trim();
    if (value !== '') payload[key] = value;
  });
  NUMBER_FIELDS.forEach((key) => {
    if (form[key] !== '') payload[key] = Number(form[key]);
  });
  if (form.isPaid !== '') payload.isPaid = form.isPaid === 'true';
  if (form.safetyOrientationRequired) payload.safetyOrientationRequired = true;
  return payload;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Section({ title, subtitle, open, onToggle, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{title}</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
      )}
    </section>
  );
}

export default function OpportunityForm() {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'SUPERVISOR';

  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(() => Object.fromEntries(SECTIONS.map((s) => [s.id, true])));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const filled = METER_FIELDS.filter((key) => String(form[key]).trim() !== '').length;
  const percent = Math.round((filled / METER_FIELDS.length) * 100);

  function set(key) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setForm((previous) => ({ ...previous, [key]: value }));
      setNotice('');
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const saved = await createOpportunity(buildPayload(form));
      setForm(EMPTY_FORM);
      setNotice(
        saved.status === 'PUBLISHED'
          ? `"${saved.title}" is live and will reach students when it is shared.`
          : `"${saved.title}" was submitted for review.`,
      );
    } catch (err) {
      setError(err.message || 'Unable to submit the opportunity.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Advertise an opportunity" className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Advertise an opportunity</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filled} of {METER_FIELDS.length} fields complete — a submission should onboard someone.
            </p>
          </div>
          <span className="text-sm font-bold text-teal-700 dark:text-teal-300" data-testid="completeness">
            {percent}%
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Submission completeness"
        >
          <div
            className="h-full bg-teal-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {notice && (
        <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm">
          {error}
        </div>
      )}

      <Section
        title={SECTIONS[0].title}
        subtitle={SECTIONS[0].subtitle}
        open={open.basics}
        onToggle={() => setOpen((o) => ({ ...o, basics: !o.basics }))}
      >
        <Field label="Title">
          <input className={CONTROL_CLASS} value={form.title} onChange={set('title')} maxLength={200} />
        </Field>
        <Field label="Deadline">
          <input type="date" className={CONTROL_CLASS} value={form.deadline} onChange={set('deadline')} />
        </Field>
        <Field label="Description">
          <textarea className={CONTROL_CLASS} rows={4} value={form.description} onChange={set('description')} />
        </Field>
        <Field label="Requirements">
          <textarea className={CONTROL_CLASS} rows={4} value={form.requirements} onChange={set('requirements')} />
        </Field>
        <Field label="Location">
          <input className={CONTROL_CLASS} value={form.location} onChange={set('location')} maxLength={200} />
        </Field>
        <Field label="External organisation" hint="Required when your account has no company behind it.">
          <input className={CONTROL_CLASS} value={form.externalOrgName} onChange={set('externalOrgName')} maxLength={200} />
        </Field>
        <Field label="Source kind">
          <select className={CONTROL_CLASS} value={form.sourceKind} onChange={set('sourceKind')}>
            <option value="">Not stated</option>
            <option value="COMPANY_DIRECT">Company direct</option>
            <option value="EXTERNAL_OFFER">External offer</option>
            <option value="UNIVERSITY_SOURCED">University sourced</option>
            <option value="SUPERVISOR_SOURCED">Supervisor sourced</option>
            <option value="REFERRAL">Referral</option>
          </select>
        </Field>
        <Field label="Source reference" hint="Where the offer was found — required for a sourced opportunity.">
          <input className={CONTROL_CLASS} value={form.sourceReference} onChange={set('sourceReference')} maxLength={500} />
        </Field>
      </Section>

      <Section
        title={SECTIONS[1].title}
        subtitle={SECTIONS[1].subtitle}
        open={open.awareness}
        onToggle={() => setOpen((o) => ({ ...o, awareness: !o.awareness }))}
      >
        <Field label="Responsibilities">
          <textarea className={CONTROL_CLASS} rows={3} value={form.responsibilities} onChange={set('responsibilities')} />
        </Field>
        <Field label="Deliverables expected">
          <textarea className={CONTROL_CLASS} rows={3} value={form.deliverablesExpected} onChange={set('deliverablesExpected')} />
        </Field>
        <Field label="Benefits">
          <textarea className={CONTROL_CLASS} rows={3} value={form.benefits} onChange={set('benefits')} />
        </Field>
        <Field label="Required skills">
          <textarea className={CONTROL_CLASS} rows={3} value={form.requiredSkills} onChange={set('requiredSkills')} />
        </Field>
        <Field label="Nice to have">
          <textarea className={CONTROL_CLASS} rows={3} value={form.niceToHave} onChange={set('niceToHave')} />
        </Field>
        <Field label="Tools & technologies">
          <input className={CONTROL_CLASS} value={form.toolsTechnologies} onChange={set('toolsTechnologies')} maxLength={500} />
        </Field>
        <Field label="Safety notes">
          <textarea className={CONTROL_CLASS} rows={3} value={form.safetyNotes} onChange={set('safetyNotes')} />
        </Field>
        <label className="flex items-center gap-2 sm:mt-6">
          <input
            type="checkbox"
            checked={form.safetyOrientationRequired}
            onChange={set('safetyOrientationRequired')}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600/20"
          />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Safety orientation required</span>
        </label>
      </Section>

      <Section
        title={SECTIONS[2].title}
        subtitle={SECTIONS[2].subtitle}
        open={open.logistics}
        onToggle={() => setOpen((o) => ({ ...o, logistics: !o.logistics }))}
      >
        <Field label="Work mode">
          <select className={CONTROL_CLASS} value={form.workMode} onChange={set('workMode')}>
            <option value="">On-site (default)</option>
            <option value="ONSITE">On-site</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </Field>
        <Field label="Country">
          <input className={CONTROL_CLASS} value={form.country} onChange={set('country')} maxLength={100} />
        </Field>
        <Field label="City">
          <input className={CONTROL_CLASS} value={form.city} onChange={set('city')} maxLength={100} />
        </Field>
        <Field label="Address detail">
          <input className={CONTROL_CLASS} value={form.addressDetail} onChange={set('addressDetail')} />
        </Field>
        <Field label="Duration (weeks)">
          <input type="number" min={1} className={CONTROL_CLASS} value={form.durationWeeks} onChange={set('durationWeeks')} />
        </Field>
        <Field label="Payment">
          <select className={CONTROL_CLASS} value={form.isPaid} onChange={set('isPaid')}>
            <option value="">Unstated</option>
            <option value="true">Paid</option>
            <option value="false">Unpaid</option>
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" className={CONTROL_CLASS} value={form.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="End date">
          <input type="date" className={CONTROL_CLASS} value={form.endDate} onChange={set('endDate')} />
        </Field>
        <Field label="Stipend amount">
          <input type="number" min={0} step="0.01" className={CONTROL_CLASS} value={form.stipendAmount} onChange={set('stipendAmount')} />
        </Field>
        <Field label="Stipend currency">
          <input className={CONTROL_CLASS} value={form.stipendCurrency} onChange={set('stipendCurrency')} maxLength={3} />
        </Field>
        <Field label="Stipend period">
          <select className={CONTROL_CLASS} value={form.stipendPeriod} onChange={set('stipendPeriod')}>
            <option value="">Not stated</option>
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="TOTAL">Total</option>
          </select>
        </Field>
      </Section>

      {isSupervisor && (
        <Section
          title={SECTIONS[3].title}
          subtitle={SECTIONS[3].subtitle}
          open={open.audience}
          onToggle={() => setOpen((o) => ({ ...o, audience: !o.audience }))}
        >
          <Field label="Target school ids" hint="Comma-separated ids from your university's schools.">
            <input className={CONTROL_CLASS} value={form.targetSchoolIds} onChange={set('targetSchoolIds')} />
          </Field>
          <Field label="Target department ids" hint="Comma-separated.">
            <input className={CONTROL_CLASS} value={form.targetDepartmentIds} onChange={set('targetDepartmentIds')} />
          </Field>
          <Field label="Target programme ids" hint="Comma-separated.">
            <input className={CONTROL_CLASS} value={form.targetProgrammeIds} onChange={set('targetProgrammeIds')} />
          </Field>
          <Field label="Target years of study" hint="Comma-separated, e.g. 2, 3.">
            <input className={CONTROL_CLASS} value={form.targetYearOfStudy} onChange={set('targetYearOfStudy')} />
          </Field>
          <Field label="Target degree levels" hint="Comma-separated, e.g. UNDERGRADUATE.">
            <input className={CONTROL_CLASS} value={form.targetDegreeLevels} onChange={set('targetDegreeLevels')} />
          </Field>
          <Field label="Minimum CGPA">
            <input type="number" min={0} max={5} step="0.01" className={CONTROL_CLASS} value={form.minCgpa} onChange={set('minCgpa')} />
          </Field>
          <Field label="Slots">
            <input type="number" min={0} className={CONTROL_CLASS} value={form.slots} onChange={set('slots')} />
          </Field>
          <Field label="Eligibility notes">
            <textarea className={CONTROL_CLASS} rows={3} value={form.eligibilityNotes} onChange={set('eligibilityNotes')} />
          </Field>
        </Section>
      )}

      <Section
        title={SECTIONS[4].title}
        subtitle={SECTIONS[4].subtitle}
        open={open.contact}
        onToggle={() => setOpen((o) => ({ ...o, contact: !o.contact }))}
      >
        <Field label="Contact person">
          <input className={CONTROL_CLASS} value={form.contactPersonName} onChange={set('contactPersonName')} maxLength={150} />
        </Field>
        <Field label="Contact role">
          <input className={CONTROL_CLASS} value={form.contactRole} onChange={set('contactRole')} maxLength={100} />
        </Field>
        <Field label="Contact email">
          <input type="email" className={CONTROL_CLASS} value={form.contactEmail} onChange={set('contactEmail')} maxLength={200} />
        </Field>
        <Field label="Contact phone">
          <input className={CONTROL_CLASS} value={form.contactPhone} onChange={set('contactPhone')} maxLength={50} />
        </Field>
      </Section>

      <Section
        title={SECTIONS[5].title}
        subtitle={SECTIONS[5].subtitle}
        open={open.apply}
        onToggle={() => setOpen((o) => ({ ...o, apply: !o.apply }))}
      >
        <Field label="Application instructions">
          <textarea className={CONTROL_CLASS} rows={3} value={form.applicationInstructions} onChange={set('applicationInstructions')} />
        </Field>
        <Field label="Application email">
          <input type="email" className={CONTROL_CLASS} value={form.applicationEmail} onChange={set('applicationEmail')} maxLength={200} />
        </Field>
        <Field label="Application phone">
          <input className={CONTROL_CLASS} value={form.applicationPhone} onChange={set('applicationPhone')} maxLength={50} />
        </Field>
        <Field label="Application url">
          <input className={CONTROL_CLASS} value={form.applicationUrl} onChange={set('applicationUrl')} maxLength={500} />
        </Field>
        <Field label="Required attachments" hint="A note about what the applicant must attach — files themselves are added after submission.">
          <textarea className={CONTROL_CLASS} rows={3} value={form.requiredAttachments} onChange={set('requiredAttachments')} />
        </Field>
      </Section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit opportunity'}
        </button>
      </div>
    </form>
  );
}
