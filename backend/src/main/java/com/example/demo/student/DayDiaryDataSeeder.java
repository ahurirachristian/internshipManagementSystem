package com.example.demo.student;

import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(10)
public class DayDiaryDataSeeder implements CommandLineRunner {

    private final DayDiaryRepository dayDiaryRepository;
    private final StudentProfileRepository studentProfileRepository;

    public DayDiaryDataSeeder(DayDiaryRepository dayDiaryRepository, StudentProfileRepository studentProfileRepository) {
        this.dayDiaryRepository = dayDiaryRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @Override
    public void run(String... args) {
        if (dayDiaryRepository.count() == 0) {
            studentProfileRepository.findByStudentNo("2400101003").ifPresent(student -> {
                DayDiary d1 = new DayDiary();
                d1.setDate(LocalDate.of(2026, 8, 19));
                d1.setDailyActivities("Test Demo");
                d1.setKnowledgeAndSkillsGained("Learning testing frameworks");
                d1.setAccomplishments("Demo completed");
                d1.setStatus("PENDING");
                d1.setStudentProfile(student);
                dayDiaryRepository.save(d1);

                DayDiary d2 = new DayDiary();
                d2.setDate(LocalDate.of(2026, 8, 20));
                d2.setDailyActivities("Test 2");
                d2.setKnowledgeAndSkillsGained("Continued testing");
                d2.setAccomplishments("More progress");
                d2.setStatus("PENDING");
                d2.setStudentProfile(student);
                dayDiaryRepository.save(d2);
            });
        }
    }
}
