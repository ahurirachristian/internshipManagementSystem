package com.example.demo.supervisor;

import com.example.demo.auth.UserRepository;
import com.example.demo.company.InternshipCompanyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * M1: Nkumba demo industrial supervisor bound to the COMPANY user account
 * and the seeded demo internship company. Real supervisors are converted
 * from company_supervisors by the M5.5 ETL.
 */
@Component
@Order(35)
public class IndustrialSupervisorDataSeeder implements CommandLineRunner {

    private final IndustrialSupervisorRepository repository;
    private final UserRepository userRepository;
    private final InternshipCompanyRepository companyRepository;

    public IndustrialSupervisorDataSeeder(IndustrialSupervisorRepository repository,
                                          UserRepository userRepository,
                                          InternshipCompanyRepository companyRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        Long companyId = companyRepository.findAll().stream()
                .filter(c -> "Airtel Uganda".equalsIgnoreCase(c.getCompanyName()))
                .map(c -> c.getId())
                .findFirst()
                .orElse(null);
        userRepository.findByUsername("airtel").ifPresent(u -> {
            if (companyId == null) {
                return;
            }
            IndustrialSupervisor e = new IndustrialSupervisor();
            e.setUserId(u.getId());
            e.setCompanyId(companyId);
            e.setFirstName("Grace");
            e.setLastName("Nabatanzi");
            e.setJobTitle("Network Operations Manager");
            e.setDepartment("Technology");
            e.setPhoneNumber("+256700000002");
            repository.save(e);
        });
    }
}
