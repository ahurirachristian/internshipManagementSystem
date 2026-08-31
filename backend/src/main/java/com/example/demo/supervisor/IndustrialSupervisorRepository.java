package com.example.demo.supervisor;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IndustrialSupervisorRepository extends JpaRepository<IndustrialSupervisor, Long> {

    List<IndustrialSupervisor> findByCompanyId(Long companyId);
}
