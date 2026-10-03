package com.example.demo.placement;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OpportunityOfferRepository extends JpaRepository<OpportunityOffer, Long> {

    /** The university's own offers. Every caller forces universityId from the session. */
    List<OpportunityOffer> findByUniversityIdOrderByOfferedAtDesc(Long universityId);

    List<OpportunityOffer> findByVacancyId(Long vacancyId);

    List<OpportunityOffer> findByVacancyIdAndStatus(Long vacancyId, String status);

    /** Backs the S5.1 duplicate-offer 409 without relying on the unique constraint alone. */
    boolean existsByVacancyIdAndUniversityId(Long vacancyId, Long universityId);

    Optional<OpportunityOffer> findByVacancyIdAndUniversityId(Long vacancyId, Long universityId);

    /**
     * L18, copied from {@code RoleRequestRepository.findByIdForUpdate}: two
     * supervisors answering the same offer at once must not both succeed, so the
     * row is locked before its status is read.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from OpportunityOffer o where o.id = :id")
    Optional<OpportunityOffer> findByIdForUpdate(@Param("id") Long id);
}
