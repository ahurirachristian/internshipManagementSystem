package com.example.demo.student;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DayDiaryRepository extends JpaRepository<DayDiary, Long> {
    List<DayDiary> findByStudentProfileUsernameOrderByDateDesc(String username);

    @Query("SELECT d FROM DayDiary d JOIN FETCH d.studentProfile ORDER BY d.date DESC")
    List<DayDiary> findAllWithStudent();
}
