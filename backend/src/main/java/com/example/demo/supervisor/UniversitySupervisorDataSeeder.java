package com.example.demo.supervisor;

import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * M1: Nkumba demo university supervisor bound to the existing SUPERVISOR
 * user account, so placement assignment flows resolve pre-M5.
 */
@Component
@Order(34)
public class UniversitySupervisorDataSeeder implements CommandLineRunner {

    private final UniversitySupervisorRepository repository;
    private final UserRepository userRepository;

    public UniversitySupervisorDataSeeder(UniversitySupervisorRepository repository,
                                          UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        userRepository.findByUsername("university").ifPresent(u -> {
            UniversitySupervisor e = new UniversitySupervisor();
            e.setUserId(u.getId());
            e.setUniversityId(19L);
            e.setFirstName("David");
            e.setLastName("Ssemakula");
            e.setDepartment("School of Computing and Informatics");
            e.setPhoneNumber("+256700000001");
            repository.save(e);
        });
    }
}
