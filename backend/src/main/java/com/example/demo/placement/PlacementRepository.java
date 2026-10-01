package com.example.demo.placement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlacementRepository extends JpaRepository<Placement, Long> {
    List<Placement> findByStudentId(Long studentId);
    List<Placement> findByCompanyId(Long companyId);
    List<Placement> findByStatus(Placement.Status status);

    long countByUniversityId(Long universityId);

    @Query("SELECT p.status, COUNT(p) FROM Placement p WHERE p.universityId = :universityId GROUP BY p.status")
    List<Object[]> countByStatusGrouped(@Param("universityId") Long universityId);

    /**
     * Company-scoped counterpart of {@link #countByStatusGrouped}. The dashboard
     * reads it for the caller's own company only, so a company cannot count
     * another company's pipeline by guessing an id.
     */
    @Query("SELECT p.status, COUNT(p) FROM Placement p WHERE p.companyId = :companyId GROUP BY p.status")
    List<Object[]> countByCompanyStatusGrouped(@Param("companyId") Long companyId);
}
