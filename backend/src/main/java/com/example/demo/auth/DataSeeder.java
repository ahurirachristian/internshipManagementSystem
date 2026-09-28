package com.example.demo.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(32)
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DataSeeder.class);
        boolean isNew = userRepository.count() == 0;
        if (isNew) {
            log.info("Seeding default accounts (users table empty)");
        }
        ensureUser("2400101003", "Student@123", Role.STUDENT, "kasaggafred999@gmail.com", null, null);
        ensureUser("STU-2026-001", "Student@123", Role.STUDENT, "alex.johnson@example.com", null, null);
        ensureUser("STU-2026-002", "Student@123", Role.STUDENT, "sarah.owen@example.com", null, null);

        ensureUser("student", "student123", Role.STUDENT, "student@example.com", null, null);

        ensureUser("university", "university123", Role.SUPERVISOR, "supervisor@mak.ac.ug", null, 19L);

        ensureUser("supervisor", "supervisor123", Role.SUPERVISOR, "supervisor@example.com", null, 1L);

        ensureUser("kyu", "kyu123", Role.SUPERVISOR, "supervisor@kyu.ac.ug", null, 2L);

        ensureUser("airtel", "company123", Role.COMPANY, "info@airtel.co.ug", 1L, null);

        ensureUser("admin", "admin123", Role.ADMIN, "admin@ims.ac.ug", null, null);
    }

    private void ensureUser(String username, String password, Role role, String email, Long companyId, Long universityId) {
        userRepository.findByUsername(username).ifPresentOrElse(
            existing -> {
                existing.setPassword(passwordEncoder.encode(password));
                existing.setEmail(email);
                existing.setRole(role);
                existing.setCompanyId(companyId);
                existing.setUniversityId(universityId);
                userRepository.save(existing);
            },
            () -> saveUser(username, password, role, email, companyId, universityId)
        );
    }

    private void saveUser(String username, String password, Role role, String email, Long companyId, Long universityId) {
        UserEntity user = new UserEntity(username, passwordEncoder.encode(password), role);
        user.setEmail(email);
        user.setCompanyId(companyId);
        user.setUniversityId(universityId);
        user.setMustChangePassword(role == Role.STUDENT);
        userRepository.save(user);
    }
}
