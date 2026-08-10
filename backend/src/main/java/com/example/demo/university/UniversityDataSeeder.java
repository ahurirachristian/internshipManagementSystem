package com.example.demo.university;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
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
            University mit = universityRepository.save(new University("Massachusetts Institute of Technology"));
            universityRepository.save(new University("Stanford University"));
            universityRepository.save(new University("Harvard University"));
            universityRepository.save(new University("University of California, Berkeley"));
            universityRepository.save(new University("California Institute of Technology"));
            universityRepository.save(new University("University of Oxford"));
            universityRepository.save(new University("University of Cambridge"));
            universityRepository.save(new University("Imperial College London"));
            universityRepository.save(new University("ETH Zurich"));
            universityRepository.save(new University("University of Toronto"));

            // Link the seeded supervisor user to the first university
            userRepository.findByUsername("university").ifPresent(user -> {
                user.setUniversityId(mit.getId());
                userRepository.save(user);
            });
        }
    }
}