package com.example.demo.student;

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
}
