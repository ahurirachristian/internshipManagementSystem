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

    /**
     * PC12: distinct students per university holding at least one placement
     * whose status is not {@code excluded}, for the admin coverage chart.
     *
     * <p>Counts DISTINCT students rather than placement rows, because a student
     * can legitimately hold several — a cancelled attempt and a later offer, say.
     * Counting rows would report one student as two and report universities as
     * more covered than they have students.
     *
     * <p>Excluding one status rather than listing the positive statuses is what
     * makes this survive the lifecycle gaining states: a new status is treated
     * as coverage by default, which is the safe direction to fail.
     */
    @Query("SELECT p.universityId, COUNT(DISTINCT p.studentId) FROM Placement p "
            + "WHERE p.status <> :excluded GROUP BY p.universityId")
    List<Object[]> countDistinctStudentsWithPlacementExcluding(@Param("excluded") Placement.Status excluded);

    /** PC12: placement records per status, system-wide, for the coverage breakdown. */
    @Query("SELECT p.status, COUNT(p) FROM Placement p GROUP BY p.status")
    List<Object[]> countGroupedByStatus();
}
