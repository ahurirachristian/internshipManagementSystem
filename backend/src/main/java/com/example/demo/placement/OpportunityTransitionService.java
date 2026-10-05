package com.example.demo.placement;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.notification.NotificationService;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * S2.1 (opportunity plan §8.3): one transition engine for the advert and its three
 * relay records, copied in shape from {@code ApplicationService}'s closed
 * {@code EnumMap} so every relay answers the same three questions in the same order:
 *
 * <ol>
 *   <li><b>Scope first — out of scope is 404.</b> An id the caller has no business
 *       knowing about ({@code NoSuchElementException}) never reveals that it exists,
 *       so a rival company or another university learns nothing by probing [H9].</li>
 *   <li><b>Then role — 403.</b> {@code AccessDeniedException} for a caller who can see
 *       the row but is not the persona the vocabulary reserves the move for: verifying
 *       and closing an advert is the super admin's alone [H6]; the relay answers
 *       (accept / decline / review / share / close) belong to the university's own
 *       supervisors, which is why even a super admin gets 403 there — the API gates
 *       in §6.3 are {@code SUPERVISOR} and this service mirrors them.</li>
 *   <li><b>Then legality — 409.</b> The closed tables below decide. Anything not
 *       listed, including every move out of a terminal state and every no-op, is
 *       {@code IllegalStateException}. Terminal states map to an empty list on
 *       purpose so a late edit cannot resurrect a closed record.</li>
 * </ol>
 *
 * <p>Order matters and is asserted by {@link OpportunityTransitionTest}: a foreign
 * supervisor probing an offer id gets 404, not 403, because scope is decided before
 * role ever looks at the target.
 *
 * <p>Every successful transition appends one {@link OpportunityStatusHistory} row
 * with the statuses stored as plain strings (§5.10 — the trail outlives the
 * vocabulary). Illegal attempts write nothing at all: the exception is thrown before
 * the row is touched.
 *
 * <p><b>S2.2: every transition also emits exactly one notification and one audit
 * row, from here — never from a controller</b> (matching
 * {@code PlacementPipelineService}'s history→notify→audit ordering, so a caller
 * cannot perform a transition without its side effects). The recipients are the
 * counterparties named in the §9 catalog where the catalog covers the event:
 * verified/rejected → the submitter, an answered offer → the super admins. Where
 * the catalog assigns an audience that needs targeting — students on a closed share
 * [H11] — the fan-out deliberately arrives with the step that owns it (S6.5/S6.6);
 * until then the sharing university's supervisors are told, so the side effect is
 * still exactly one notification per transition.
 *
 * <p>Advert scope note: {@code vacancies} carries no {@code university_id} column, so
 * a supervisor's claim on an advert is derived from the relay rows that link their
 * university to it (a submission or a share). <b>Seeing is not acting, and that is
 * why this is not simply {@link OpportunityAudienceResolver#canSee}:</b> a student
 * may see a shared advert and must never withdraw it; a university offered another
 * company's advert may see it and must never pull it. The resolver (S2.3) answers
 * every <i>read</i> from Phase 3 on; this engine keeps the stricter <i>action</i>
 * scope so no read predicate ever becomes a write grant by default.
 */
@Service
@Transactional
public class OpportunityTransitionService {

    // --- The four closed transition tables (plan §5.6, §5.7–§5.9) ---

    /**
     * Advert: {@code PENDING_REVIEW} verifies to {@code PUBLISHED} or falls to
     * {@code REJECTED}; whoever put it up may pull it with {@code WITHDRAWN} while it
     * lives; a live advert winds down to {@code CLOSED}. Terminal: {@code REJECTED},
     * {@code WITHDRAWN}, {@code CLOSED}, {@code EXPIRED} — {@code EXPIRED} is computed
     * from the deadline and never stored, but it still has to answer as terminal.
     */
    private static final Map<Vacancy.Status, List<Vacancy.Status>> ADVERT = new EnumMap<>(Vacancy.Status.class);

    /**
     * Offer (super admin → university): answered, then shared or stood down.
     * {@code SHARED} is deliberately not terminal — the university accepted and then
     * shared, and may later close while its acceptance still stands.
     */
    private static final Map<OpportunityOffer.Status, List<OpportunityOffer.Status>> OFFER =
            new EnumMap<>(OpportunityOffer.Status.class);

    /** Share (university → students): a broadcast, and the only thing that can happen to a broadcast is that it is called off. */
    private static final Map<OpportunityShare.Status, List<OpportunityShare.Status>> SHARE =
            new EnumMap<>(OpportunityShare.Status.class);

    /**
     * Submission (supervisor → university): one hop of review. {@code APPROVED} has no
     * further transitions — it is the gate that unlocks sharing (S6.3), not a state
     * that keeps moving; {@code REJECTED} is terminal per §5.9.
     */
    private static final Map<OpportunitySubmission.Status, List<OpportunitySubmission.Status>> SUBMISSION =
            new EnumMap<>(OpportunitySubmission.Status.class);

    static {
        ADVERT.put(Vacancy.Status.PENDING_REVIEW, List.of(
                Vacancy.Status.PUBLISHED, Vacancy.Status.REJECTED, Vacancy.Status.WITHDRAWN));
        ADVERT.put(Vacancy.Status.PUBLISHED, List.of(
                Vacancy.Status.CLOSED, Vacancy.Status.WITHDRAWN));
        ADVERT.put(Vacancy.Status.REJECTED, List.of());
        ADVERT.put(Vacancy.Status.WITHDRAWN, List.of());
        ADVERT.put(Vacancy.Status.CLOSED, List.of());
        ADVERT.put(Vacancy.Status.EXPIRED, List.of());

        OFFER.put(OpportunityOffer.Status.OFFERED, List.of(
                OpportunityOffer.Status.ACCEPTED, OpportunityOffer.Status.DECLINED));
        OFFER.put(OpportunityOffer.Status.ACCEPTED, List.of(
                OpportunityOffer.Status.SHARED, OpportunityOffer.Status.CLOSED));
        OFFER.put(OpportunityOffer.Status.SHARED, List.of(OpportunityOffer.Status.CLOSED));
        OFFER.put(OpportunityOffer.Status.DECLINED, List.of());
        OFFER.put(OpportunityOffer.Status.CLOSED, List.of());

        SHARE.put(OpportunityShare.Status.SHARED, List.of(OpportunityShare.Status.CLOSED));
        SHARE.put(OpportunityShare.Status.CLOSED, List.of());

        SUBMISSION.put(OpportunitySubmission.Status.PENDING, List.of(
                OpportunitySubmission.Status.APPROVED, OpportunitySubmission.Status.REJECTED));
        SUBMISSION.put(OpportunitySubmission.Status.APPROVED, List.of());
        SUBMISSION.put(OpportunitySubmission.Status.REJECTED, List.of());
    }

    private final VacancyRepository vacancyRepository;
    private final OpportunityOfferRepository offerRepository;
    private final OpportunityShareRepository shareRepository;
    private final OpportunitySubmissionRepository submissionRepository;
    private final OpportunityStatusHistoryRepository historyRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final DepartmentRepository departmentRepository;
    private final ProgrammeRepository programmeRepository;

    public OpportunityTransitionService(VacancyRepository vacancyRepository,
            OpportunityOfferRepository offerRepository, OpportunityShareRepository shareRepository,
            OpportunitySubmissionRepository submissionRepository,
            OpportunityStatusHistoryRepository historyRepository,
            NotificationService notificationService, AuditLogService auditLogService,
            UserRepository userRepository, StudentRepository studentRepository,
            DepartmentRepository departmentRepository, ProgrammeRepository programmeRepository) {
        this.vacancyRepository = vacancyRepository;
        this.offerRepository = offerRepository;
        this.shareRepository = shareRepository;
        this.submissionRepository = submissionRepository;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.departmentRepository = departmentRepository;
        this.programmeRepository = programmeRepository;
    }

    // --- Advert transitions -------------------------------------------------

    /**
     * One advert transition: scope → role → legality, then the status change and its
     * history row. The timestamps that belong to the move are recorded here because
     * nothing else writes them: {@code published_at} when it goes live,
     * {@code reviewed_at} when the moderator decides, {@code updated_at} always.
     *
     * <p>Two-argument form kept for the moves that carry no verdict (withdraw,
     * close) — it delegates with a null note, which the verdict branch refuses.
     */
    public Vacancy transitionAdvert(UserEntity actor, Long vacancyId, Vacancy.Status target) {
        return transitionAdvert(actor, vacancyId, target, null);
    }

    /**
     * S4.2: the same engine with the verdict's paperwork attached. A
     * {@code PENDING_REVIEW} advert moving to {@code PUBLISHED} or
     * {@code REJECTED} is a legitimacy decision and therefore requires a
     * non-blank note of at most 500 characters (D7: binary verdict, required
     * note) — missing note → 400 via {@code GlobalExceptionHandler}. The check
     * runs <i>after</i> legality, so an illegal jump still answers 409 and the
     * closed map never yields to request validation.
     *
     * <p>On a verdict the engine also records who judged and why:
     * {@code verification_status} → {@code VERIFIED}/{@code REJECTED},
     * {@code verified_by}/{@code verified_at}, {@code verification_note} — the
     * [H6] trail the inbox queue then reads (the row leaves
     * {@code UNVERIFIED} and can never re-enter).
     */
    public Vacancy transitionAdvert(UserEntity actor, Long vacancyId, Vacancy.Status target, String verificationNote) {
        Vacancy advert = vacancyRepository.findById(vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Opportunity not found."));
        requireAdvertScope(actor, advert);
        requireAdvertRole(actor, target);

        Vacancy.Status from = advert.getStatus();
        requireLegal(ADVERT.get(from), from, target, "advert");

        boolean verdict = from == Vacancy.Status.PENDING_REVIEW
                && (target == Vacancy.Status.PUBLISHED || target == Vacancy.Status.REJECTED);
        if (verdict) {
            requireVerificationNote(verificationNote);
        }

        advert.setStatus(target);
        advert.setUpdatedAt(LocalDateTime.now());
        if (target == Vacancy.Status.PUBLISHED && advert.getPublishedAt() == null) {
            advert.setPublishedAt(LocalDateTime.now());
        }
        if (verdict) {
            advert.setReviewedAt(LocalDateTime.now());
            advert.setVerificationStatus(target == Vacancy.Status.PUBLISHED
                    ? Vacancy.VerificationStatus.VERIFIED
                    : Vacancy.VerificationStatus.REJECTED);
            advert.setVerifiedBy(actor.getId());
            advert.setVerifiedAt(LocalDateTime.now());
            advert.setVerificationNote(verificationNote);
        }
        Vacancy saved = vacancyRepository.save(advert);

        record(saved.getId(), null, null, from, target, actor);
        notifyAdvertOriginator(saved, target);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "OPPORTUNITY_STATUS",
                "Vacancy", "Opportunity " + saved.getId() + ": " + from + " -> " + target, null);
        return saved;
    }

    /** D7: the verdict is binary and its reason is part of the verdict. */
    private void requireVerificationNote(String note) {
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException(
                    "A verification note is required — record why the advert was approved or rejected.");
        }
        if (note.length() > 500) {
            throw new IllegalArgumentException("A verification note may not exceed 500 characters.");
        }
    }

    /**
     * Advert scope: the super admin and the admin role see every advert; a company
     * sees only its own submissions ({@code origin=COMPANY} and its own id — never
     * another company's [H1]); a supervisor only an advert their university is linked
     * to through a submission or a share, and only for the university/supervisor
     * origins they can have put there. A student, a field supervisor, or anyone else
     * is simply not in scope: 404, never 403 [H3-style non-disclosure].
     */
    private void requireAdvertScope(UserEntity actor, Vacancy advert) {
        if (isSuperAdmin(actor) || "ADMIN".equals(actor.getRole().name())) {
            return;
        }
        if ("COMPANY".equals(actor.getRole().name())) {
            boolean ownSubmission = advert.getOrigin() == Vacancy.Origin.COMPANY
                    && actor.getCompanyId() != null
                    && actor.getCompanyId().equals(advert.getCompanyId());
            if (ownSubmission) {
                return;
            }
            throw notFoundAdvert();
        }
        if ("SUPERVISOR".equals(actor.getRole().name()) && actor.getUniversityId() != null) {
            boolean universityOrigin = advert.getOrigin() == Vacancy.Origin.SUPERVISOR
                    || advert.getOrigin() == Vacancy.Origin.UNIVERSITY;
            boolean linked = submissionRepository.findByVacancyId(advert.getId())
                    .map(s -> actor.getUniversityId().equals(s.getUniversityId()))
                    .orElse(false)
                    || shareRepository.findByVacancyIdAndUniversityId(advert.getId(), actor.getUniversityId())
                            .isPresent();
            if (universityOrigin && linked) {
                return;
            }
            throw notFoundAdvert();
        }
        throw notFoundAdvert();
    }

    /**
     * Advert role: verification decisions ({@code PUBLISHED}, {@code REJECTED}) and
     * {@code CLOSED} are the super admin's alone [H6] — a company must not be able to
     * wave through its own advert, and a plain {@code ADMIN} without the
     * {@code super_admin} flag is not a moderator either. {@code WITHDRAWN} is the
     * originator pulling their own advert back, which scope has already proven. Any
     * other target falls through to the legality check, which answers 409.
     */
    private void requireAdvertRole(UserEntity actor, Vacancy.Status target) {
        if (isSuperAdmin(actor)) {
            return;
        }
        if (target == Vacancy.Status.PUBLISHED || target == Vacancy.Status.REJECTED
                || target == Vacancy.Status.CLOSED) {
            throw new AccessDeniedException("Only a super admin can verify or close an advert.");
        }
        // WITHDRAWN: the originator pulls it — scope already proved the caller is one.
    }

    // --- Offer transitions --------------------------------------------------

    /**
     * One offer transition. The row is locked first ({@code findByIdForUpdate},
     * copied from S1.2) so two supervisors answering the same offer at once cannot
     * both succeed.
     */
    public OpportunityOffer transitionOffer(UserEntity actor, Long offerId, OpportunityOffer.Status target) {
        return transitionOffer(actor, offerId, target, null);
    }

    /**
     * S5.2 (plan §6.3): {@code POST /{id}/offers/{offerId}/respond} — the
     * university's answer to one offer.
     *
     * <p>The path's advert id is an *anchor*, not decoration: an offer whose
     * {@code vacancyId} differs from the path's {@code {id}} does not exist in
     * this URL — 404, before scope or role — so an offer id cannot be replayed
     * under another advert's path and the endpoint stays answerable only in the
     * shape the plan specifies. From there it is the same engine as every other
     * relay move: scope 404 [H9] → SUPERVISOR-only 403 → legality 409 → the
     * optional note's length 400.
     */
    public OpportunityOffer respondToOffer(UserEntity actor, Long vacancyId, Long offerId,
            OpportunityOffer.Status target, String responseNote) {
        OpportunityOffer offer = offerRepository.findByIdForUpdate(offerId)
                .orElseThrow(() -> new NoSuchElementException("Offer not found."));
        if (!offer.getVacancyId().equals(vacancyId)) {
            throw new NoSuchElementException("Offer not found.");
        }
        return applyOfferTransition(actor, offer, target, responseNote);
    }

    /**
     * S5.2: the same engine with the university's answer attached. A response
     * note is optional here — unlike the D7 verdict it records the university's
     * reasoning rather than a legitimacy decision — but when present it must fit
     * the §5.7 column (≤500 chars, 400 otherwise). The check runs *before* the
     * row is touched, so a refusal leaves the offer answered nothing at all.
     *
     * <p>The answer itself ({@code ACCEPTED}/{@code DECLINED}) is the only part
     * the endpoint accepts; anything else was already rejected at the door, and
     * a second answer is the closed map's 409.
     */
    public OpportunityOffer transitionOffer(UserEntity actor, Long offerId,
            OpportunityOffer.Status target, String responseNote) {
        OpportunityOffer offer = offerRepository.findByIdForUpdate(offerId)
                .orElseThrow(() -> new NoSuchElementException("Offer not found."));
        return applyOfferTransition(actor, offer, target, responseNote);
    }

    /** Scope → role → legality → note, then the write and its two side effects. */
    private OpportunityOffer applyOfferTransition(UserEntity actor, OpportunityOffer offer,
            OpportunityOffer.Status target, String responseNote) {
        requireOfferScope(actor, offer);
        requireUniversitySupervisor(actor, "Only a university supervisor can act on an offer.");

        OpportunityOffer.Status from = offer.getStatus();
        requireLegal(OFFER.get(from), from, target, "offer");
        if (responseNote != null && responseNote.length() > 500) {
            throw new IllegalArgumentException("A response note may not exceed 500 characters.");
        }

        offer.setStatus(target);
        if (target == OpportunityOffer.Status.ACCEPTED || target == OpportunityOffer.Status.DECLINED) {
            offer.setRespondedBy(actor.getId());
            offer.setRespondedAt(LocalDateTime.now());
            if (responseNote != null && !responseNote.isBlank()) {
                offer.setResponseNote(responseNote.trim());
            }
        }
        OpportunityOffer saved = offerRepository.save(offer);

        record(saved.getVacancyId(), saved.getUniversityId(),
                OpportunityStatusHistory.RELAY_OFFER, from, target, actor);
        notifySuperAdminsAboutOffer(saved, target);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "OPPORTUNITY_OFFER_STATUS",
                "OpportunityOffer",
                "Offer " + saved.getId() + " (university " + saved.getUniversityId() + "): "
                        + from + " -> " + target, null);
        return saved;
    }

    /**
     * Offer scope: the super admin who made the offer, or a caller whose own
     * university is the one it addresses. Another university's offer id does not
     * exist as far as its supervisors are concerned — 404, not 403 [H9], so the
     * endpoint cannot be used to probe which adverts are being offered where.
     */
    private void requireOfferScope(UserEntity actor, OpportunityOffer offer) {
        if (isSuperAdmin(actor)) {
            return;
        }
        if (actor.getUniversityId() != null && actor.getUniversityId().equals(offer.getUniversityId())) {
            return;
        }
        throw new NoSuchElementException("Offer not found.");
    }

    // --- Share transitions --------------------------------------------------

    /**
     * S6.3 (plan §6.3): {@code POST /{id}/share} — the university puts an
     * advert in front of its own students (R4/R5/R6).
     *
     * <p><b>Who may share is decided by the relay rows, never by the body</b>
     * [H7][H9], scope-first as everywhere else — no claim at all is 404
     * before any state question is asked:
     *
     * <ol>
     *   <li><b>Offer (R4/R2)</b> — an offer addressed to this session's
     *       university puts it in scope, and the offer must be
     *       {@code ACCEPTED}: an offer that was never accepted cannot carry
     *       the university's students into somebody else's broadcast (409 —
     *       the S6.1 test deferred to this step).</li>
     *   <li><b>Submission (R6)</b> — this university's own proposal row puts
     *       it in scope, and it must be {@code APPROVED} first (409 — the
     *       guard S6.2 deferred to here: a supervisor cannot push their own
     *       submission into the feed without the review hop).</li>
     *   <li><b>University-sourced (R5)</b> — no offer and no submission: the
     *       claim is the advert's own {@code verified_by}, which S3.1 wrote
     *       from the session that sourced it. That creator's university —
     *       read server-side from {@code users} — may share; any other
     *       university gets 404, so R5's "own university only" rule survives
     *       {@code vacancies} carrying no university column (D1).</li>
     * </ol>
     *
     * <p><b>The body may narrow the audience, never widen it</b> (§5.8): the
     * targeting is checked twice, both before anything is written — the ids
     * must belong to the session's own university [H7], and the resulting
     * audience must be a subset of the advert's own targeting (an untargeted
     * advert means the whole university, so anything goes there; an advert
     * targeting programmes X may be shared at X or a subset of X, never at
     * "everyone" and never at Y). The note follows the house rule too:
     * optional, ≤500 chars, refused before the row moves.
     *
     * <p>An R6 advert is still {@code PENDING_REVIEW} when its submission is
     * approved — and D2 says the university *is* the trusted verifier for
     * R5/R6 — so sharing publishes it (status + {@code published_at}, with an
     * advert-level §5.10 row). Any other non-{@code PUBLISHED} state is a 409:
     * nothing rejected, withdrawn or closed ever reaches students.
     *
     * <p>Writes, one transaction: (maybe) the advert's publish, the share row
     * with {@code university_id}/{@code shared_by} from the session and
     * {@code offer_id} set only when an offer authorised it, the offer's own
     * {@code ACCEPTED → SHARED} move through this same engine, one §5.10
     * history row (from {@code null}, like S5.1's offers), the §9
     * {@code OPPORTUNITY_SHARED} fan-out to every student at this university
     * whose programme/department/year matches the targeting (no targeting =
     * the whole roster; recipients looked up server-side, never supplied
     * [L15]), and one audit row.
     */
    public OpportunityShare shareWithStudents(UserEntity actor, Long vacancyId,
            OpportunityShareCreateRequest request) {
        Vacancy advert = vacancyRepository.findById(vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Opportunity not found."));
        Long universityId = actor.getUniversityId();
        if (universityId == null) {
            throw new AccessDeniedException("Your account is not linked to a university.");
        }
        requireUniversitySupervisor(actor, "Only a university supervisor can share an opportunity.");

        // --- Scope: does this session's university hold a claim at all? [H9] ---
        Optional<OpportunityOffer> offer = offerRepository
                .findByVacancyIdAndUniversityId(vacancyId, universityId);
        Optional<OpportunitySubmission> submission = submissionRepository.findByVacancyId(vacancyId)
                .filter(row -> universityId.equals(row.getUniversityId()));
        boolean universitySourced = advert.getOrigin() == Vacancy.Origin.UNIVERSITY
                && advert.getVerifiedBy() != null
                && userRepository.findById(advert.getVerifiedBy())
                        .map(creator -> universityId.equals(creator.getUniversityId())).orElse(false);
        if (offer.isEmpty() && submission.isEmpty() && !universitySourced) {
            throw notFoundAdvert();
        }

        // One live share per university per advert: the UNIQUE constraint is the
        // floor, 409 the answer — and a CLOSED share is terminal (§5.8).
        shareRepository.findByVacancyIdAndUniversityId(vacancyId, universityId)
                .ifPresent(existing -> {
                    throw new IllegalStateException(existing.getStatus() == OpportunityShare.Status.SHARED
                            ? "This opportunity is already shared with your students."
                            : "This opportunity's share was closed and cannot be reopened.");
                });

        // --- Legality of the claim's state (409) ---
        if (offer.isPresent()) {
            OpportunityOffer.Status offerStatus = offer.get().getStatus();
            if (offerStatus == OpportunityOffer.Status.OFFERED
                    || offerStatus == OpportunityOffer.Status.DECLINED) {
                throw new IllegalStateException(
                        "This offer must be accepted before it can be shared.");
            }
        } else if (submission.isPresent()) {
            OpportunitySubmission.Status submissionStatus = submission.get().getStatus();
            if (submissionStatus == OpportunitySubmission.Status.PENDING) {
                throw new IllegalStateException(
                        "This submission must be approved before it can be shared.");
            }
            if (submissionStatus == OpportunitySubmission.Status.REJECTED) {
                throw new IllegalStateException(
                        "A rejected submission cannot be shared with students.");
            }
        }
        boolean needsPublishing = advert.getStatus() == Vacancy.Status.PENDING_REVIEW;
        if (!needsPublishing && advert.getStatus() != Vacancy.Status.PUBLISHED) {
            throw new IllegalStateException(
                    "A " + advert.getStatus() + " opportunity cannot be shared with students.");
        }

        // --- The body: note cap, then targeting — fully validated before any write ---
        OpportunityShareCreateRequest.Target target = request == null ? null : request.target();
        String note = request == null ? null : request.note();
        if (note != null && note.length() > 500) {
            throw new IllegalArgumentException("A share note may not exceed 500 characters.");
        }
        List<Integer> programmes = target == null || target.programmeIds() == null
                ? List.of() : target.programmeIds();
        List<Integer> departments = target == null || target.departmentIds() == null
                ? List.of() : target.departmentIds();
        List<Integer> years = target == null || target.yearsOfStudy() == null
                ? List.of() : target.yearsOfStudy();
        requireOwnAcademicUnits(actor, programmes, departments);
        for (Integer year : years) {
            if (year == null || year < 1) {
                throw new IllegalArgumentException("Years of study must be positive numbers.");
            }
        }
        requireNoWidening("programme", programmes, advert.getTargetProgrammeIds());
        requireNoWidening("department", departments, advert.getTargetDepartmentIds());
        requireNoWidening("year of study", years, advert.getTargetYearOfStudy());

        // --- Writes ---
        if (needsPublishing) {
            advert.setStatus(Vacancy.Status.PUBLISHED);
            advert.setPublishedAt(LocalDateTime.now());
            advert.setUpdatedAt(LocalDateTime.now());
            vacancyRepository.save(advert);
            record(vacancyId, null, null, Vacancy.Status.PENDING_REVIEW,
                    Vacancy.Status.PUBLISHED, actor);
        }
        if (offer.isPresent() && offer.get().getStatus() == OpportunityOffer.Status.ACCEPTED) {
            // §5.7: ACCEPTED → SHARED is this very act — through the same engine,
            // so the offer gets its own history row and the super admins' notice.
            transitionOffer(actor, offer.get().getId(), OpportunityOffer.Status.SHARED, null);
        }

        OpportunityShare share = new OpportunityShare();
        share.setVacancyId(vacancyId);
        share.setUniversityId(universityId);
        share.setOfferId(offer.map(OpportunityOffer::getId).orElse(null));
        share.setNote(note == null || note.isBlank() ? null : note.trim());
        share.setSharedBy(actor.getId());
        share.setTargetProgrammeIds(csvOrNull(programmes));
        share.setTargetDepartmentIds(csvOrNull(departments));
        share.setTargetYearOfStudy(csvOrNull(years));
        OpportunityShare saved = shareRepository.save(share);

        record(vacancyId, universityId, OpportunityStatusHistory.RELAY_SHARE,
                null, OpportunityShare.Status.SHARED, actor);
        notificationService.notify(matchingStudentIds(saved),
                "OPPORTUNITY_SHARED", "New internship opportunity",
                "\"" + advert.getTitle() + "\" has been shared with your university.",
                "/student/dashboard");
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "OPPORTUNITY_SHARED",
                "OpportunityShare",
                "Share " + saved.getId() + " (university " + universityId + "): null -> SHARED"
                        + (needsPublishing ? "; opportunity published" : ""), null);
        return saved;
    }

    /** [H7]: targeting is an academic claim — only the session's own university may make one. */
    private void requireOwnAcademicUnits(UserEntity actor, List<Integer> programmes,
            List<Integer> departments) {
        if (programmes.isEmpty() && departments.isEmpty()) {
            return;
        }
        int universityId = actor.getUniversityId().intValue();
        Set<Integer> ownProgrammes = programmeRepository.findByUniversityId(universityId).stream()
                .map(Programme::getProgrammeId).collect(java.util.stream.Collectors.toSet());
        Set<Integer> ownDepartments = departmentRepository.findByUniversityId(universityId).stream()
                .map(Department::getDepartmentId).collect(java.util.stream.Collectors.toSet());
        for (Integer id : programmes) {
            if (id == null || id < 1 || !ownProgrammes.contains(id)) {
                throw new IllegalArgumentException(
                        "Targeting programme " + id + " does not belong to your university.");
            }
        }
        for (Integer id : departments) {
            if (id == null || id < 1 || !ownDepartments.contains(id)) {
                throw new IllegalArgumentException(
                        "Targeting department " + id + " does not belong to your university.");
            }
        }
    }

    /**
     * §5.8 in one predicate: the share's audience must be a subset of the
     * advert's. An advert with no targeting offers the whole university, so
     * anything the university names is a subset; an advert that does target
     * accepts only the same ids or fewer — an empty share list ("everyone")
     * and any un-offered id are widenings → 400, before anything is written.
     */
    private void requireNoWidening(String noun, List<Integer> requested, String offeredCsv) {
        Set<Integer> offered = csvInts(offeredCsv);
        if (offered.isEmpty()) {
            return;
        }
        if (requested.isEmpty()) {
            throw new IllegalArgumentException("A share may narrow the offered audience, never widen it"
                    + " — name the " + noun + "s to share with.");
        }
        if (!offered.containsAll(requested)) {
            throw new IllegalArgumentException("A share may narrow the offered audience, never widen it"
                    + " — the " + noun + " targeting is wider than what was offered.");
        }
    }

    /** Ids travel as comma-separated strings on both sides (§5.8, matching {@code Vacancy}). */
    private String csvOrNull(List<Integer> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
    }

    /**
     * Lenient on purpose: an unparseable id on the *advert* side cannot make
     * this endpoint 400 — it just carries no claim, so the widen check treats
     * that column as unrestricted. The share's own ids are {@code Integer}s
     * from the JSON body, so they need no parsing at all.
     */
    private Set<Integer> csvInts(String csv) {
        if (csv == null || csv.isBlank()) {
            return Set.of();
        }
        Set<Integer> parsed = new java.util.LinkedHashSet<>();
        for (String raw : csv.split(",")) {
            String value = raw.trim();
            if (value.isEmpty()) {
                continue;
            }
            try {
                parsed.add(Integer.parseInt(value));
            } catch (NumberFormatException ignored) {
                // Advert-side junk: no defensible subset relation, no claim.
            }
        }
        return parsed;
    }

    /** §9 fan-out: this university's students, narrowed by the share's targeting. */
    private List<Long> matchingStudentIds(OpportunityShare share) {
        Set<Integer> programmes = csvInts(share.getTargetProgrammeIds());
        Set<Integer> departments = csvInts(share.getTargetDepartmentIds());
        Set<Integer> years = csvInts(share.getTargetYearOfStudy());
        return studentRepository.findByUniversityId(share.getUniversityId()).stream()
                .filter(student -> matches(programmes, student.getProgrammeId()))
                .filter(student -> matches(departments, student.getDepartmentId()))
                .filter(student -> matches(years, student.getYearOfStudy()))
                .map(Student::getUserId)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private boolean matches(Set<Integer> filter, Long value) {
        return filter.isEmpty() || (value != null && filter.contains(value.intValue()));
    }

    private boolean matches(Set<Integer> filter, Integer value) {
        return filter.isEmpty() || (value != null && filter.contains(value));
    }

    /** One share transition: a broadcast being called off, by its own university or the super admin. */
    public OpportunityShare transitionShare(UserEntity actor, Long shareId, OpportunityShare.Status target) {
        OpportunityShare share = shareRepository.findByIdForUpdate(shareId)
                .orElseThrow(() -> new NoSuchElementException("Share not found."));
        requireShareScope(actor, share);
        requireUniversitySupervisor(actor, "Only a university supervisor can manage a share.");

        OpportunityShare.Status from = share.getStatus();
        requireLegal(SHARE.get(from), from, target, "share");

        share.setStatus(target);
        if (target == OpportunityShare.Status.CLOSED) {
            share.setClosedBy(actor.getId());
            share.setClosedAt(LocalDateTime.now());
        }
        OpportunityShare saved = shareRepository.save(share);

        record(saved.getVacancyId(), saved.getUniversityId(),
                OpportunityStatusHistory.RELAY_SHARE, from, target, actor);
        notifySharingUniversitySupervisors(saved, target);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "OPPORTUNITY_SHARE_STATUS",
                "OpportunityShare",
                "Share " + saved.getId() + " (university " + saved.getUniversityId() + "): "
                        + from + " -> " + target, null);
        return saved;
    }

    /** Share scope: the sharing university's own row, or the super admin's view of it. */
    private void requireShareScope(UserEntity actor, OpportunityShare share) {
        if (isSuperAdmin(actor)) {
            return;
        }
        if (actor.getUniversityId() != null && actor.getUniversityId().equals(share.getUniversityId())) {
            return;
        }
        throw new NoSuchElementException("Share not found.");
    }

    // --- Submission transitions --------------------------------------------

    /**
     * One submission transition (R6's review hop). Locked like the offer so two
     * supervisors cannot both decide the same submission.
     */
    public OpportunitySubmission transitionSubmission(UserEntity actor, Long submissionId,
            OpportunitySubmission.Status target) {
        OpportunitySubmission submission = submissionRepository.findByIdForUpdate(submissionId)
                .orElseThrow(() -> new NoSuchElementException("Submission not found."));
        return applySubmissionTransition(actor, submission, target, null);
    }

    /**
     * S6.2 (plan §6.3): {@code POST /{id}/submissions/{submissionId}/respond} —
     * the university's review verdict on an R6 proposal, with its optional
     * {@code review_note}.
     *
     * <p>The path's advert id anchors the row the same way S5.2 anchors an
     * offer: a submission id replayed under another advert's path does not
     * exist here (404). The note follows the offer's rule — optional, capped
     * at the §5.9 column's 500 chars, and refused *before* the row moves, so a
     * too-long note leaves the submission exactly as answerable as it was.
     */
    public OpportunitySubmission transitionSubmission(UserEntity actor, Long vacancyId,
            Long submissionId, OpportunitySubmission.Status target, String reviewNote) {
        OpportunitySubmission submission = submissionRepository.findByIdForUpdate(submissionId)
                .orElseThrow(() -> new NoSuchElementException("Submission not found."));
        if (!submission.getVacancyId().equals(vacancyId)) {
            throw new NoSuchElementException("Submission not found.");
        }
        return applySubmissionTransition(actor, submission, target, reviewNote);
    }

    /** Scope → role → legality → note, then the write and its two side effects. */
    private OpportunitySubmission applySubmissionTransition(UserEntity actor,
            OpportunitySubmission submission, OpportunitySubmission.Status target, String reviewNote) {
        requireSubmissionScope(actor, submission);
        // The reviewing decision belongs to the university being asked — §6.3 gates
        // this endpoint to SUPERVISOR, so even a super admin gets 403 here: the
        // university is the trusted verifier for its own pipeline (D2).
        requireUniversitySupervisor(actor, "Only a university supervisor can review a submission.");

        OpportunitySubmission.Status from = submission.getStatus();
        requireLegal(SUBMISSION.get(from), from, target, "submission");
        if (reviewNote != null && reviewNote.length() > 500) {
            throw new IllegalArgumentException("A review note may not exceed 500 characters.");
        }

        submission.setStatus(target);
        if (target == OpportunitySubmission.Status.APPROVED || target == OpportunitySubmission.Status.REJECTED) {
            submission.setReviewedBy(actor.getId());
            submission.setReviewedAt(LocalDateTime.now());
            if (reviewNote != null && !reviewNote.isBlank()) {
                submission.setReviewNote(reviewNote.trim());
            }
        }
        OpportunitySubmission saved = submissionRepository.save(submission);

        record(saved.getVacancyId(), saved.getUniversityId(),
                OpportunityStatusHistory.RELAY_SUBMISSION, from, target, actor);
        notifySubmitterAboutReview(saved, target);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "OPPORTUNITY_SUBMISSION_STATUS",
                "OpportunitySubmission",
                "Submission " + saved.getId() + " (university " + saved.getUniversityId() + "): "
                        + from + " -> " + target, null);
        return saved;
    }

    /**
     * Submission scope: the university it addresses, the supervisor who sent it (they
     * may watch their own row's state), or the super admin. A supervisor of another
     * university gets 404 [H7] — scope is decided before the role question of who may
     * approve is ever asked.
     */
    private void requireSubmissionScope(UserEntity actor, OpportunitySubmission submission) {
        if (isSuperAdmin(actor)) {
            return;
        }
        boolean ownUniversity = actor.getUniversityId() != null
                && actor.getUniversityId().equals(submission.getUniversityId());
        boolean ownSubmission = actor.getId() != null && actor.getId().equals(submission.getSubmittedBy());
        if (ownUniversity || ownSubmission) {
            return;
        }
        throw new NoSuchElementException("Submission not found.");
    }

    // --- Shared answers -----------------------------------------------------

    /** Relay answers are the university's to give: SUPERVISOR role, no exceptions. */
    private void requireUniversitySupervisor(UserEntity actor, String message) {
        if (!"SUPERVISOR".equals(actor.getRole().name())) {
            throw new AccessDeniedException(message);
        }
    }

    private <E extends Enum<E>> void requireLegal(List<E> allowed, E from, E to, String noun) {
        if (!allowed.contains(to)) {
            // Illegal jump — including any move out of a terminal state and every no-op → 409.
            throw new IllegalStateException(
                    noun + " in " + from + " cannot move to " + to + ".");
        }
    }

    private NoSuchElementException notFoundAdvert() {
        return new NoSuchElementException("Opportunity not found.");
    }

    private boolean isSuperAdmin(UserEntity actor) {
        return Boolean.TRUE.equals(actor.getSuperAdmin());
    }

    // --- S2.2 side effects --------------------------------------------------

    /**
     * The submitter is told the verdict: approved → {@code OPPORTUNITY_VERIFIED},
     * rejected → {@code OPPORTUNITY_REJECTED} (both from the §9 catalog), anything
     * else → the house {@code OPPORTUNITY_STATUS} change notice. Recipients are
     * looked up server-side only (L15): the owning company's users for a
     * company-submitted advert, that university's supervisors for a
     * university/supervisor origin, falling back to the super admins who own the
     * moderation inbox when no relay row links a university yet (R5's advert
     * before its first share).
     */
    private void notifyAdvertOriginator(Vacancy advert, Vacancy.Status target) {
        String type;
        String title;
        if (target == Vacancy.Status.PUBLISHED) {
            type = "OPPORTUNITY_VERIFIED";
            title = "Your opportunity was approved";
        } else if (target == Vacancy.Status.REJECTED) {
            type = "OPPORTUNITY_REJECTED";
            title = "Your opportunity was not approved";
        } else {
            type = "OPPORTUNITY_STATUS";
            title = "Opportunity updated";
        }
        String body = "\"" + advert.getTitle() + "\" is now " + target + ".";
        String link = advert.getOrigin() == Vacancy.Origin.COMPANY
                ? "/company/dashboard"
                : "/university/dashboard";
        notificationService.notify(originatorRecipients(advert), type, title, body, link);
    }

    private List<Long> originatorRecipients(Vacancy advert) {
        if (advert.getOrigin() == Vacancy.Origin.COMPANY && advert.getCompanyId() != null) {
            return userRepository.findByCompanyId(advert.getCompanyId()).stream()
                    .filter(u -> "COMPANY".equals(u.getRole().name()))
                    .map(UserEntity::getId)
                    .toList();
        }
        Long universityId = submissionRepository.findByVacancyId(advert.getId())
                .map(OpportunitySubmission::getUniversityId)
                .orElse(null);
        if (universityId == null) {
            return superAdminIds();
        }
        return supervisorIds(universityId);
    }

    /**
     * An offer is the super admin's to watch: §9 sends them
     * {@code OPPORTUNITY_OFFER_ANSWERED} when the university responds, and the plain
     * status notice for the transitions nobody answered yet (shared or stood down).
     */
    private void notifySuperAdminsAboutOffer(OpportunityOffer offer, OpportunityOffer.Status target) {
        boolean answered = target == OpportunityOffer.Status.ACCEPTED
                || target == OpportunityOffer.Status.DECLINED;
        String type = answered ? "OPPORTUNITY_OFFER_ANSWERED" : "OPPORTUNITY_STATUS";
        String title = answered ? "University responded to an offer" : "Offer updated";
        String body = "Offer for university " + offer.getUniversityId() + " is now " + target + ".";
        notificationService.notify(superAdminIds(), type, title, body, "/admin/opportunities");
    }

    /**
     * A share's close is felt by its university first. The catalog's
     * {@code OPPORTUNITY_WITHDRAWN} notice to every matching <b>student</b> needs
     * the targeting-aware, chunked fan-out [H11] and belongs to S6.5/S6.6 — sending
     * it from here would fan out untargeted and unchunked from the very first
     * close. The supervisors who shared it are told now.
     */
    private void notifySharingUniversitySupervisors(OpportunityShare share, OpportunityShare.Status target) {
        String body = "Shared opportunity on advert " + share.getVacancyId() + " is now " + target + ".";
        notificationService.notify(supervisorIds(share.getUniversityId()), "OPPORTUNITY_STATUS",
                target == OpportunityShare.Status.CLOSED ? "A shared opportunity was withdrawn"
                        : "Share updated",
                body, "/university/dashboard");
    }

    /** The counterpart of §9's {@code OPPORTUNITY_SUBMISSION}: the submitter learns their own verdict. */
    private void notifySubmitterAboutReview(OpportunitySubmission submission, OpportunitySubmission.Status target) {
        List<Long> recipients = submission.getSubmittedBy() == null
                ? List.of()
                : List.of(submission.getSubmittedBy());
        notificationService.notify(recipients, "OPPORTUNITY_STATUS", "Submission reviewed",
                "Your submission is now " + target + ".", "/university/dashboard");
    }

    private List<Long> superAdminIds() {
        return userRepository.findBySuperAdminTrue().stream().map(UserEntity::getId).toList();
    }

    private List<Long> supervisorIds(Long universityId) {
        if (universityId == null) {
            return List.of();
        }
        return userRepository.findByUniversityIdAndRole(universityId, Role.SUPERVISOR).stream()
                .map(UserEntity::getId)
                .toList();
    }

    /**
     * The one place history is written. Statuses are stored as strings on purpose
     * (§5.10): the trail has to outlive the vocabulary it recorded.
     */
    private void record(Long vacancyId, Long universityId, String relayType,
            Enum<?> from, Enum<?> to, UserEntity actor) {
        OpportunityStatusHistory row = new OpportunityStatusHistory();
        row.setVacancyId(vacancyId);
        row.setUniversityId(universityId);
        row.setRelayType(relayType);
        row.setFromStatus(from != null ? from.name() : null);
        row.setToStatus(to.name());
        row.setChangedBy(actor.getId());
        historyRepository.save(row);
    }
}
