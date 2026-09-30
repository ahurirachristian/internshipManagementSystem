package com.example.demo.course;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * P8 (R8): minimal demo seed — a handful of course units for the Nkumba
 * Information Systems and Technology programme (programmeId 2019), years
 * 1..4. Deliberately NOT part of the migration catalog (the
 * MigrationCatalogCountTest gate stays untouched).
 */
@Component
@Order(40)
public class CourseDataSeeder implements CommandLineRunner {

    private final CourseRepository courseRepository;

    public CourseDataSeeder(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Override
    public void run(String... args) {
        if (courseRepository.count() > 0) {
            return;
        }
        // Nkumba University (19) — Bachelors in Information Systems and Technology.
        Long universityId = 19L;
        Long programmeId = 2019L;

        courseRepository.save(new Course(universityId, programmeId, 1, "IST1201", "Introduction to Information Systems"));
        courseRepository.save(new Course(universityId, programmeId, 1, "IST1202", "Computer Fundamentals"));
        courseRepository.save(new Course(universityId, programmeId, 1, "IST1203", "Discrete Mathematics"));
        courseRepository.save(new Course(universityId, programmeId, 2, "IST2201", "Database Systems"));
        courseRepository.save(new Course(universityId, programmeId, 2, "IST2202", "Object Oriented Programming"));
        courseRepository.save(new Course(universityId, programmeId, 2, "IST2203", "Data Structures and Algorithms"));
        courseRepository.save(new Course(universityId, programmeId, 3, "IST3201", "Software Engineering"));
        courseRepository.save(new Course(universityId, programmeId, 3, "IST3202", "Network Administration"));
        courseRepository.save(new Course(universityId, programmeId, 3, "IST3203", "Web Application Development"));
        courseRepository.save(new Course(universityId, programmeId, 4, "IST4201", "Information Systems Project"));
        courseRepository.save(new Course(universityId, programmeId, 4, "IST4202", "IS Strategy and Governance"));
    }
}
