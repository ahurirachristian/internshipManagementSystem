package com.example.demo.evaluation;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.student.StudentRepository;

@Service
@Transactional
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final StudentRepository studentRepository;

    public EvaluationService(EvaluationRepository evaluationRepository, StudentRepository studentRepository) {
        this.evaluationRepository = evaluationRepository;
        this.studentRepository = studentRepository;
    }

    public List<Evaluation> findAll() {
        return evaluationRepository.findAll();
    }

    public List<Evaluation> findByStudentId(Long studentId) {
        return evaluationRepository.findByStudentId(studentId);
    }

    public Evaluation findById(Long id) {
        return evaluationRepository.findById(id).orElse(null);
    }

    public Evaluation create(Evaluation evaluation) {
        if (evaluation.getUniversityId() == null && evaluation.getStudentId() != null) {
            studentRepository.findById(evaluation.getStudentId())
                    .ifPresent(s -> evaluation.setUniversityId(s.getUniversityId()));
        }
        return evaluationRepository.save(evaluation);
    }

    public Evaluation update(Long id, Evaluation evaluation) {
        Evaluation existing = evaluationRepository.findById(id).orElse(null);
        if (existing == null) return null;
        existing.setPunctuality(evaluation.getPunctuality());
        existing.setPracticalWorkEthics(evaluation.getPracticalWorkEthics());
        existing.setAttendance(evaluation.getAttendance());
        existing.setWorkplacePerformance(evaluation.getWorkplacePerformance());
        existing.setLogbookQuality(evaluation.getLogbookQuality());
        existing.setAcademicReport(evaluation.getAcademicReport());
        existing.setPresentation(evaluation.getPresentation());
        existing.setOverallGrade(evaluation.getOverallGrade());
        return evaluationRepository.save(existing);
    }

    public void delete(Long id) {
        evaluationRepository.deleteById(id);
    }
}
