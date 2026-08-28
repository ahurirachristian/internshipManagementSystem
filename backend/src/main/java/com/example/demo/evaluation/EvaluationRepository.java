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
}
