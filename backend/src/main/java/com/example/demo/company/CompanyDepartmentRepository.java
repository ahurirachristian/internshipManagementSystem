package com.example.demo.company;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyDepartmentRepository extends JpaRepository<CompanyDepartment, Long> {
    List<CompanyDepartment> findByCompanyId(Long companyId);
    List<CompanyDepartment> findByCompanyIdOrderByDepartmentNameAsc(Long companyId);
}
