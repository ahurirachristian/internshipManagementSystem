package com.example.demo.company;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * M1: demo internship company so supervisor/assignment flows have a
 * Model-B anchor pre-ETL. Real companies are converted by
 * backend/migration/modelb_etl.sql in M5.5.
 */
@Component
@Order(31)
public class InternshipCompanyDataSeeder implements CommandLineRunner {

    private final InternshipCompanyRepository repository;
    private final com.example.demo.country.CountryRepository countryRepository;

    public InternshipCompanyDataSeeder(InternshipCompanyRepository repository,
                                       com.example.demo.country.CountryRepository countryRepository) {
        this.repository = repository;
        this.countryRepository = countryRepository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        Integer ugandaId = countryRepository.findAll().stream()
                .filter(c -> "Uganda".equalsIgnoreCase(c.getName()))
                .map(c -> c.getId().intValue())
                .findFirst()
                .orElse(1);

        InternshipCompany e = new InternshipCompany();
        e.setCompanyName("Airtel Uganda");
        e.setEmail("hr@airtel.co.ug");
        e.setPostalAddress("P.O. Box 7152, Kampala");
        e.setPhysicalAddress("Airtel House, Plot 4 Wampewo Avenue, Kampala");
        e.setWebsite("https://www.airtel.co.ug");
        e.setBranch("Kampala Head Office");
        e.setCountryId(ugandaId);
        e.setUniversityId(19L);
        e.setCreatedAt(LocalDateTime.now());
        repository.save(e);
    }
}
