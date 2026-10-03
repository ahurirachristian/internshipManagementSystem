package com.example.demo.placement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpportunityStatusHistoryRepository
        extends JpaRepository<OpportunityStatusHistory, Long> {

    /** The S8.2 history view: one advert's trail, oldest first, in the order it happened. */
    List<OpportunityStatusHistory> findByVacancyIdOrderByChangedAtAsc(Long vacancyId);

    /** One university's involvement with one advert, for its own audit view. */
    List<OpportunityStatusHistory> findByVacancyIdAndUniversityIdOrderByChangedAtAsc(
            Long vacancyId, Long universityId);

    List<OpportunityStatusHistory> findByVacancyIdAndRelayTypeOrderByChangedAtAsc(
            Long vacancyId, String relayType);
}
