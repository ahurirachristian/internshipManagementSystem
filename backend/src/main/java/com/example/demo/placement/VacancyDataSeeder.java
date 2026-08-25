package com.example.demo.placement;

import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(39)
public class VacancyDataSeeder implements CommandLineRunner {

    private final VacancyRepository vacancyRepository;

    public VacancyDataSeeder(VacancyRepository vacancyRepository) {
        this.vacancyRepository = vacancyRepository;
    }

    @Override
    public void run(String... args) {
        if (vacancyRepository.count() == 0) {
            // Airtel vacancies (company_id=1)
            vacancyRepository.save(new Vacancy(
                "Software Development Intern",
                "Join Airtel Uganda's IT team for a 3-month internship in software development.",
                1L, "Kampala", "Currently enrolled in a Computer Science or IT program",
                "OPEN", LocalDate.of(2026, 9, 30), LocalDate.of(2026, 8, 1)));

            vacancyRepository.save(new Vacancy(
                "Network Operations Intern",
                "Assist the Network Operations team with monitoring and maintaining telecom infrastructure.",
                1L, "Kampala", "Enrolled in Telecommunications or Electronics Engineering",
                "OPEN", LocalDate.of(2026, 9, 30), LocalDate.of(2026, 8, 1)));

            // MTN vacancy (company_id=2)
            vacancyRepository.save(new Vacancy(
                "Mobile Money Operations Intern",
                "Support the Mobile Money team with customer support and operations.",
                2L, "Kampala", "Enrolled in Business, IT, or related program",
                "OPEN", LocalDate.of(2026, 9, 30), LocalDate.of(2026, 8, 1)));
        }
    }
}
