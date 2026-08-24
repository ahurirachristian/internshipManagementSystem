package com.example.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;

@Service
@Transactional(readOnly = true)
public class AdminService {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;

    public AdminService(StudentProfileRepository studentProfileRepository, DayDiaryRepository dayDiaryRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
    }

    public List<StudentProfile> getAllStudents() {
        return studentProfileRepository.findAll(Sort.by(Sort.Direction.ASC, "studentName"));
    }

    public List<DayDiary> getAllDiaryEntries() {
        return dayDiaryRepository.findAllWithStudent();
    }

    public long countStudents() {
        return studentProfileRepository.count();
    }

    public long countDiaryEntries() {
        return dayDiaryRepository.count();
    }

    public long countActiveStudents() {
        return dayDiaryRepository.findAllWithStudent().stream()
                .map(entry -> entry.getStudentProfile().getStudentNo())
                .distinct()
                .count();
    }

    public double getAverageDiaryEntriesPerStudent() {
        long students = studentProfileRepository.count();
        if (students == 0) {
            return 0;
        }
        return (double) dayDiaryRepository.count() / students;
    }

    public Map<String, Long> getDiaryCountsByStudentNo() {
        Map<String, Long> counts = new HashMap<>();
        for (DayDiary entry : dayDiaryRepository.findAllWithStudent()) {
            counts.merge(entry.getStudentProfile().getStudentNo(), 1L, Long::sum);
        }
        return counts;
    }
}
