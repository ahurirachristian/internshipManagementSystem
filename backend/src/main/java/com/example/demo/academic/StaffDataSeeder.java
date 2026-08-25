package com.example.demo.academic;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(29)
public class StaffDataSeeder implements CommandLineRunner {

    private final StaffRepository repository;

    public StaffDataSeeder(StaffRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            // Academic supervisor at Nkumba (university_id=19, unit_id=2 = SCI)
            repository.save(new Staff(19, 2, "Ssemaganda Shuraim", "075887005", "shuraim@nkumba.ac.ug", "Academic Supervisor"));
            // External field supervisor (no university, no unit)
            repository.save(new Staff(null, null, "Nangai Zackaria", "0784723705", "zackaria@company.com", "Field Supervisor"));
        }
    }
}
