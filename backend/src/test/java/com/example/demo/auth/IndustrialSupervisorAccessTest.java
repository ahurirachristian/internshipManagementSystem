package com.example.demo.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * PC7 gate: the INDUSTRIAL_SUPERVISOR persona.
 *
 * <p>Before this role existed a field supervisor was a SUPERVISOR row wearing a
 * company id, which routed them to the university dashboard — an endpoint that
 * rejected them on every request (plan §1.4). These tests pin the new persona
 * end to end: their own company-scoped overview, the placement lifecycle they
 * can and cannot touch, and the §7.7 security fix that stops a COMPANY user
 * reading another company's student roster.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class IndustrialSupervisorAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Long suffix() {
        return System.nanoTime() % 1_000_000L;
    }

    private UserEntity newUser(String username, Role role) {
        UserEntity user = new UserEntity(username, passwordEncoder.encode("Password@1"), role);
        // Fixtures act as their own principal, so they must not be gated.
        user.setMustChangePassword(false);
        return userRepository.save(user);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor as(UserEntity u, String... roles) {
        SimpleGrantedAuthority[] authorities = java.util.Arrays.stream(roles)
                .map(SimpleGrantedAuthority::new)
                .toArray(SimpleGrantedAuthority[]::new);
        return user(u.getUsername()).authorities(authorities);
    }

    private Long newCompany(String name) {
        Company c = new Company();
        c.setName(name + " " + suffix());
        c.setSize(Company.Size.Medium);
        c.setIndustry("Testing");
        c.setCountry("Uganda");
        c.setCity("Kampala");
        c.setPhysicalAddress("Pending");
        return companyRepository.save(c).getId();
    }

    @Test
    void fieldSupervisorReachesOwnCompanyOverviewWith200() throws Exception {
        Long companyId = newCompany("Fieldsup Co");
        UserEntity sup = newUser("fieldsup" + suffix(), Role.INDUSTRIAL_SUPERVISOR);
        sup.setCompanyId(companyId);
        userRepository.save(sup);

        mockMvc.perform(get("/api/industrial/me/overview").with(as(sup, "INDUSTRIAL_SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").exists())
                .andExpect(jsonPath("$.internCount").value(0));

        // The old §1.4 defect: the university dashboard rejected this persona.
        // The new dashboard route must not repeat it.
        mockMvc.perform(get("/api/university/stats").with(as(sup, "INDUSTRIAL_SUPERVISOR")))
                .andExpect(status().isForbidden());
    }

    @Test
    void fieldSupervisorWithoutCompanyIsRejected() throws Exception {
        UserEntity sup = newUser("orphanfieldsup" + suffix(), Role.INDUSTRIAL_SUPERVISOR);

        // A field supervisor without a company is the new-role version of the
        // §1.4 defect and must never be creatable through the grant path; the
        // overview endpoint enforces the invariant directly too.
        mockMvc.perform(get("/api/industrial/me/overview").with(as(sup, "INDUSTRIAL_SUPERVISOR")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void industrialSupervisorCannotApproveOrRejectOffers() throws Exception {
        Long companyId = newCompany("Pipeline Co");
        UserEntity sup = newUser("pipesup" + suffix(), Role.INDUSTRIAL_SUPERVISOR);
        sup.setCompanyId(companyId);
        userRepository.save(sup);

        // Offer review stays a university persona: a field supervisor must not
        // move a university's placement through approvals.
        mockMvc.perform(post("/api/placements/1/approve").with(as(sup, "INDUSTRIAL_SUPERVISOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universitySupervisorId\":1}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/placements/1/reject").with(as(sup, "INDUSTRIAL_SUPERVISOR")))
                .andExpect(status().isForbidden());
    }

    @Test
    void industrialSupervisorRequestingAnotherCompanysStudentsIsRefused() throws Exception {
        Long ownCompany = newCompany("Own Co");
        Long otherCompany = newCompany("Other Co");
        UserEntity sup = newUser("rostersup" + suffix(), Role.INDUSTRIAL_SUPERVISOR);
        sup.setCompanyId(ownCompany);
        userRepository.save(sup);

        UserEntity studentUser = newUser("rosterstu" + suffix(), Role.STUDENT);
        Student placed = new Student();
        placed.setUserId(studentUser.getId());
        placed.setFirstName("Roster");
        placed.setLastName("Probe" + suffix());
        placed.setStudentNumber("PC7-" + suffix());
        placed.setRegistrationNumber("REG-PC7-" + suffix());
        placed.setDegreeProgram("Testing");
        placed.setInternshipCompanyId(otherCompany);
        studentRepository.save(placed);

        // §7.7: the cross-company read is a 403, not a leaked roster.
        mockMvc.perform(get("/api/students/company/{id}", otherCompany).with(as(sup, "INDUSTRIAL_SUPERVISOR")))
                .andExpect(status().isForbidden());

        // The own-company read still works.
        mockMvc.perform(get("/api/students/company/{id}", ownCompany).with(as(sup, "INDUSTRIAL_SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void companyCannotReadAnotherCompanysStudentRoster() throws Exception {
        Long ownCompany = newCompany("Roster Owner Co");
        Long otherCompany = newCompany("Roster Victim Co");
        UserEntity company = newUser("rosterco" + suffix(), Role.COMPANY);
        company.setCompanyId(ownCompany);
        userRepository.save(company);

        UserEntity studentUser = newUser("victimstu" + suffix(), Role.STUDENT);
        Student placed = new Student();
        placed.setUserId(studentUser.getId());
        placed.setFirstName("Victim");
        placed.setLastName("Roster" + suffix());
        placed.setStudentNumber("PC7V-" + suffix());
        placed.setRegistrationNumber("REG-PC7V-" + suffix());
        placed.setDegreeProgram("Testing");
        placed.setInternshipCompanyId(otherCompany);
        studentRepository.save(placed);

        // §7.7 with a COMPANY caller: previously this returned the other
        // company's students to any company that asked.
        mockMvc.perform(get("/api/students/company/{id}", otherCompany).with(as(company, "COMPANY")))
                .andExpect(status().isForbidden());
    }

    @Test
    void industrialSupervisorRoleRequiresACompanyWhenGranted() throws Exception {
        UserEntity superAdmin = newUser("grantor" + suffix(), Role.ADMIN);
        superAdmin.setSuperAdmin(true);
        userRepository.save(superAdmin);
        UserEntity target = newUser("grantee" + suffix(), Role.STUDENT);

        // Without a company the grant is refused — a companyless field
        // supervisor would repeat the §1.4 routing defect for the new role.
        mockMvc.perform(post("/api/admin/users/{id}/role", target.getId())
                        .with(as(superAdmin, "ADMIN", "super_admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"INDUSTRIAL_SUPERVISOR\"}"))
                .andExpect(status().is4xxClientError());
    }
}
