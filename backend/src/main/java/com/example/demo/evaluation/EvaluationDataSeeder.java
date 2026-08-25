package com.example.demo.evaluation;

import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(38)
public class EvaluationDataSeeder implements CommandLineRunner {

    private final EvaluationRepository evaluationRepository;
    private final StudentProfileRepository studentProfileRepository;

    public EvaluationDataSeeder(EvaluationRepository evaluationRepository, StudentProfileRepository studentProfileRepository) {
        this.evaluationRepository = evaluationRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @Override
    public void run(String... args) {
        if (evaluationRepository.count() == 0) {
            // Alex Johnson - mid-term evaluation by company supervisor
            studentProfileRepository.findByStudentNo("STU-2026-001").ifPresent(s ->
                evaluationRepository.save(new Evaluation(
                    s.getId(), null, "COMPANY", "john.doe@airtel.co.ug",
                    8, 7, 9, 7, null, null, null, null)));

            // Sarah Owen - mid-term evaluation by company supervisor
            studentProfileRepository.findByStudentNo("STU-2026-002").ifPresent(s ->
                evaluationRepository.save(new Evaluation(
                    s.getId(), null, "COMPANY", "john.doe@airtel.co.ug",
                    9, 8, 9, 8, null, null, null, null)));
        }
    }
}
