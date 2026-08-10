package com.example.demo.company;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class CompanyDataSeeder implements CommandLineRunner {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public CompanyDataSeeder(CompanyRepository companyRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (companyRepository.count() == 0) {
            Company airtel = companyRepository.save(new Company(
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

            Company mtn = companyRepository.save(new Company(
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

            // Seed a company user account linked to the Airtel company (id 1)
            if (userRepository.findByUsername("airtel").isEmpty()) {
                userRepository.save(new UserEntity("airtel",
                        passwordEncoder.encode("company123"),
                        Role.COMPANY,
                        airtel.getId(),
                        null));
            }
        }
    }
}