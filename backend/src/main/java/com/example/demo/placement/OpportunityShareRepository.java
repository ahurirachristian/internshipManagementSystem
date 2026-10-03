package com.example.demo.placement;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OpportunityShareRepository extends JpaRepository<OpportunityShare, Long> {

    /**
     * The student feed's only entry point (S6.4). Every caller must pass a
     * {@code universityId} taken from the session, never from the request.
     *
     * <p>Filtering on {@code status} here rather than in the caller is deliberate:
     * {@code SHARED} vs {@code CLOSED} decides whether a withdrawn advert is still
     * in front of students, and a feed that forgot the predicate would keep showing
     * an advert a university deliberately pulled.
     */
    List<OpportunityShare> findByUniversityIdAndStatusOrderBySharedAtDesc(Long universityId, String status);

    List<OpportunityShare> findByUniversityIdOrderBySharedAtDesc(Long universityId);

    List<OpportunityShare> findByVacancyId(Long vacancyId);

    Optional<OpportunityShare> findByVacancyIdAndUniversityId(Long vacancyId, Long universityId);

    boolean existsByVacancyIdAndUniversityId(Long vacancyId, Long universityId);

    /** Backs S6.1: a share may only be created from an offer that was accepted. */
    List<OpportunityShare> findByOfferId(Long offerId);

    /**
     * L18, as on the offer and the {@code RoleRequest} rows: closing and sharing
     * the same advert at the same moment must not both succeed, so the row is
     * locked before its status is read.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from OpportunityShare s where s.id = :id")
    Optional<OpportunityShare> findByIdForUpdate(@Param("id") Long id);
}
