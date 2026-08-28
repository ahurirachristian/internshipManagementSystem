package com.example.demo.company;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanySupervisorRepository extends JpaRepository<CompanySupervisor, Long> {
    List<CompanySupervisor> findByCompanyId(Long companyId);
    List<CompanySupervisor> findByCompanyIdAndIsPrimaryTrue(Long companyId);
}
