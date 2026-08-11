package com.example.demo.company;

import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(3)
public class CompanyDataSeeder implements CommandLineRunner {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    public CompanyDataSeeder(CompanyRepository companyRepository,
            UserRepository userRepository) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
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

        // Ensure the seeded company user is linked to the first company (idempotent),
        // even when the companies already exist in the database.
        Company firstCompany = companyRepository.findAll().stream()
                .min((a, b) -> Long.compare(a.getId(), b.getId()))
                .orElse(null);
        if (firstCompany != null) {
            userRepository.findByUsername("airtel").ifPresent(user -> {
                if (user.getCompanyId() == null) {
                    user.setCompanyId(firstCompany.getId());
                    userRepository.save(user);
                }
            });
        }
    }
}