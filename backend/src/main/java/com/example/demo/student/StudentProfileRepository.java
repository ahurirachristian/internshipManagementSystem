package com.example.demo.student;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByUsername(String username);

    List<StudentProfile> findByCompanyId(Long companyId);

    List<StudentProfile> findByCompanyIdIgnoreCase(Long companyId);

    List<StudentProfile> findByUniversitySupervisor(String universitySupervisor);

    List<StudentProfile> findByUniversitySupervisorIgnoreCase(String universitySupervisor);

    List<StudentProfile> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName, String lastName);
}
