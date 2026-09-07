package com.example.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.student.StudentRepository;

@Service
@Transactional(readOnly = true)
public class AdminService {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public AdminService(StudentProfileRepository studentProfileRepository, DayDiaryRepository dayDiaryRepository,
            StudentRepository studentRepository, UserRepository userRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
    }

    public List<StudentProfile> getAllStudents() {
        return studentProfileRepository.findAll(Sort.by(Sort.Direction.ASC, "studentName"));
    }

    public long countStudents() {
        return studentProfileRepository.count();
    }

    public long countDiaryEntries() {
        return dayDiaryRepository.count();
    }

    public long countActiveStudents() {
        return dayDiaryRepository.findAll().stream()
                .map(DayDiary::getStudentId)
                .filter(java.util.Objects::nonNull)
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

    /**
     * M4: counts keyed by the Model-B student's username so React dashboards
     * can look them up directly.
     */
    public Map<String, Long> getDiaryCountsByStudentNo() {
        Map<Long, String> usernamesByStudentId = new HashMap<>();
        for (com.example.demo.student.Student s : studentRepository.findAll()) {
            usernamesByStudentId.put(s.getId(), userRepository.findById(s.getUserId())
                    .map(u -> u.getUsername()).orElse(""));
        }
        Map<String, Long> counts = new HashMap<>();
        for (DayDiary entry : dayDiaryRepository.findAll()) {
            String username = usernamesByStudentId.get(entry.getStudentId());
            if (username != null && !username.isEmpty()) {
                counts.merge(username, 1L, Long::sum);
            }
        }
        return counts;
    }

    /**
     * M4: flattened diary views (student identity resolved from Model-B)
     * for templates that previously navigated entry.studentProfile.*.
     */
    public List<Map<String, Object>> getDiaryViews() {
        Map<Long, com.example.demo.student.Student> studentsById = new HashMap<>();
        for (com.example.demo.student.Student s : studentRepository.findAll()) {
            studentsById.put(s.getId(), s);
        }
        List<Map<String, Object>> views = new java.util.ArrayList<>();
        for (DayDiary entry : dayDiaryRepository.findAll()) {
            Map<String, Object> view = new HashMap<>();
            view.put("id", entry.getId());
            view.put("date", entry.getDate());
            view.put("dailyActivities", entry.getDailyActivities());
            view.put("knowledgeAndSkillsGained", entry.getKnowledgeAndSkillsGained());
            view.put("accomplishments", entry.getAccomplishments());
            view.put("status", entry.getStatus());
            view.put("supervisorFeedback", entry.getSupervisorFeedback());
            com.example.demo.student.Student owner = studentsById.get(entry.getStudentId());
            view.put("studentName", owner != null ? owner.getFirstName() + " " + owner.getLastName() : "");
            view.put("studentNo", owner != null ? owner.getStudentNumber() : "");
            views.add(view);
        }
        return views;
    }
}
