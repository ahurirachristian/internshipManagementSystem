package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * Phase 0 baseline (opportunity plan §8.1, step S0.1).
 *
 * <p><b>These tests assert a defect, on purpose.</b> {@code GET /api/vacancies}
 * carries no {@code @PreAuthorize} and no scope filter — it returns
 * {@code vacancyService.findAll()}, every row in the table, to any authenticated
 * caller:
 *
 * <pre>
 * // placement/VacancyController.java:48-51
 * &#64;GetMapping
 * public List&lt;Vacancy&gt; getAllVacancies() {
 *     return vacancyService.findAll();
 * }
 * </pre>
 *
 * <p>The opportunity brief requires the opposite: a company's advert is visible
 * <b>only</b> to the super admin (R1). Today a {@code STUDENT} can list every
 * advert in the system, including other companies' and other universities'.
 *
 * <p><b>Why pin it instead of just fixing it.</b> {@code VacanciesSection.jsx}
 * (student browse) and {@code AdminDashboard.js:76} both call this endpoint
 * today. Locking it down before those callers are repointed would leave students
 * with an empty list — the exact regression the brief forbids (R10). So the
 * closure is sequenced at step <b>S7.4</b>, and this class is the tripwire that
 * proves the change actually happened and that nothing else regressed.
 *
 * <p><b>At S7.4 each {@code currently} assertion below flips 200 → 403</b>, and
 * the two tests at the bottom — anonymous rejected, super admin allowed — must
 * keep passing, so the fix cannot over-tighten. The class name keeps the word
 * "Baseline" so it is obvious during review that the assertions are inverted on
 * purpose.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VacancyVisibilityBaselineTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private StudentRepository studentRepository;

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    /** The university the seeded {@code university} supervisor belongs to. */
    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    private Long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private Vacancy vacancy(Long companyId, String title) {
        return vacancyRepository.save(new Vacancy(title, "A description of the role",
                companyId, "Kampala", "Some requirements", "OPEN",
                LocalDate.now().plusMonths(2), LocalDate.now()));
    }

    /** Every fixture account clears the must-change-password gate (P4). */
    private UserEntity account(String username, Role role) {
        UserEntity user = new UserEntity(username, "hash", role);
        user.setMustChangePassword(false);
        return userRepository.save(user);
    }

    private RequestPostProcessor as(UserEntity created) {
        return user(created.getUsername())
                .authorities(new SimpleGrantedAuthority(created.getRole().name()));
    }

    private RequestPostProcessor asStudent() {
        UserEntity studentUser = account("visstud" + suffix(), Role.STUDENT);
        studentUser.setUniversityId(uniA());

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(uniA());
        student.setFirstName("Grace");
        student.setLastName("Hopper");
        student.setStudentNumber("VIS" + suffix());
        student.setRegistrationNumber("VISREG" + suffix());
        student.setDegreeProgram("BSc CS");
        studentRepository.save(student);

        return as(studentUser);
    }

    private RequestPostProcessor asCompanyUser(Long companyId) {
        UserEntity companyUser = account("visco" + suffix(), Role.COMPANY);
        companyUser.setCompanyId(companyId);
        return as(companyUser);
    }

    private RequestPostProcessor asSupervisor(Long universityId) {
        UserEntity supervisor = account("vissup" + suffix(), Role.SUPERVISOR);
        supervisor.setUniversityId(universityId);
        return as(supervisor);
    }

    /**
     * The seeded {@code admin} row carries superAdmin=true (DataSeeder:63-69), so
     * AuthorityRefreshFilter grants it {@code super_admin} on every request. Using
     * the real row rather than a synthetic principal keeps this honest.
     */
    private RequestPostProcessor asSuperAdmin() {
        return user("admin").authorities(new SimpleGrantedAuthority("ADMIN"));
    }

    @Test
    void studentCanCurrentlyListEveryVacancyAcrossCompanies() throws Exception {
        Long airtel = createCompany("Baseline Telco");
        Long mtn = createCompany("Baseline Mobile");
        vacancy(airtel, "Telco software intern");
        vacancy(mtn, "Mobile money intern");

        // R1 violated: a student sees adverts from every company in the system.
        // Asserting the body, not just 200, so this cannot pass on access alone.
        String body = mockMvc.perform(get("/api/vacancies").with(asStudent()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("Telco software intern");
        assertThat(body).contains("Mobile money intern");
    }

    @Test
    void studentCanCurrentlyReadASingleVacancyById() throws Exception {
        Vacancy theirs = vacancy(createCompany("Baseline Solo"), "A private advert");

        String body = mockMvc.perform(get("/api/vacancies/" + theirs.getId()).with(asStudent()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("A private advert");
        assertThat(body).contains(String.valueOf(theirs.getId()));
    }

    @Test
    void companyCanCurrentlyListARivalsVacancies() throws Exception {
        Vacancy rivals = vacancy(createCompany("Baseline Rival"), "Rival advert");
        RequestPostProcessor mine = asCompanyUser(createCompany("Baseline Mine"));

        String body = mockMvc.perform(get("/api/vacancies").with(mine))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("Rival advert");
        assertThat(body).contains(String.valueOf(rivals.getId()));
    }

    @Test
    void companyScopedEndpointHasNoOwnershipCheck() throws Exception {
        Long rivalCompany = createCompany("Baseline Target");
        vacancy(rivalCompany, "Target advert");
        RequestPostProcessor mine = asCompanyUser(createCompany("Baseline Prober"));

        // Writes are ownership-checked (VacancyOwnershipTest); this read is not.
        String body = mockMvc.perform(get("/api/vacancies/company/" + rivalCompany).with(mine))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("Target advert");
    }

    @Test
    void statusEndpointHasNoOwnershipCheck() throws Exception {
        vacancy(createCompany("Baseline Status"), "Status advert");
        RequestPostProcessor mine = asCompanyUser(createCompany("Baseline StatusProber"));

        String body = mockMvc.perform(get("/api/vacancies/status").param("status", "OPEN").with(mine))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("Status advert");
    }

    @Test
    void supervisorCanCurrentlyListVacanciesFromEveryUniversity() throws Exception {
        vacancy(createCompany("Baseline Across"), "Advert from elsewhere");

        // SUPERVISOR has no university filter on this read at all.
        String body = mockMvc.perform(get("/api/vacancies").with(asSupervisor(uniA())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("Advert from elsewhere");
    }

    // --- The two that must keep passing after S7.4, so the fix cannot over-tighten ---

    @Test
    void anonymousIsRejected() throws Exception {
        mockMvc.perform(get("/api/vacancies"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void superAdminCanListEveryVacancy() throws Exception {
        vacancy(createCompany("Baseline Admin"), "Admin-visible advert");

        // R1's only legitimate audience. Must stay 200 through S7.4.
        mockMvc.perform(get("/api/vacancies").with(asSuperAdmin()))
                .andExpect(status().isOk());
    }
}
