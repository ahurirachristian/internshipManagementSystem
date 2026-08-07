package com.example.demo.company;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class CompanyDataSeeder implements CommandLineRunner {

    private final CompanyRepository companyRepository;

    public CompanyDataSeeder(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (companyRepository.count() == 0) {
            companyRepository.save(new Company(
                "Airtel Uganda", 
                "Kampala", 
                "info@airtel.co.ug", 
                "0700000000", 
                "www.airtel.co.ug", 
                "Telecommunications provider", 
                "IT Department", 
                "John Doe", 
                "Software Development Intern"
            ));

            companyRepository.save(new Company(
                "MTN Uganda", 
                "Kampala", 
                "support@mtn.co.ug", 
                "0770000000", 
                "www.mtn.co.ug", 
                "Telecommunications and mobile money services", 
                "Network Operations", 
                "Jane Smith", 
                "Network Engineering Intern"
            ));
        }
    }
}