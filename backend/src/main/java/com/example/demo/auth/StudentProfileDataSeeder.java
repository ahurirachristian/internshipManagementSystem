package com.example.demo.auth;

import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(4)
public class StudentProfileDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public StudentProfileDataSeeder(UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            userRepository.save(new UserEntity("student", passwordEncoder.encode("student123"), Role.STUDENT));
            userRepository.save(new UserEntity("university", passwordEncoder.encode("university123"), Role.SUPERVISOR));
            userRepository.save(new UserEntity("admin", passwordEncoder.encode("admin123"), Role.ADMIN));
        }

        if (studentProfileRepository.count() == 0) {
            // Student assigned to the Airtel Uganda company (companyId "1")
            studentProfileRepository.save(new StudentProfile(
                    "student",
                    "Alex",
                    "Johnson",
                    "alex.johnson@example.com",
                    "STU-2026-001",
                    "REG-1001",
                    "Computer Science",
                    3,
                    "+1 555 123 4567",
                    "Airtel Uganda",
                    "university",
                    "IND-3456",
                    "1",
                    "/images/student-placeholder.png"
            ));

            // Additional students at the same company so the company dashboard table is populated
            studentProfileRepository.save(new StudentProfile(
                    "sarah.owen@example.com",
                    "Sarah",
                    "Owen",
                    "sarah.owen@example.com",
                    "STU-2026-002",
                    "REG-1002",
                    "Software Engineering",
                    4,
                    "+256 700 111 222",
                    "Airtel Uganda",
                    "university",
                    "IND-3456",
                    "1",
                    "/images/student-placeholder.png"
            ));

            studentProfileRepository.save(new StudentProfile(
                    "david.lutalo@example.com",
                    "David",
                    "Lutalo",
                    "david.lutalo@example.com",
                    "STU-2026-003",
                    "REG-1003",
                    "Information Technology",
                    3,
                    "+256 700 333 444",
                    "MTN Uganda",
                    "university",
                    "IND-7890",
                    "2",
                    "/images/student-placeholder.png"
            ));
        }
    }
}