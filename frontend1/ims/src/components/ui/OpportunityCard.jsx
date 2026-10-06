import { Calendar, MapPin } from 'lucide-react';
import { StatusPill } from './StatusPill';

/**
 * S7.1 (opportunity plan §7): the one advert card every audience renders.
 *
 * <p><b>Field visibility is the whole point.</b> The card receives the same
 * opportunity object for every caller and decides — by the `audience` prop —
 * which blocks the viewer is entitled to, so a consumer cannot leak a field by
 * passing richer data than its user should see: the student's feed shape and
 * the super admin's full row both flow through here, and only the blocks the
 * matrix allows come back out. Anything the matrix does not name (an unknown
 * or missing audience) falls back to the shared core alone — default-deny,
 * mirroring the server's 404-not-403 posture [H3].
 *
 * <p>The matrix, and where each block comes from:
 *
 * <ul>
 *   <li><b>Shared core</b> — title, status, location, deadline, work mode,
 *       advertising organisation, description. Everything the server put in
 *       the S6.4 feed, so it is safe for every audience.</li>
 *   <li><b>Provenance</b> (`origin`) — the advertising side only
 *       (COMPANY/SUPERVISOR/ADMIN). A student never asks "which company";
 *       their feed item arrives through their university's share.</li>
 *   <li><b>Verification</b> (`verificationStatus`/`verificationNote`) — the
 *       advertising side only: the verdict belongs to the submitter and the
 *       moderator [H6], never to an end viewer.</li>
 *   <li><b>Targeting</b> (`targetProgrammeIds`/`targetYearOfStudy`) — the
 *       advertising side only; a student's targeting is enforced server-side
 *       and expressed by which cards appear, never by rendering internal
 *       academic ids at them.</li>
 *   <li><b>Student context</b> (`shareNote`/`sharedAt`/`applied`/
 *       `applicationCount`) — STUDENT only: why this reached *them*, and
 *       zero-filled application facts [§2.6].</li>
 * </ul>
 *
 * <p>The card is presentational: consumers pass their own controls as
 * `children` (Apply, Verify/Reject, Share) and keep every decision in their
 * own container, exactly like `VacanciesSection` keeps `handleApply`.
 */
export default function OpportunityCard({ opportunity, audience, children }) {
  const item = opportunity || {};
  const entitled = AUDIENCE_ENTITLEMENTS[audience];
  const see = (block) => Boolean(entitled && entitled[block]);

  const programmeChips = csvChips(item.targetProgrammeIds);
  const yearChips = csvChips(item.targetYearOfStudy);

  return (
    <article
      aria-label={`Opportunity ${item.id ?? ''}`.trim()}
      className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {item.title}
            </h3>
            {item.status && <StatusPill status={item.status} />}
          </div>
          {item.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">
              {item.description}
            </p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" aria-hidden="true" />
                {item.location}
              </span>
            )}
            {item.deadline && (
              <span className="inline-flex items-center gap-1 ml-2">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Closes {item.deadline}
              </span>
            )}
            {item.workMode && <span className="ml-2">{item.workMode}</span>}
            {item.externalOrgName && <span className="ml-2">{item.externalOrgName}</span>}
          </p>
        </div>
      </div>

      {/* Student context — why this advert is in *your* feed [§2.6 zero-fill]. */}
      {see('studentContext') && (item.shareNote || item.sharedAt) && (
        <p className="text-xs text-teal-800 dark:text-teal-300 mt-3" aria-label="Shared with you">
          {item.shareNote || 'Shared with your university'}
          {item.sharedAt ? ` · ${String(item.sharedAt).slice(0, 10)}` : ''}
        </p>
      )}
      {see('studentContext') && (item.applied || typeof item.applicationCount === 'number') && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {item.applied && (
            <span className="px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[11px] font-bold text-teal-800 dark:text-teal-300">
              Applied
            </span>
          )}
          {typeof item.applicationCount === 'number' && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {item.applicationCount} applicant{item.applicationCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      {/* Provenance — the advertising side only. */}
      {see('provenance') && item.origin && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2" aria-label="Provenance">
          Origin: {ORIGIN_LABELS[item.origin] || item.origin}
          {item.companyId != null ? ` · Company #${item.companyId}` : ''}
        </p>
      )}

      {/* Verdict trail — submitter and moderator only [H6]. */}
      {see('verification') && item.verificationStatus && (
        <div className="mt-3 text-xs" aria-label="Verification">
          <span className="font-bold text-slate-800 dark:text-slate-200">Verification: </span>
          <span className="text-slate-600 dark:text-slate-300">{item.verificationStatus}</span>
          {item.verificationNote && (
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              {item.verificationNote}
            </p>
          )}
        </div>
      )}

      {/* Targeting — advertising side only; empty CSV means everyone [§5.8]. */}
      {see('targeting') && (
        <div className="mt-3" aria-label="Targeting">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Targeting
          </span>
          {programmeChips.length === 0 && yearChips.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Open to all programmes
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {programmeChips.map((chip) => (
                <span
                  key={`programme-${chip}`}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                >
                  Programme {chip}
                </span>
              ))}
              {yearChips.map((chip) => (
                <span
                  key={`year-${chip}`}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                >
                  Year {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {children && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          {children}
        </div>
      )}
    </article>
  );
}

const ORIGIN_LABELS = {
  COMPANY: 'Company',
  SUPERVISOR: 'Supervisor',
  UNIVERSITY: 'University',
  SUPER_ADMIN: 'Super admin',
};

/**
 * The entitlement matrix — every block beyond the shared core is denied until
 * an audience is named here. Exported so a test can pin the whole policy in
 * one table instead of one render per cell.
 */
export const AUDIENCE_ENTITLEMENTS = {
  STUDENT: {
    provenance: false,
    verification: false,
    targeting: false,
    studentContext: true,
  },
  COMPANY: {
    provenance: true,
    verification: true,
    targeting: true,
    studentContext: false,
  },
  SUPERVISOR: {
    provenance: true,
    verification: true,
    targeting: true,
    studentContext: false,
  },
  ADMIN: {
    provenance: true,
    verification: true,
    targeting: true,
    studentContext: false,
  },
};

/** Comma-separated id columns arrive as strings; render only non-blank parts. */
function csvChips(csv) {
  if (typeof csv !== 'string' || csv.trim() === '') {
    return [];
  }
  return csv
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}
