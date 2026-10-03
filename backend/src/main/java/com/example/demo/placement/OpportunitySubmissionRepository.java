package com.example.demo.placement;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OpportunitySubmissionRepository
        extends JpaRepository<OpportunitySubmission, Long> {

    /**
     * The review queue a university's supervisors see (S6.2). {@code universityId}
     * comes from the session — a supervisor of another university must never be able
     * to read or answer this queue [H7].
     */
    List<OpportunitySubmission> findByUniversityIdAndStatusOrderBySubmittedAtAsc(
            Long universityId, OpportunitySubmission.Status status);


    /** A supervisor's own submissions, including rejected ones. */
    List<OpportunitySubmission> findBySubmittedByOrderBySubmittedAtDesc(Long submittedBy);

    Optional<OpportunitySubmission> findByVacancyId(Long vacancyId);

    boolean existsByVacancyId(Long vacancyId);

    /**
     * Backs the S6.2 gate on sharing: an R6 share is only legal once the university's
     * review row for that advert is APPROVED, so the service reads this rather than
     * trusting the caller to have checked.
     */
    Optional<OpportunitySubmission> findByVacancyIdAndStatus(Long vacancyId, OpportunitySubmission.Status status);

    /**
     * L18, as on the other two relay tables: two supervisors reviewing one submission
     * at once must not both get to decide it, so the row is locked before its status
     * is read.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from OpportunitySubmission s where s.id = :id")
    Optional<OpportunitySubmission> findByIdForUpdate(@Param("id") Long id);
}
