package com.example.demo.university;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class UniversityDataSeeder implements CommandLineRunner {

    private final UniversityRepository universityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UniversityDataSeeder(UniversityRepository universityRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.universityRepository = universityRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (universityRepository.count() == 0) {
            universityRepository.save(new University("Massachusetts Institute of Technology"));
            universityRepository.save(new University("Stanford University"));
            universityRepository.save(new University("Harvard University"));
            universityRepository.save(new University("University of California, Berkeley"));
            universityRepository.save(new University("California Institute of Technology"));
            universityRepository.save(new University("University of Oxford"));
            universityRepository.save(new University("University of Cambridge"));
            universityRepository.save(new University("Imperial College London"));
            universityRepository.save(new University("ETH Zurich"));
            universityRepository.save(new University("University of Toronto"));
        }

        // Ensure the seeded supervisor user is linked to the first university (idempotent),
        // even when the universities already exist in the database.
        University firstUniversity = universityRepository.findAll().stream()
                .min((a, b) -> Long.compare(a.getId(), b.getId()))
                .orElse(null);
        if (firstUniversity != null) {
            userRepository.findByUsername("university").ifPresent(user -> {
                if (user.getUniversityId() == null) {
                    user.setUniversityId(firstUniversity.getId());
                    userRepository.save(user);
                }
            });
        }
    }
}