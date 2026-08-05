package com.example.demo.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            userRepository.save(new UserEntity("student", passwordEncoder.encode("student123"), Role.STUDENT));
            userRepository.save(new UserEntity("supervisor", passwordEncoder.encode("supervisor123"), Role.SUPERVISOR));
            userRepository.save(new UserEntity("admin", passwordEncoder.encode("admin123"), Role.ADMIN));
        }
    }
}
