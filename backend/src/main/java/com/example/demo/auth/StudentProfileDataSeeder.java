package com.example.demo.auth;

import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
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
            userRepository.save(new UserEntity("supervisor", passwordEncoder.encode("supervisor123"), Role.SUPERVISOR));
            userRepository.save(new UserEntity("admin", passwordEncoder.encode("admin123"), Role.ADMIN));
        }

        if (studentProfileRepository.count() == 0) {
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
                    "TechCorp Solutions",
                    "Dr. Emily Carter",
                    "IND-3456",
                    "COMP-2024",
                    "/images/student-placeholder.png"
            ));
        }
    }
}
