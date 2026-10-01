package com.example.demo.student;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DayDiaryRepository extends JpaRepository<DayDiary, Long> {
    List<DayDiary> findByStudentIdOrderByDateDesc(Long studentId);

    long countByUniversityId(Long universityId);

    long countByUniversityIdAndStatus(Long universityId, String status);

    List<DayDiary> findTop10ByUniversityIdOrderByDateDesc(Long universityId);

    @Query("SELECT d.status, COUNT(d) FROM DayDiary d WHERE d.universityId = :universityId GROUP BY d.status")
    List<Object[]> countByStatusGrouped(@Param("universityId") Long universityId);

    /**
     * PC5: students of this university with no diary entry dated on or after
     * {@code sinceDate}. Expressed as NOT EXISTS rather than a "latest date per
     * student" group-by, so a student who has never submitted is included —
     * which is precisely the case a supervisor needs to see.
     */
    @Query("SELECT s.id, s.firstName, s.lastName, s.studentNumber " +
           "FROM Student s WHERE s.universityId = :universityId AND NOT EXISTS (" +
           "SELECT d.id FROM DayDiary d WHERE d.studentId = s.id AND d.date >= :sinceDate) " +
           "ORDER BY s.lastName, s.firstName")
    List<Object[]> findStudentsWithoutDiarySince(@Param("universityId") Long universityId,
                                                 @Param("sinceDate") LocalDate sinceDate);

    /** Newest diary date per student, for showing how stale each one actually is. */
    @Query("SELECT d.studentId, MAX(d.date) FROM DayDiary d " +
           "WHERE d.universityId = :universityId GROUP BY d.studentId")
    List<Object[]> findLatestDiaryDatePerStudent(@Param("universityId") Long universityId);
}
