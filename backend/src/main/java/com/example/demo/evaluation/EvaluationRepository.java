package com.example.demo.evaluation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    List<Evaluation> findByStudentId(Long studentId);
    List<Evaluation> findByStudentIdAndSupervisorType(Long studentId, String supervisorType);
    List<Evaluation> findByPlacementId(Long placementId);
}
