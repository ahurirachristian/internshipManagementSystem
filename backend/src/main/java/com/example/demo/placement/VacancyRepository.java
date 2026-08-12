package com.example.demo.placement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VacancyRepository extends JpaRepository<Vacancy, Long> {
    List<Vacancy> findByCompanyId(Long companyId);
    List<Vacancy> findByStatus(String status);
    List<Vacancy> findByCompanyIdAndStatus(Long companyId, String status);
}
