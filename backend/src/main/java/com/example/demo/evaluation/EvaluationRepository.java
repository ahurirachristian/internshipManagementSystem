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
