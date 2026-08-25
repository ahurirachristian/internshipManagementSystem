package com.example.demo;

import com.example.demo.auth.UserRepository;
import com.example.demo.country.CountryRepository;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.role.RoleRepository;
import com.example.demo.school.SchoolRepository;
import com.example.demo.supervisor.IndustrialSupervisorRepository;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import com.example.demo.university.UniversityRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * M1 gate (MIGRATION_PLAN.md): catalog seeders produce exactly the approved
 * Nkumba + Kyambogo + Makerere slices on a fresh boot.
 */
@SpringBootTest
class MigrationCatalogCountTest {

    @Autowired SchoolRepository schoolRepository;
    @Autowired DepartmentRepository departmentRepository;
    @Autowired ProgrammeRepository programmeRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UniversityRepository universityRepository;
    @Autowired CountryRepository countryRepository;
    @Autowired UserRepository userRepository;
    @Autowired com.example.demo.company.InternshipCompanyRepository internshipCompanyRepository;
    @Autowired UniversitySupervisorRepository universitySupervisorRepository;
    @Autowired IndustrialSupervisorRepository industrialSupervisorRepository;

    @Test
    void catalogCountsMatchM1Ruling() {
        assertEquals(51, schoolRepository.count(), "schools 8 NK + 14 KYU + 29 MAK");
        assertEquals(109, departmentRepository.count(), "0 NK + 58 KYU + 51 MAK");
        assertEquals(307, programmeRepository.count(), "62 NK + 131 KYU + 114 MAK");
        assertEquals(4, roleRepository.count());
        assertEquals(50, universityRepository.count());
        assertEquals(196, countryRepository.count());

        long nkSchools = schoolRepository.findAll().stream()
                .filter(s -> s.getUniversityId() == 19).count();
        assertEquals(8, nkSchools);
        assertTrue(schoolRepository.findAll().stream()
                .anyMatch(s -> s.getUniversityId() == 19
                        && "DIRECTORATE".equals(s.getType())
                        && s.getParentSchoolId() == null));
        assertTrue(programmeRepository.findAll().stream()
                .filter(p -> p.getUniversityId() == 19)
                .allMatch(p -> p.getDepartmentId() == null),
                "Nkumba is flat: every NK programme has NULL departmentId");

        assertTrue(internshipCompanyRepository.count() >= 1);
        assertEquals(1, universitySupervisorRepository.count());
        assertEquals(1, industrialSupervisorRepository.count());
        assertEquals(6, userRepository.count());
    }
}
