package com.example.demo.placement;

import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;

import com.example.demo.auth.UserEntity;

/**
 * S2.3 (opportunity plan §8.3) — <b>the security core</b>: the one place that
 * answers "may this actor see this advert, and in what capacity", for every origin
 * × every actor. Every read and write added from Phase 3 on must ask this resolver
 * rather than re-deriving visibility, or the relay will grow five different
 * predicates that drift apart — which is exactly how D1 happened to the legacy
 * advert reads.
 *
 * <p>The capacities, and who gets them:
 *
 * <ul>
 *   <li>{@link Capacity#MODERATOR} — the super admin (R1's only audience for an
 *       unmoderated submission) and the plain {@code ADMIN} role, which this
 *       codebase has always treated as read-everywhere. Blocking a company's
 *       submission from <i>students, supervisors and companies</i> is what R1
 *       demands and what the S4.1 inbox test pins; the inbox endpoint itself is
 *       additionally gated {@code super_admin} per §6.2, so the moderation
 *       <i>decision</i> never rests on this predicate.</li>
 *   <li>{@link Capacity#ORIGINATOR} — the company that submitted it: its own
 *       submission in any state, and nobody else's, ever [H1].</li>
 *   <li>{@link Capacity#UNIVERSITY} — a university linked to the advert by a
 *       submission, offer or share row. The link is what makes it theirs to see:
 *       they submitted it, were offered it, or already shared it to their
 *       students. An unlinked university is {@code NONE} — including for the
 *       adverts it has merely heard about [H9].</li>
 *   <li>{@link Capacity#STUDENT} — a student at a university that holds a
 *       <b>live</b> ({@code SHARED}) share of an advert that is itself
 *       {@code PUBLISHED}. Another university's share is invisible [H2]; a closed
 *       or withdrawn share is invisible [H4]; an unshared advert cannot be guessed
 *       into existence [H3].</li>
 *   <li>{@link Capacity#NONE} — everyone else, including field supervisors
 *       outside the owning company. {@code NONE} answers {@code false} to
 *       {@link #canSee} and 404 to {@link #requireVisible} — never 403, so the
 *       endpoint cannot be used as an existence oracle.</li>
 * </ul>
 *
 * <p><b>Seeing is not acting.</b> This resolver decides visibility only. The
 * transition engine ({@link OpportunityTransitionService}) keeps its own stricter
 * <i>action</i> scope on purpose: a student may see a shared advert and still must
 * never withdraw it; a university offered another company's advert may see it and
 * still must never pull it. Collapsing the two questions is how a read predicate
 * turns into a write grant.
 *
 * <p><b>Deliberately not answered here:</b> programme/year targeting (the share
 * narrows its audience per student — layered on at S6.4's feed and S6.7's
 * attachments), the deadline/"not past expiry" rule (S6.4), and zero-filled feed
 * metadata. This resolver answers one question: may this actor see this advert.
 */
@Service
public class OpportunityAudienceResolver {

    /** In what capacity an actor may see an advert. {@code NONE} means they may not. */
    public enum Capacity {
        /** Super admin / admin role: every advert, every state. */
        MODERATOR,
        /** The company whose submission this is — own rows only, any state [H1]. */
        ORIGINATOR,
        /** A university linked by a submission, offer or share row [H9]. */
        UNIVERSITY,
        /** A student whose university holds a live share of a published advert [H2][H3][H4]. */
        STUDENT,
        /** Out of audience. Not visible, and never confirmable as existing. */
        NONE
    }

    private final VacancyRepository vacancyRepository;
    private final OpportunityOfferRepository offerRepository;
    private final OpportunityShareRepository shareRepository;
    private final OpportunitySubmissionRepository submissionRepository;

    public OpportunityAudienceResolver(VacancyRepository vacancyRepository,
            OpportunityOfferRepository offerRepository, OpportunityShareRepository shareRepository,
            OpportunitySubmissionRepository submissionRepository) {
        this.vacancyRepository = vacancyRepository;
        this.offerRepository = offerRepository;
        this.shareRepository = shareRepository;
        this.submissionRepository = submissionRepository;
    }

    /** The capacity this actor has on this advert. Never null. */
    public Capacity capacityOf(UserEntity actor, Vacancy advert) {
        if (actor == null || advert == null) {
            return Capacity.NONE;
        }
        // The moderation/read-everywhere personas, before any tenancy question.
        if (Boolean.TRUE.equals(actor.getSuperAdmin()) || "ADMIN".equals(actor.getRole().name())) {
            return Capacity.MODERATOR;
        }
        return switch (actor.getRole().name()) {
            case "COMPANY", "INDUSTRIAL_SUPERVISOR" -> companySide(actor, advert);
            case "SUPERVISOR" -> universitySide(actor, advert);
            case "STUDENT" -> studentSide(actor, advert);
            default -> Capacity.NONE;
        };
    }

    /** True when the actor is in the audience — the question every read asks. */
    public boolean canSee(UserEntity actor, Vacancy advert) {
        return capacityOf(actor, advert) != Capacity.NONE;
    }

    /**
     * The read gate for "GET one advert": loads it, checks the audience, and
     * answers 404 for anyone outside it [H3] — non-existence is never disclosed
     * as a 403, so a guessed id cannot be probed.
     */
    public Vacancy requireVisible(UserEntity actor, Long vacancyId) {
        Vacancy advert = vacancyRepository.findById(vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Opportunity not found."));
        if (!canSee(actor, advert)) {
            throw new NoSuchElementException("Opportunity not found.");
        }
        return advert;
    }

    /** The company that owns the submission — and only it, in any state [H1]. */
    private Capacity companySide(UserEntity actor, Vacancy advert) {
        boolean ownSubmission = advert.getOrigin() == Vacancy.Origin.COMPANY
                && actor.getCompanyId() != null
                && actor.getCompanyId().equals(advert.getCompanyId());
        return ownSubmission ? Capacity.ORIGINATOR : Capacity.NONE;
    }

    /** A university sees an advert any of its relay rows points at — submitted it, was offered it, or shared it. */
    private Capacity universitySide(UserEntity actor, Vacancy advert) {
        Long universityId = actor.getUniversityId();
        if (universityId == null) {
            return Capacity.NONE;
        }
        boolean linked = submissionRepository.findByVacancyId(advert.getId())
                .map(s -> universityId.equals(s.getUniversityId()))
                .orElse(false)
                || offerRepository.findByVacancyIdAndUniversityId(advert.getId(), universityId).isPresent()
                || shareRepository.findByVacancyIdAndUniversityId(advert.getId(), universityId).isPresent();
        return linked ? Capacity.UNIVERSITY : Capacity.NONE;
    }

    /**
     * A student sees exactly their own university's live shares of published
     * adverts — the R7 rule in one predicate [H2][H3][H4].
     */
    private Capacity studentSide(UserEntity actor, Vacancy advert) {
        Long universityId = actor.getUniversityId();
        if (universityId == null || advert.getStatus() != Vacancy.Status.PUBLISHED) {
            return Capacity.NONE;
        }
        boolean liveShare = shareRepository.findByVacancyIdAndUniversityId(advert.getId(), universityId)
                .map(s -> s.getStatus() == OpportunityShare.Status.SHARED)
                .orElse(false);
        return liveShare ? Capacity.STUDENT : Capacity.NONE;
    }
}
