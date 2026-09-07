package com.example.demo.evaluation;

import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(38)
public class EvaluationDataSeeder implements CommandLineRunner {

    private final EvaluationRepository evaluationRepository;
    private final StudentRepository studentRepository;

    public EvaluationDataSeeder(EvaluationRepository evaluationRepository, StudentRepository studentRepository) {
        this.evaluationRepository = evaluationRepository;
        this.studentRepository = studentRepository;
    }

    @Override
    public void run(String... args) {
        if (evaluationRepository.count() == 0) {
            // Alex Johnson - mid-term evaluation by company supervisor
            studentRepository.findByStudentNumber("STU-2026-001").ifPresent(s ->
                save(s, "COMPANY", "john.doe@airtel.co.ug", 8, 7, 9, 7));

            // Sarah Owen - mid-term evaluation by company supervisor
            studentRepository.findByStudentNumber("STU-2026-002").ifPresent(s ->
                save(s, "COMPANY", "john.doe@airtel.co.ug", 9, 8, 9, 8));
        }
    }

    private void save(Student s, String type, String username, int punct, int ethics, int attend, int perf) {
        Evaluation e = new Evaluation(s.getId(), null, type, username,
                punct, ethics, attend, perf, null, null, null, null);
        e.setUniversityId(s.getUniversityId());
        evaluationRepository.save(e);
    }
}
