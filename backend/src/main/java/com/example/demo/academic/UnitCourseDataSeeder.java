package com.example.demo.academic;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(5)
public class UnitCourseDataSeeder implements CommandLineRunner {

    private final UnitCourseRepository repository;

    public UnitCourseDataSeeder(UnitCourseRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            // Nkumba unit-course links (unit 1-8, courses 1-62)
            // Unit 1 (SEDU): courses 1-11
            link(1, 1); link(1, 2); link(1, 3); link(1, 4); link(1, 5);
            link(1, 6); link(1, 7); link(1, 8); link(1, 9); link(1, 10); link(1, 11);
            // Unit 2 (SCI): courses 12-28
            link(2, 12); link(2, 13); link(2, 14); link(2, 15); link(2, 16);
            link(2, 17); link(2, 18); link(2, 19); link(2, 20); link(2, 21);
            link(2, 22); link(2, 23); link(2, 24); link(2, 25); link(2, 26);
            link(2, 27); link(2, 28);
            // Unit 3 (SLAW): courses 29-31
            link(3, 29); link(3, 30); link(3, 31);
            // Unit 4 (SOSS): courses 32-36
            link(4, 32); link(4, 33); link(4, 34); link(4, 35); link(4, 36);
            // Unit 5 (SCOS): courses 37-46
            link(5, 37); link(5, 38); link(5, 39); link(5, 40); link(5, 41);
            link(5, 42); link(5, 43); link(5, 44); link(5, 45); link(5, 46);
            // Unit 6 (SBA): courses 47-54, also 23,25,26
            link(6, 47); link(6, 48); link(6, 49); link(6, 50); link(6, 51);
            link(6, 52); link(6, 53); link(6, 54); link(6, 23); link(6, 25); link(6, 26);
            // Unit 7 (SCIAD): courses 55-59, also 22
            link(7, 55); link(7, 56); link(7, 57); link(7, 58); link(7, 59); link(7, 22);
            // Unit 8 (DPGSR): courses 53,60,46,59,36,61,11,35,38,54,51,52,12,62
            link(8, 53); link(8, 60); link(8, 46); link(8, 59); link(8, 36);
            link(8, 61); link(8, 11); link(8, 35); link(8, 38); link(8, 54);
            link(8, 51); link(8, 52); link(8, 12); link(8, 62);

            // Makerere unit-course links
            // Unit 26 (Dept of Computer Science): course 63
            link(26, 63);
            // Unit 18 (School of Medicine): course 64
            link(18, 64);
        }
    }

    private void link(Integer unitId, Integer courseId) {
        repository.save(new UnitCourse(unitId, courseId));
    }
}
