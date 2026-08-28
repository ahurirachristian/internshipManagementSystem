package com.example.demo.student;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DayDiaryRepository extends JpaRepository<DayDiary, Long> {
    List<DayDiary> findByStudentIdOrderByDateDesc(Long studentId);
}
