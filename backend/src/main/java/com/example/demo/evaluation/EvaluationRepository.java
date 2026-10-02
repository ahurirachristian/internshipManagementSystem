package com.example.demo.evaluation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    List<Evaluation> findByStudentId(Long studentId);
    List<Evaluation> findByStudentIdAndSupervisorType(Long studentId, String supervisorType);
    List<Evaluation> findByPlacementId(Long placementId);

    long countByUniversityId(Long universityId);

    /**
     * PC11: evaluation count per student, scoped to one university, in a single
     * round trip. The dashboard previously called {@code findByStudentId} once
     * per student (twice — once to count "evaluated" students and again to build
     * the by-student rows), which is the 2N+1 the plan flags: harmless on two
     * dev students, a production-grade latency cliff on hundreds.
     *
     * <p>The {@code universityId} predicate reproduces the exact in-memory
     * filter this replaces ({@code e.universityId != null &&
     * .equals(universityId)}), including rows whose university is null, which
     * are excluded rather than counted. A student with no row here simply is
     * absent from the map, and the caller reads that as a count of zero.
     */
    @Query("SELECT e.studentId, COUNT(e) FROM Evaluation e " +
           "WHERE e.universityId = :universityId GROUP BY e.studentId")
    List<Object[]> countByStudentIdGrouped(@Param("universityId") Long universityId);

    @Query("SELECT AVG(e.punctuality), AVG(e.practicalWorkEthics), AVG(e.attendance), AVG(e.workplacePerformance) " +
           "FROM Evaluation e WHERE e.universityId = :universityId")
    Object[] averageScores(@Param("universityId") Long universityId);

    /**
     * Company-scoped counterpart. Evaluation carries no companyId of its own, so
     * the join goes through the placement it was recorded against; filtering on
     * e.universityId would let one company's evaluation average leak into
     * another's.
     */
    @Query("SELECT AVG(e.overallGrade), COUNT(e) FROM Evaluation e " +
           "JOIN Placement p ON p.id = e.placementId WHERE p.companyId = :companyId")
    List<Object[]> averageOverallGradeByCompanyId(@Param("companyId") Long companyId);

    /** Batch form of {@link #findByPlacementId}, so a dashboard load is not N+1. */
    List<Evaluation> findByPlacementIdIn(List<Long> placementIds);
}
