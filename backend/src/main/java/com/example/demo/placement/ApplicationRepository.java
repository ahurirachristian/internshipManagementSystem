package com.example.demo.placement;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    List<Application> findByCompanyId(Long companyId);

    List<Application> findByStudentId(Long studentId);

    Optional<Application> findByVacancyIdAndStudentId(Long vacancyId, Long studentId);

    /**
     * PC9: the funnel is counted in memory from exactly the rows
     * {@code findByCompanyId} / {@code findByStudentId} return — the same scope
     * as the list endpoint — so the chart can never disagree with the table
     * beside it. A grouped {@code @Query} would only be faster on very large
     * scopes; correctness of the reconciliation is the requirement here.
     */
}
