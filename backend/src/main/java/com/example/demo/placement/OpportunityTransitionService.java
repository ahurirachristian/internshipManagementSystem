package com.example.demo.placement;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.notification.NotificationService;

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

    public OpportunityTransitionService(VacancyRepository vacancyRepository,
            OpportunityOfferRepository offerRepository, OpportunityShareRepository shareRepository,
            OpportunitySubmissionRepository submissionRepository,
            OpportunityStatusHistoryRepository historyRepository,
            NotificationService notificationService, AuditLogService auditLogService,
            UserRepository userRepository) {
        this.vacancyRepository = vacancyRepository;
        this.offerRepository = offerRepository;
        this.shareRepository = shareRepository;
        this.submissionRepository = submissionRepository;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
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
        requireSubmissionScope(actor, submission);
        // The reviewing decision belongs to the university being asked — §6.3 gates
        // this endpoint to SUPERVISOR, so even a super admin gets 403 here: the
        // university is the trusted verifier for its own pipeline (D2).
        requireUniversitySupervisor(actor, "Only a university supervisor can review a submission.");

        OpportunitySubmission.Status from = submission.getStatus();
        requireLegal(SUBMISSION.get(from), from, target, "submission");

        submission.setStatus(target);
        if (target == OpportunitySubmission.Status.APPROVED || target == OpportunitySubmission.Status.REJECTED) {
            submission.setReviewedBy(actor.getId());
            submission.setReviewedAt(LocalDateTime.now());
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
