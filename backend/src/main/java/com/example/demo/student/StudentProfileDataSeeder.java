package com.example.demo.student;

import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(9)
public class StudentProfileDataSeeder implements CommandLineRunner {

    private final StudentProfileRepository repository;

    public StudentProfileDataSeeder(StudentProfileRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            java.util.List<StudentProfile> list = new java.util.ArrayList<>();
            StudentProfile e;
            e = new StudentProfile();
            e.setCompanyId("COMP-2024");
            e.setDegreeProgram("Computer Science");
            e.setEmail("alex.johnson@example.com");
            e.setFirstName("Alex");
            e.setIndustrialSupervisorId("IND-3456");
            e.setInternshipCompany("TechCorp Solutions");
            e.setLastName("Johnson");
            e.setPhoneNumber("+1 555 123 4567");
            e.setPictureUrl("/images/student-placeholder.png");
            e.setRegistrationNumber("REG-1001");
            e.setStudentNumber("STU-2026-001");
            e.setUniversitySupervisor("university");
            e.setUsername("student");
            e.setYearOfStudy(3);
            list.add(e);
            repository.saveAll(list);
        }
        repository.findByUsername("student").ifPresent(student -> {
            if (!"university".equals(student.getUniversitySupervisor())) {
                student.setUniversitySupervisor("university");
                repository.save(student);
            }
        });
    }
}
