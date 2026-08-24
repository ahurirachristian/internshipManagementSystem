package com.example.demo.company;

import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(3)
public class CompanyDataSeeder implements CommandLineRunner {

    private final CompanyRepository companyRepository;
    private final CompanyDepartmentRepository departmentRepository;
    private final CompanySupervisorRepository supervisorRepository;
    private final UserRepository userRepository;

    public CompanyDataSeeder(CompanyRepository companyRepository,
            CompanyDepartmentRepository departmentRepository,
            CompanySupervisorRepository supervisorRepository,
            UserRepository userRepository) {
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
        this.supervisorRepository = supervisorRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (companyRepository.count() == 0) {
            Company airtel = new Company();
            airtel.setName("Airtel Uganda");
            airtel.setRegistrationNumber("UBS-2010-12345");
            airtel.setIndustry("Telecommunications");
            airtel.setSize(Company.Size.Large);
            airtel.setWebsite("www.airtel.co.ug");
            airtel.setEmail("info@airtel.co.ug");
            airtel.setPhone("0700000000");
            airtel.setCountry("Uganda");
            airtel.setCity("Kampala");
            airtel.setPhysicalAddress("Plot 1, Airtel Road, Nakawa");
            airtel.setPostalAddress("P.O. Box 12345, Kampala");
            airtel.setDescription("Leading telecommunications and mobile money services provider in Uganda.");
            companyRepository.save(airtel);

            Company mtn = new Company();
            mtn.setName("MTN Uganda");
            mtn.setRegistrationNumber("UBS-2008-67890");
            mtn.setIndustry("Telecommunications");
            mtn.setSize(Company.Size.Enterprise);
            mtn.setWebsite("www.mtn.co.ug");
            mtn.setEmail("support@mtn.co.ug");
            mtn.setPhone("0770000000");
            mtn.setCountry("Uganda");
            mtn.setCity("Kampala");
            mtn.setPhysicalAddress("MTN Tower, Plot 2, Kampala Road");
            mtn.setPostalAddress("P.O. Box 23456, Kampala");
            mtn.setDescription("Uganda's largest mobile network operator offering voice, data, and mobile money services.");
            companyRepository.save(mtn);

            CompanyDepartment airtelIt = new CompanyDepartment();
            airtelIt.setCompany(airtel);
            airtelIt.setDepartmentName("IT Department");
            airtelIt.setHeadName("Patrick Okello");
            airtelIt.setHeadContact("0756100001");
            airtelIt.setHeadEmail("pat.okello@airtel.co.ug");
            departmentRepository.save(airtelIt);

            CompanyDepartment airtelNet = new CompanyDepartment();
            airtelNet.setCompany(airtel);
            airtelNet.setDepartmentName("Network Operations");
            airtelNet.setHeadName("Grace Nambogo");
            airtelNet.setHeadContact("0756100002");
            airtelNet.setHeadEmail("grace.nambogo@airtel.co.ug");
            departmentRepository.save(airtelNet);

            CompanyDepartment airtelMkt = new CompanyDepartment();
            airtelMkt.setCompany(airtel);
            airtelMkt.setDepartmentName("Marketing");
            airtelMkt.setHeadName("David Ssemwanga");
            airtelMkt.setHeadContact("0756100003");
            airtelMkt.setHeadEmail("david.ssemwanga@airtel.co.ug");
            departmentRepository.save(airtelMkt);

            CompanyDepartment mtnNet = new CompanyDepartment();
            mtnNet.setCompany(mtn);
            mtnNet.setDepartmentName("Network Operations");
            mtnNet.setHeadName("Samuel Mugisha");
            mtnNet.setHeadContact("0771100001");
            mtnNet.setHeadEmail("sam.mugisha@mtn.co.ug");
            departmentRepository.save(mtnNet);

            CompanyDepartment mtnMm = new CompanyDepartment();
            mtnMm.setCompany(mtn);
            mtnMm.setDepartmentName("Mobile Money");
            mtnMm.setHeadName("Catherine Auma");
            mtnMm.setHeadContact("0771100002");
            mtnMm.setHeadEmail("cath.auma@mtn.co.ug");
            departmentRepository.save(mtnMm);

            CompanyDepartment mtnCs = new CompanyDepartment();
            mtnCs.setCompany(mtn);
            mtnCs.setDepartmentName("Customer Service");
            mtnCs.setHeadName("Robert Kamoga");
            mtnCs.setHeadContact("0771100003");
            mtnCs.setHeadEmail("rob.kamoga@mtn.co.ug");
            departmentRepository.save(mtnCs);

            CompanySupervisor airtelSup = new CompanySupervisor();
            airtelSup.setCompany(airtel);
            airtelSup.setDepartment(airtelIt);
            airtelSup.setFullName("John Doe");
            airtelSup.setContact("0756200001");
            airtelSup.setEmail("john.doe@airtel.co.ug");
            airtelSup.setRole("Field Supervisor");
            airtelSup.setIsPrimary(true);
            supervisorRepository.save(airtelSup);

            CompanySupervisor mtnSup = new CompanySupervisor();
            mtnSup.setCompany(mtn);
            mtnSup.setDepartment(mtnNet);
            mtnSup.setFullName("Jane Smith");
            mtnSup.setContact("0771200001");
            mtnSup.setEmail("jane.smith@mtn.co.ug");
            mtnSup.setRole("Field Supervisor");
            mtnSup.setIsPrimary(true);
            supervisorRepository.save(mtnSup);
        }

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
