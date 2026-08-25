package com.example.demo.student;

import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import com.example.demo.auth.UserRepository;

@Component
@Order(36)
public class DayDiaryDataSeeder implements CommandLineRunner {

    private final DayDiaryRepository dayDiaryRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public DayDiaryDataSeeder(DayDiaryRepository dayDiaryRepository, StudentRepository studentRepository,
            UserRepository userRepository) {
        this.dayDiaryRepository = dayDiaryRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        // M4: diaries key to Model-B students; ensure the demo account has a row.
        Student owner = userRepository.findByUsername("student")
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .orElseGet(() -> {
                    return userRepository.findByUsername("student").map(user -> {
                        Student s = new Student();
                        s.setUserId(user.getId());
                        s.setUniversityId(19L);
                        s.setFirstName("Demo");
                        s.setLastName("Student");
                        s.setStudentNumber("student");
                        s.setRegistrationNumber("Pending");
                        s.setDegreeProgram("Undeclared");
                        return studentRepository.save(s);
                    }).orElse(null);
                });
        if (owner == null || dayDiaryRepository.count() > 0) {
            return;
        }

        DayDiary d1 = new DayDiary();
        d1.setDate(LocalDate.of(2026, 8, 19));
        d1.setDailyActivities("Test Demo");
        d1.setKnowledgeAndSkillsGained("Learning testing frameworks");
        d1.setAccomplishments("Demo completed");
        d1.setStatus("PENDING");
        d1.setStudentId(owner.getId());
        dayDiaryRepository.save(d1);

        DayDiary d2 = new DayDiary();
        d2.setDate(LocalDate.of(2026, 8, 20));
        d2.setDailyActivities("Test 2");
        d2.setKnowledgeAndSkillsGained("Continued testing");
        d2.setAccomplishments("More progress");
        d2.setStatus("PENDING");
        d2.setStudentId(owner.getId());
        dayDiaryRepository.save(d2);
    }
}
