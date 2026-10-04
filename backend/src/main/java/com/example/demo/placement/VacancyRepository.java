package com.example.demo.placement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VacancyRepository extends JpaRepository<Vacancy, Long> {
    List<Vacancy> findByCompanyId(Long companyId);

    /**
     * Takes the enum, not a String, so a caller cannot filter on a state that does not
     * exist. The column stores {@link Vacancy.Status#PUBLISHED} — the legacy
     * {@code "OPEN"} rows were rewritten by the S1.6 migration — so the only spelling
     * of "open" that matches is the enum constant.
     */
    List<Vacancy> findByStatus(Vacancy.Status status);

    List<Vacancy> findByCompanyIdAndStatus(Long companyId, Vacancy.Status status);

    /**
     * S4.1: the moderation inbox — everything still waiting for a verdict. Both
     * halves of the predicate matter: an advert that was verified without review
     * (the super admin's own sourced posts) is not in anyone's queue, and a
     * rejected or published row has already left it.
     */
    List<Vacancy> findByStatusAndVerificationStatus(Vacancy.Status status,
            Vacancy.VerificationStatus verificationStatus);
}
