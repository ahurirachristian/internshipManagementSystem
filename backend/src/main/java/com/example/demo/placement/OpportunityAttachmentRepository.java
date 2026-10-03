package com.example.demo.placement;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpportunityAttachmentRepository
        extends JpaRepository<OpportunityAttachment, Long> {

    /**
     * The metadata listing behind S6.7. Every row returned still has to be filtered
     * through the audience resolver — this finder narrows by advert, not by who is
     * asking, so a student calling it must not receive advert-level
     * ({@code universityId IS NULL}) files.
     */
    List<OpportunityAttachment> findByVacancyIdOrderByUploadedAtDesc(Long vacancyId);

    /**
     * The listing a student is allowed to see: only files that were shared with their
     * university, never advert-level ones.
     */
    List<OpportunityAttachment> findByVacancyIdAndUniversityIdOrderByUploadedAtDesc(
            Long vacancyId, Long universityId);

    Optional<OpportunityAttachment> findByIdAndVacancyId(Long id, Long vacancyId);

    Optional<OpportunityAttachment> findByFileName(String fileName);

    List<OpportunityAttachment> findByVacancyIdAndUploadedBy(Long vacancyId, Long uploadedBy);
}
