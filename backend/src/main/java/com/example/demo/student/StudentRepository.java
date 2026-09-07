package com.example.demo.student;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    long countByUniversityId(Long universityId);

    @Query("SELECT s.yearOfStudy, COUNT(s) FROM Student s WHERE s.universityId = :universityId GROUP BY s.yearOfStudy")
    List<Object[]> countByUniversityIdGroupByYearOfStudy(@Param("universityId") Long universityId);

    @Query("SELECT s.gender, COUNT(s) FROM Student s WHERE s.universityId = :universityId GROUP BY s.gender")
    List<Object[]> countByUniversityIdGroupByGender(@Param("universityId") Long universityId);

    @Query("SELECT s.programmeId, COUNT(s) FROM Student s WHERE s.universityId = :universityId AND s.programmeId IS NOT NULL GROUP BY s.programmeId")
    List<Object[]> countByUniversityIdGroupByProgrammeId(@Param("universityId") Long universityId);

    @Query("SELECT s.degreeProgram, COUNT(s) FROM Student s WHERE s.universityId = :universityId GROUP BY s.degreeProgram")
    List<Object[]> countByUniversityIdGroupByDegreeProgram(@Param("universityId") Long universityId);
}
