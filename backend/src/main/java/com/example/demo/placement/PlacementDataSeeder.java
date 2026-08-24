package com.example.demo.placement;

import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(11)
public class PlacementDataSeeder implements CommandLineRunner {

    private final PlacementRepository placementRepository;
    private final StudentProfileRepository studentProfileRepository;

    public PlacementDataSeeder(PlacementRepository placementRepository, StudentProfileRepository studentProfileRepository) {
        this.placementRepository = placementRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @Override
    public void run(String... args) {
        if (placementRepository.count() == 0) {
            // Kasagga Fred -> MicroVest (no company_id in placements, use string)
            studentProfileRepository.findByStudentNo("2400101003").ifPresent(s ->
                placementRepository.save(new Placement(
                    s.getId(), 1L, "university", "Nangai Zackaria", Placement.Status.ACTIVE)));

            // Alex Johnson -> Airtel (company_id=1)
            studentProfileRepository.findByStudentNo("STU-2026-001").ifPresent(s ->
                placementRepository.save(new Placement(
                    s.getId(), 1L, "university", "John Doe", Placement.Status.ACTIVE)));

            // Sarah Owen -> Airtel (company_id=1)
            studentProfileRepository.findByStudentNo("STU-2026-002").ifPresent(s ->
                placementRepository.save(new Placement(
                    s.getId(), 1L, "university", "John Doe", Placement.Status.ACTIVE)));
        }
    }
}
