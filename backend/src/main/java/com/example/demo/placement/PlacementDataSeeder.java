package com.example.demo.placement;

import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(37)
public class PlacementDataSeeder implements CommandLineRunner {

    private final PlacementRepository placementRepository;
    private final StudentRepository studentRepository;

    public PlacementDataSeeder(PlacementRepository placementRepository, StudentRepository studentRepository) {
        this.placementRepository = placementRepository;
        this.studentRepository = studentRepository;
    }

    @Override
    public void run(String... args) {
        if (placementRepository.count() == 0) {
            // Kasagga Fred -> Airtel
            studentRepository.findByStudentNumber("2400101003").ifPresent(s ->
                save(s, 1L, "university", "Nangai Zackaria"));

            // Alex Johnson -> Airtel (company_id=1)
            studentRepository.findByStudentNumber("STU-2026-001").ifPresent(s ->
                save(s, 1L, "university", "John Doe"));

            // Sarah Owen -> Airtel (company_id=1)
            studentRepository.findByStudentNumber("STU-2026-002").ifPresent(s ->
                save(s, 1L, "university", "John Doe"));
        }
    }

    private void save(Student s, Long companyId, String uniSup, String compSup) {
        Placement p = new Placement(s.getId(), companyId, uniSup, compSup, Placement.Status.ACTIVE);
        p.setUniversityId(s.getUniversityId());
        placementRepository.save(p);
    }
}
