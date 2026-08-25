package com.example.demo.student;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByStudentNo(String studentNo);

    Optional<StudentProfile> findByRegNo(String regNo);

    Optional<StudentProfile> findByEmail(String email);

    List<StudentProfile> findByOrganisationContainingIgnoreCase(String organisation);

    List<StudentProfile> findByAcademicSupervisorId(Integer academicSupervisorId);

    List<StudentProfile> findByFieldSupervisorId(Integer fieldSupervisorId);

    List<StudentProfile> findByUnitId(Integer unitId);

    List<StudentProfile> findByCourseId(Integer courseId);

    List<StudentProfile> findByStudentNameContainingIgnoreCase(String name);

    List<StudentProfile> findByAcademicSupervisor(String academicSupervisor);
}
