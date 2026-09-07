package com.example.demo.placement;

import com.example.demo.placement.Vacancy;
import com.example.demo.placement.VacancyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(4)
public class VacancyDataSeeder implements CommandLineRunner {

    private final VacancyRepository repository;

    public VacancyDataSeeder(VacancyRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            java.util.List<Vacancy> list = new java.util.ArrayList<>();
            Vacancy e;
            e = new Vacancy();
            e.setTitle("Software Development Intern");
            e.setDescription("Assist in developing and maintaining web applications using modern frameworks.");
            e.setCompanyId(1L);
            e.setLocation("Kampala");
            e.setRequirements("Knowledge of Java, Spring Boot, and React.");
            e.setStatus("OPEN");
            e.setDeadline(java.time.LocalDate.parse("2024-12-31"));
            e.setCreatedAt(java.time.LocalDate.parse("2024-09-01"));
            list.add(e);
            e = new Vacancy();
            e.setTitle("Network Engineering Intern");
            e.setDescription("Support network operations and troubleshoot connectivity issues.");
            e.setCompanyId(2L);
            e.setLocation("Kampala");
            e.setRequirements("Basic understanding of networking protocols and Cisco systems.");
            e.setStatus("OPEN");
            e.setDeadline(java.time.LocalDate.parse("2024-11-30"));
            e.setCreatedAt(java.time.LocalDate.parse("2024-09-01"));
            list.add(e);
            repository.saveAll(list);
        }
    }
}