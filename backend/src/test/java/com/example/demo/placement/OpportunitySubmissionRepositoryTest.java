package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * Phase 1 baseline (opportunity plan §8.2, step S1.4).
 *
 * <p>The submission row is R6's review hop. Two things here are load-bearing enough to
 * pin.
 *
 * <p><b>The unique constraint is on {@code vacancy_id} alone.</b> That looks like a
 * copy-paste slip from the offer and share tables, which are unique per
 * (advert, university), and it is worth a test that says otherwise — because the
 * instinct to "fix" it to (advert, university) is exactly the mistake that would let
 * two universities each hold a reviewable submission for one advert, produce two
 * disagreeing decisions, and then share it twice.
 * {@link #anAdvertMayOnlyEverBeSubmittedOnce()}.
 *
 * <p><b>The review queue is filtered by university.</b>
 * {@link #aUniversityOnlySeesItsOwnReviewQueue()} is [H7] at this layer: if the finder
 * ignored {@code universityId}, one university's supervisors could read — and at S6.2
 * answer — another university's queue.
 *
 * <p>The remaining tests cover the default state, the round trip, and the
 * not-yet-reviewed state that the share gate at S6.2 will key on.
 */
@SpringBootTest
@Transactional
class OpportunitySubmissionRepositoryTest {

    @Autowired
    private OpportunitySubmissionRepository submissionRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private EntityManager entityManager;

    private Long vacancyId() {
        return vacancyRepository.save(new Vacancy("A supervisor's find", "A description of the role",
                42L, "Kampala", "Some requirements", "OPEN",
                LocalDate.now().plusMonths(2), LocalDate.now())).getId();
    }

    /** Leaves {@code status} at its {@code PENDING} default; a submission's status is the reviewer's to set. */
    private OpportunitySubmission submission(Long vacancyId, long universityId) {
        OpportunitySubmission submission = new OpportunitySubmission();
        submission.setVacancyId(vacancyId);
        submission.setUniversityId(universityId);
        submission.setSubmittedBy(7L);
        return submission;
    }

    // --- Defaults -------------------------------------------------------------

    @Test
    void aNewSubmissionAwaitsReview() {
        OpportunitySubmission saved = submissionRepository.save(submission(vacancyId(), 10L));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(OpportunitySubmission.PENDING);
        assertThat(saved.getSubmittedAt()).isNotNull();
    }

    @Test
    void aNewSubmissionHasNotBeenReviewed() {
        // reviewed_* null is what "still awaiting a decision" means, so it must not
        // be defaulted to anything. If it were, the review queue could not tell an
        // unreviewed submission from one a reviewer stamped on creation.
        OpportunitySubmission saved = submissionRepository.save(submission(vacancyId(), 10L));

        assertThat(saved.getReviewedBy()).isNull();
        assertThat(saved.getReviewedAt()).isNull();
        assertThat(saved.getReviewNote()).isNull();
    }

    // --- The deliberate uniqueness ---------------------------------------------

    @Test
    void anAdvertMayOnlyEverBeSubmittedOnce() {
        // Unique on vacancy_id alone, deliberately. Widening this to
        // (vacancy_id, university_id) would let two universities each hold a
        // reviewable submission for one advert, arrive at different decisions, and then
        // share it twice. Saved directly, bypassing existsByVacancyId, so only the
        // constraint can catch it.
        Long vacancyId = vacancyId();
        submissionRepository.saveAndFlush(submission(vacancyId, 10L));

        assertThatThrownBy(() -> submissionRepository
                .saveAndFlush(submission(vacancyId, 11L)))
                .isInstanceOf(DataIntegrityViolationException.class);

        // A rejected insert poisons the Hibernate session; clearing recovers it.
        entityManager.clear();
        assertThat(submissionRepository.count()).isEqualTo(1);
    }

    @Test
    void aUniversityMaySubmitDifferentAdverts() {
        submissionRepository.saveAndFlush(submission(vacancyId(), 10L));
        submissionRepository.saveAndFlush(submission(vacancyId(), 10L));

        assertThat(submissionRepository.count()).isEqualTo(2);
    }

    // --- Scoping --------------------------------------------------------------

    @Test
    void aUniversityOnlySeesItsOwnReviewQueue() {
        submissionRepository.saveAndFlush(submission(vacancyId(), 10L));
        submissionRepository.saveAndFlush(submission(vacancyId(), 11L));

        // [H7]: one university's supervisors must not read another's queue, and at S6.2
        // must not be able to answer it either.
        List<OpportunitySubmission> mine = submissionRepository
                .findByUniversityIdAndStatusOrderBySubmittedAtAsc(10L, OpportunitySubmission.PENDING);

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).getUniversityId()).isEqualTo(10L);
    }

    @Test
    void anApprovedSubmissionLeavesThePendingQueue() {
        submissionRepository.saveAndFlush(submission(vacancyId(), 10L));
        OpportunitySubmission approved = submissionRepository.saveAndFlush(submission(vacancyId(), 11L));
        approved.setStatus(OpportunitySubmission.APPROVED);
        approved.setReviewedBy(3L);
        approved.setReviewedAt(LocalDateTime.now().withNano(0));
        submissionRepository.flush();

        List<OpportunitySubmission> pending = submissionRepository
                .findByUniversityIdAndStatusOrderBySubmittedAtAsc(10L, OpportunitySubmission.PENDING);

        assertThat(pending).hasSize(1);
    }

    @Test
    void aSupervisorSeesEverySubmissionTheyMadeIncludingRejectedOnes() {
        submissionRepository.saveAndFlush(submission(vacancyId(), 10L));
        OpportunitySubmission rejected = submissionRepository.saveAndFlush(submission(vacancyId(), 11L));
        rejected.setStatus(OpportunitySubmission.REJECTED);
        rejected.setReviewNote("Not a real placement.");
        submissionRepository.flush();

        // Status-free on purpose: a supervisor who was turned down should still see
        // that they were, and why.
        assertThat(submissionRepository.findBySubmittedByOrderBySubmittedAtDesc(7L)).hasSize(2);
    }

    // --- The gate S6.2 will read -----------------------------------------------

    @Test
    void anApprovedSubmissionIsFindableForTheShareGate() {
        Long vacancyId = vacancyId();
        OpportunitySubmission pending = submissionRepository.saveAndFlush(submission(vacancyId, 10L));

        // Before review: nothing for the gate to find, so the share is refused.
        assertThat(submissionRepository
                .findByVacancyIdAndStatus(vacancyId, OpportunitySubmission.APPROVED)).isEmpty();
        assertThat(submissionRepository
                .findByVacancyIdAndStatus(vacancyId, OpportunitySubmission.PENDING)).isPresent();

        pending.setStatus(OpportunitySubmission.APPROVED);
        pending.setReviewedBy(3L);
        pending.setReviewedAt(LocalDateTime.now().withNano(0));
        pending.setReviewNote("Vetted the host; proceeding.");
        submissionRepository.flush();
        entityManager.clear();

        // After review, the share endpoint has what it needs to unlock R6's second half.
        assertThat(submissionRepository
                .findByVacancyIdAndStatus(vacancyId, OpportunitySubmission.APPROVED)).isPresent();
    }

    @Test
    void aSubmissionIsFindableByItsAdvertAndCheckedForExistence() {
        Long vacancyId = vacancyId();
        assertThat(submissionRepository.existsByVacancyId(vacancyId)).isFalse();

        submissionRepository.saveAndFlush(submission(vacancyId, 10L));

        assertThat(submissionRepository.findByVacancyId(vacancyId)).isPresent();
        assertThat(submissionRepository.existsByVacancyId(vacancyId)).isTrue();
    }

    // --- Round trip -----------------------------------------------------------

    @Test
    void everyColumnRoundTrips() {
        OpportunitySubmission row = submission(vacancyId(), 10L);
        row.setStatus(OpportunitySubmission.REJECTED);
        row.setNote("Found at a careers fair; host confirmed in writing.");
        row.setReviewedBy(3L);
        row.setReviewedAt(LocalDateTime.now().withNano(0));
        row.setReviewNote("The role is unpaid, so it does not meet our policy.");

        Long id = submissionRepository.saveAndFlush(row).getId();
        entityManager.clear();
        OpportunitySubmission reloaded = submissionRepository.findById(id).orElseThrow();

        assertThat(reloaded.getVacancyId()).isEqualTo(row.getVacancyId());
        assertThat(reloaded.getUniversityId()).isEqualTo(10L);
        assertThat(reloaded.getSubmittedBy()).isEqualTo(7L);
        assertThat(reloaded.getSubmittedAt()).isNotNull();
        assertThat(reloaded.getStatus()).isEqualTo(OpportunitySubmission.REJECTED);
        assertThat(reloaded.getNote()).isEqualTo("Found at a careers fair; host confirmed in writing.");
        assertThat(reloaded.getReviewedBy()).isEqualTo(3L);
        assertThat(reloaded.getReviewedAt()).isNotNull();
        assertThat(reloaded.getReviewNote())
                .isEqualTo("The role is unpaid, so it does not meet our policy.");
    }
}
