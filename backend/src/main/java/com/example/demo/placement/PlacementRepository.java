package com.example.demo.placement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlacementRepository extends JpaRepository<Placement, Long> {
    List<Placement> findByStudentId(Long studentId);
    List<Placement> findByCompanyId(Long companyId);
    List<Placement> findByStatus(Placement.Status status);
}
