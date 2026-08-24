package com.example.demo.company;

import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(3)
public class CompanyDataSeeder implements CommandLineRunner {

    private final CompanyRepository repository;
    private final com.example.demo.auth.UserRepository userRepository;

    public CompanyDataSeeder(CompanyRepository repository, com.example.demo.auth.UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            java.util.List<Company> list = new java.util.ArrayList<>();
            Company e;
            e = new Company();
            e.setDepartment("IT Department");
            e.setEmail("info@airtel.co.ug");
            e.setFieldSupervisor("John Doe");
            e.setLocation("Kampala");
            e.setName("Airtel Uganda");
            e.setPhone("0700000000");
            e.setProfile("Telecommunications provider");
            e.setRoles("Software Development Intern");
            e.setWebsite("www.airtel.co.ug");
            list.add(e);
            e = new Company();
            e.setDepartment("Network Operations");
            e.setEmail("support@mtn.co.ug");
            e.setFieldSupervisor("Jane Smith");
            e.setLocation("Kampala");
            e.setName("MTN Uganda");
            e.setPhone("0770000000");
            e.setProfile("Telecommunications and mobile money services");
            e.setRoles("Network Engineering Intern");
            e.setWebsite("www.mtn.co.ug");
            list.add(e);
            repository.saveAll(list);
        }
                // Ensure the seeded company user is linked to the first company (idempotent),
                // even when the companies already exist in the database.
                Company firstCompany = repository.findAll().stream()
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
