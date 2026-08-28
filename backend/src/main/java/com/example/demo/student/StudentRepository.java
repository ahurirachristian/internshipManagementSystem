package com.example.demo.student;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByUserId(Long userId);

    Optional<Student> findByStudentNumber(String studentNumber);

    List<Student> findByInternshipCompanyId(Long internshipCompanyId);

    List<Student> findByUniversityId(Long universityId);

    List<Student> findByUniSupervisorId(Long uniSupervisorId);

    List<Student> findByIndSupervisorId(Long indSupervisorId);

    List<Student> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName, String lastName);

    List<Student> findByUniversityIdAndSchoolId(Long universityId, Long schoolId);

    List<Student> findByUniversityIdAndProgrammeId(Long universityId, Long programmeId);
}
