package com.example.demo.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Ensure demo accounts exist (idempotent)
        if (userRepository.findByUsername("student").isEmpty()) {
            userRepository.save(new UserEntity("student", passwordEncoder.encode("student123"), Role.STUDENT));
        }
        if (userRepository.findByUsername("university").isEmpty()) {
            userRepository.save(new UserEntity("university", passwordEncoder.encode("university123"), Role.SUPERVISOR));
        }
        if (userRepository.findByUsername("airtel").isEmpty()) {
            userRepository.save(new UserEntity("airtel", passwordEncoder.encode("company123"), Role.COMPANY));
        }
        if (userRepository.findByUsername("admin").isEmpty()) {
            userRepository.save(new UserEntity("admin", passwordEncoder.encode("admin123"), Role.ADMIN));
        }
    }
}
