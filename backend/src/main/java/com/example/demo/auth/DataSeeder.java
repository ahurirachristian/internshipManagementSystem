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
        // Students — login with student_no as username, default password: Student@123
        ensureUser("2400101003", "Student@123", Role.STUDENT, "kasaggafred999@gmail.com", null, null);
        ensureUser("STU-2026-001", "Student@123", Role.STUDENT, "alex.johnson@example.com", null, null);
        ensureUser("STU-2026-002", "Student@123", Role.STUDENT, "sarah.owen@example.com", null, null);

        // Supervisor — linked to Nkumba University (university_id = 19)
        ensureUser("university", "university123", Role.SUPERVISOR, "supervisor@mak.ac.ug", null, 19L);

        // Supervisor — linked to Kyambogo University (university_id = 2)
        ensureUser("kyu", "kyu123", Role.SUPERVISOR, "supervisor@kyu.ac.ug", null, 2L);

        // Company — linked to Airtel Uganda (company_id = 1)
        ensureUser("airtel", "company123", Role.COMPANY, "info@airtel.co.ug", 1L, null);

        // Admin
        ensureUser("admin", "admin123", Role.ADMIN, "admin@ims.ac.ug", null, null);
    }

    private void ensureUser(String username, String password, Role role, String email, Long companyId, Long universityId) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }
        saveUser(username, password, role, email, companyId, universityId);
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
