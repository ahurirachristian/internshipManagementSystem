package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * PC9 gate: vacancy applications.
 *
 * <p>Four properties carry this phase and each has at least one test:
 * <ol>
 *   <li><b>Only legal lifecycle transitions.</b> The happy path walks
 *       SUBMITTED → REVIEWING → SHORTLISTED → ACCEPTED; illegal jumps and any
 *       move out of a terminal status are 409 and leave the row untouched.</li>
 *   <li><b>A company sees only its own applicants.</b> A rival company's id is
 *       out of scope → 404 (never a probing oracle, L7) and its response body
 *       carries none of the applicant's PII.</li>
 *   <li><b>Funnel counts reconcile with row counts</b> — the zero-filled map
 *       always contains every status in the vocabulary and its values sum to
 *       {@code total}, which equals the scoped list length.</li>
 *   <li><b>Apply-time rules:</b> duplicate application, closed vacancy and
 *       unknown vacancy each have their own status code.</li>
 * </ol>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationLifecycleTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    /** A company login bound to {@code companyId}; the row is returned too. */
    private UserEntity createCompanyUser(Long companyId) {
        UserEntity companyUser = new UserEntity("appco" + suffix(), "hash", Role.COMPANY);
        companyUser.setCompanyId(companyId);
        companyUser.setMustChangePassword(false);
        return userRepository.save(companyUser);
    }

    private RequestPostProcessor as(UserEntity account) {
        return user(account.getUsername())
                .authorities(new SimpleGrantedAuthority(account.getRole().name()));
    }

    private RequestPostProcessor asCompany(Long companyId) {
        return as(createCompanyUser(companyId));
    }

    private RequestPostProcessor asAdmin() {
        return user("admin").authorities(new SimpleGrantedAuthority("ADMIN"));
    }

    private Long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    /** A student backed by its own login, so {@code apply} resolves a record. */
    private Student createStudent() {
        UserEntity studentUser = new UserEntity("appstud" + suffix(), "hash", Role.STUDENT);
        studentUser.setUniversityId(uniA());
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(uniA());
        student.setFirstName("Ada");
        student.setLastName("Applicant");
        student.setStudentNumber("AS" + suffix());
        student.setRegistrationNumber("AREG" + suffix());
        student.setDegreeProgram("BSc CS");
        return studentRepository.save(student);
    }

    private RequestPostProcessor asThisStudent(Student student) {
        return as(userRepository.findById(student.getUserId()).orElseThrow());
    }

    private Vacancy vacancy(Long companyId, String title, String status) {
        return vacancyRepository.save(new Vacancy(title, "desc", companyId, "Kigali", "none",
                status, LocalDate.now().plusMonths(2), LocalDate.now()));
    }

    private Vacancy openVacancy(Long companyId, String title) {
        return vacancy(companyId, title, "OPEN");
    }

    private Vacancy closedVacancy(Long companyId, String title) {
        return vacancy(companyId, title, "CLOSED");
    }

    /** An application row placed directly in the repository, bypassing the API. */
    private Application row(Vacancy vacancy, Student student, Application.Status status) {
        Application application = new Application();
        application.setVacancyId(vacancy.getId());
        application.setCompanyId(vacancy.getCompanyId());
        application.setStudentId(student.getId());
        application.setStatus(status);
        return applicationRepository.save(application);
    }

    private String applyBody(Long vacancyId) {
        return """
                {"vacancyId": %d, "note": "I am interested."}
                """.formatted(vacancyId);
    }

    private MvcResult apply(RequestPostProcessor actor, Long vacancyId) throws Exception {
        return mockMvc.perform(post("/api/applications")
                        .with(actor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancyId)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private MvcResult transition(RequestPostProcessor actor, Long applicationId, String target)
            throws Exception {
        return mockMvc.perform(post("/api/applications/" + applicationId + "/transition")
                        .with(actor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"" + target + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
    }

    private ResultActions transitionRaw(RequestPostProcessor actor, Long applicationId, String target)
            throws Exception {
        return mockMvc.perform(post("/api/applications/" + applicationId + "/transition")
                .with(actor)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"" + target + "\"}"));
    }

    private boolean audited(String action, Long applicationId) {
        return auditLogRepository.findAll().stream()
                .anyMatch(a -> action.equals(a.getAction())
                        && a.getDetails() != null
                        && a.getDetails().contains("Application " + applicationId));
    }

    private String body(MvcResult result) throws Exception {
        return result.getResponse().getContentAsString();
    }

    private int readInt(String json, String path) {
        return JsonPath.<Integer>read(json, path);
    }

    /** The id of an application from a 201 response body. */
    private long readId(MvcResult result) throws Exception {
        return readInt(body(result), "$.id");
    }

    @SuppressWarnings("unchecked")
    private java.util.Set<String> statusNames(String funnelJson) {
        return new java.util.LinkedHashSet<>(
                ((Map<String, Object>) JsonPath.<Object>read(funnelJson, "$.counts")).keySet());
    }

    // ── 1. lifecycle ────────────────────────────────────────────────────────

    @Test
    void studentAppliesThenCompanyWalksTheFullHappyPath() throws Exception {
        Long companyId = createCompany("Funnel Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Backend Engineer");
        Student student = createStudent();

        long applicationId = readId(apply(asThisStudent(student), vacancy.getId()));
        assertThat(applicationId).isPositive();

        Application stored = applicationRepository.findById(applicationId).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(Application.Status.SUBMITTED);
        // The company link is copied from the VACANCY, and the row is stamped.
        assertThat(stored.getCompanyId()).isEqualTo(companyId);
        assertThat(stored.getCreatedAt()).isNotNull();

        RequestPostProcessor company = asCompany(companyId);
        transition(company, applicationId, "REVIEWING");
        transition(company, applicationId, "SHORTLISTED");
        transition(company, applicationId, "ACCEPTED");

        assertThat(applicationRepository.findById(applicationId).orElseThrow().getStatus())
                .isEqualTo(Application.Status.ACCEPTED);
        assertThat(audited("APPLICATION_STATUS", applicationId)).isTrue();
    }

    @Test
    void applyNotifiesTheCompanyAndAuditsTheSubmission() throws Exception {
        Long companyId = createCompany("Notify Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Data Analyst");
        Student student = createStudent();
        UserEntity companyUser = createCompanyUser(companyId);

        long applicationId = readId(apply(asThisStudent(student), vacancy.getId()));

        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(companyUser.getId()))
                .anyMatch(n -> "APPLICATION_SUBMITTED".equals(n.getType()));
        assertThat(audited("APPLICATION_SUBMITTED", applicationId)).isTrue();
    }

    @Test
    void statusChangeNotifiesTheApplicant() throws Exception {
        Long companyId = createCompany("Shortlist Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Mobile Developer");
        Student student = createStudent();

        long applicationId = readId(apply(asThisStudent(student), vacancy.getId()));
        transition(asCompany(companyId), applicationId, "REVIEWING");

        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(student.getUserId()))
                .anyMatch(n -> "APPLICATION_STATUS".equals(n.getType()));
    }

    @Test
    void studentMayWithdrawTheirOwnApplication() throws Exception {
        Long companyId = createCompany("Withdraw Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "QA Engineer");
        Student student = createStudent();

        long applicationId = readId(apply(asThisStudent(student), vacancy.getId()));
        transition(asThisStudent(student), applicationId, "WITHDRAWN");

        assertThat(applicationRepository.findById(applicationId).orElseThrow().getStatus())
                .isEqualTo(Application.Status.WITHDRAWN);
    }

    @Test
    void illegalJumpsAreRejectedWithConflictAndLeaveTheRowUnchanged() throws Exception {
        Long companyId = createCompany("Jump Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "DevOps Engineer");
        Student student = createStudent();
        RequestPostProcessor company = asCompany(companyId);

        // SUBMITTED → SHORTLISTED skips the review step.
        Long submitted = row(vacancy, student, Application.Status.SUBMITTED).getId();
        transitionRaw(company, submitted, "SHORTLISTED").andExpect(status().isConflict());
        assertThat(applicationRepository.findById(submitted).orElseThrow().getStatus())
                .isEqualTo(Application.Status.SUBMITTED);

        // SUBMITTED → ACCEPTED is the long version of the same mistake.
        Long direct = row(vacancy, student, Application.Status.SUBMITTED).getId();
        transitionRaw(company, direct, "ACCEPTED").andExpect(status().isConflict());

        // A company may not withdraw — that move belongs to the applicant.
        transitionRaw(company, submitted, "WITHDRAWN").andExpect(status().isForbidden());
        assertThat(applicationRepository.findById(submitted).orElseThrow().getStatus())
                .isEqualTo(Application.Status.SUBMITTED);
    }

    @Test
    void terminalStatusesAreFinal() throws Exception {
        Long companyId = createCompany("Terminal Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Security Engineer");
        Student student = createStudent();
        RequestPostProcessor company = asCompany(companyId);

        for (Application.Status terminal : new Application.Status[] {
                Application.Status.ACCEPTED, Application.Status.REJECTED, Application.Status.WITHDRAWN }) {
            Long id = row(vacancy, student, terminal).getId();
            for (Application.Status target : Application.Status.values()) {
                transitionRaw(company, id, target.name()).andExpect(status().isConflict());
            }
            assertThat(applicationRepository.findById(id).orElseThrow().getStatus())
                    .isEqualTo(terminal);
        }
    }

    @Test
    void aStudentCannotAcceptThemselves() throws Exception {
        Long companyId = createCompany("SelfAccept Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Product Owner");
        Student student = createStudent();

        Long shortlisted = row(vacancy, student, Application.Status.SHORTLISTED).getId();
        transitionRaw(asThisStudent(student), shortlisted, "ACCEPTED")
                .andExpect(status().isForbidden());

        assertThat(applicationRepository.findById(shortlisted).orElseThrow().getStatus())
                .isEqualTo(Application.Status.SHORTLISTED);
    }

    @Test
    void unknownStatusInTheBodyIsABadRequest() throws Exception {
        Long companyId = createCompany("BadStatus Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Tech Lead");
        Student student = createStudent();

        Long id = row(vacancy, student, Application.Status.SUBMITTED).getId();
        transitionRaw(asCompany(companyId), id, "HIRED").andExpect(status().isBadRequest());
        transitionRaw(asCompany(companyId), id, "").andExpect(status().isBadRequest());

        assertThat(applicationRepository.findById(id).orElseThrow().getStatus())
                .isEqualTo(Application.Status.SUBMITTED);
    }

    // ── 2. scope isolation ──────────────────────────────────────────────────

    @Test
    void aCompanySeesOnlyItsOwnApplicants() throws Exception {
        Long mineId = createCompany("Mine Co " + suffix());
        Long rivalId = createCompany("Rival Co " + suffix());
        Vacancy myVacancy = openVacancy(mineId, "My Role");
        Vacancy rivalVacancy = openVacancy(rivalId, "Rival Role");
        Student mine = createStudent();
        Student rival = createStudent();

        row(myVacancy, mine, Application.Status.SUBMITTED);
        row(rivalVacancy, rival, Application.Status.SUBMITTED);

        MvcResult list = mockMvc.perform(get("/api/applications").with(asCompany(mineId)))
                .andExpect(status().isOk())
                .andReturn();

        String body = body(list);
        assertThat(body).contains("My Role");
        assertThat(body).doesNotContain("Rival Role");
        // The rival applicant's PII never appears in this company's response.
        assertThat(body).doesNotContain("Rival Applicant");
        assertThat(body).doesNotContain(rival.getStudentNumber());
    }

    @Test
    void aCompetingCompanyGetsNotFoundAndNoPiiForAForeignApplication() throws Exception {
        Long mineId = createCompany("Owner Co " + suffix());
        Long rivalId = createCompany("Outsider Co " + suffix());
        Vacancy vacancy = openVacancy(mineId, "Closed Shop Role");
        Student student = createStudent();
        Long applicationId = row(vacancy, student, Application.Status.SUBMITTED).getId();

        MvcResult detail = mockMvc.perform(get("/api/applications/" + applicationId)
                        .with(asCompany(rivalId)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertThat(body(detail)).doesNotContain("Ada");

        transitionRaw(asCompany(rivalId), applicationId, "REVIEWING")
                .andExpect(status().isNotFound());

        assertThat(applicationRepository.findById(applicationId).orElseThrow().getStatus())
                .isEqualTo(Application.Status.SUBMITTED);
        assertThat(audited("APPLICATION_STATUS", applicationId)).isFalse();
    }

    @Test
    void aStudentSeesOnlyTheirOwnApplications() throws Exception {
        Long companyId = createCompany("Student Scope Co " + suffix());
        Vacancy first = openVacancy(companyId, "Role One");
        Vacancy second = openVacancy(companyId, "Role Two");
        Student mine = createStudent();
        Student other = createStudent();
        row(first, mine, Application.Status.SUBMITTED);
        row(second, other, Application.Status.SUBMITTED);

        MvcResult list = mockMvc.perform(get("/api/applications").with(asThisStudent(mine)))
                .andExpect(status().isOk())
                .andReturn();

        String body = body(list);
        assertThat(body).contains("Role One");
        assertThat(body).doesNotContain("Role Two");
    }

    @Test
    void supervisorsAreNotPartOfTheApplicationsSurface() throws Exception {
        Long companyId = createCompany("No Supervisor Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Guarded Role");
        Student student = createStudent();
        Long applicationId = row(vacancy, student, Application.Status.SUBMITTED).getId();

        UserEntity supervisor = new UserEntity("appsup" + suffix(), "hash", Role.SUPERVISOR);
        supervisor.setUniversityId(uniA());
        supervisor.setMustChangePassword(false);
        userRepository.save(supervisor);
        RequestPostProcessor asSupervisor = as(supervisor);

        mockMvc.perform(get("/api/applications").with(asSupervisor))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/applications/" + applicationId).with(asSupervisor))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/applications/funnel").with(asSupervisor))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyStudentsMayApply() throws Exception {
        Long companyId = createCompany("Apply Guard Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Guarded Apply");

        mockMvc.perform(post("/api/applications")
                        .with(asCompany(companyId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy.getId())))
                .andExpect(status().isForbidden());

        assertThat(applicationRepository.findAll())
                .noneMatch(a -> vacancy.getId().equals(a.getVacancyId()));
    }

    // ── 3. funnel reconciliation ────────────────────────────────────────────

    @Test
    void companyFunnelIsZeroFilledAndReconcilesWithTheApplicantList() throws Exception {
        Long companyId = createCompany("Chart Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Chart Role");

        row(vacancy, createStudent(), Application.Status.SUBMITTED);
        row(vacancy, createStudent(), Application.Status.REVIEWING);
        row(vacancy, createStudent(), Application.Status.ACCEPTED);

        String funnel = body(mockMvc.perform(get("/api/applications/funnel")
                .with(asCompany(companyId)))
                .andExpect(status().isOk())
                // Never measured, but present as a real zero — a chart must not
                // have to interpolate a missing bar.
                .andExpect(jsonPath("$.counts.SUBMITTED").value(1))
                .andExpect(jsonPath("$.counts.REVIEWING").value(1))
                .andExpect(jsonPath("$.counts.ACCEPTED").value(1))
                .andExpect(jsonPath("$.counts.SHORTLISTED").value(0))
                .andExpect(jsonPath("$.counts.REJECTED").value(0))
                .andExpect(jsonPath("$.counts.WITHDRAWN").value(0))
                .andExpect(jsonPath("$.total").value(3))
                .andReturn());

        // Every status in the vocabulary is present, so the chart's category axis
        // is stable no matter which statuses happen to have rows.
        assertThat(statusNames(funnel))
                .containsExactlyInAnyOrderElementsOf(
                        java.util.Arrays.stream(Application.Status.values())
                                .map(Enum::name).toList());

        // The values sum to the declared total...
        assertThat(readInt(funnel, "$.total")).isEqualTo(sumCounts(funnel));

        // ...and the chart and the table beside it come from the same rows.
        String list = body(mockMvc.perform(get("/api/applications").with(asCompany(companyId)))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(countRows(list)).isEqualTo(readInt(funnel, "$.total"));
    }

    private int sumCounts(String funnelJson) {
        return java.util.Arrays.stream(Application.Status.values())
                .mapToInt(status -> readInt(funnelJson, "$.counts." + status.name()))
                .sum();
    }

    /** Element count of a top-level JSON array body. */
    private int countRows(String json) {
        return JsonPath.<java.util.List<Object>>read(json, "$").size();
    }

    @Test
    void anEmptyFunnelStillListsEveryStatusAndTotalZero() throws Exception {
        Long companyId = createCompany("Empty Chart Co " + suffix());

        mockMvc.perform(get("/api/applications/funnel").with(asCompany(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.counts.SUBMITTED").value(0))
                .andExpect(jsonPath("$.counts.SHORTLISTED").value(0));
    }

    @Test
    void funnelIsScopedExactlyLikeTheList() throws Exception {
        Long mineId = createCompany("Mine Funnel Co " + suffix());
        Long rivalId = createCompany("Rival Funnel Co " + suffix());
        Vacancy mine = openVacancy(mineId, "Mine Funnel Role");
        Vacancy rival = openVacancy(rivalId, "Rival Funnel Role");
        row(mine, createStudent(), Application.Status.SUBMITTED);
        row(mine, createStudent(), Application.Status.REJECTED);
        row(rival, createStudent(), Application.Status.SUBMITTED);

        mockMvc.perform(get("/api/applications/funnel").with(asCompany(mineId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.SUBMITTED").value(1))
                .andExpect(jsonPath("$.counts.REJECTED").value(1))
                .andExpect(jsonPath("$.total").value(2));
    }

    @Test
    void adminSeesEveryApplication() throws Exception {
        Long companyId = createCompany("Admin View Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Admin Visible");
        row(vacancy, createStudent(), Application.Status.SUBMITTED);

        mockMvc.perform(get("/api/applications/funnel").with(asAdmin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value((int) applicationRepository.count()));
    }

    // ── 4. apply-time rules ─────────────────────────────────────────────────

    @Test
    void aSecondApplicationToTheSameVacancyIsAConflict() throws Exception {
        Long companyId = createCompany("Dup Co " + suffix());
        Vacancy vacancy = openVacancy(companyId, "Dup Role");
        Student student = createStudent();

        apply(asThisStudent(student), vacancy.getId());

        mockMvc.perform(post("/api/applications")
                        .with(asThisStudent(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy.getId())))
                .andExpect(status().isConflict());

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isPresent();
    }

    @Test
    void aClosedVacancyRefusesApplications() throws Exception {
        Long companyId = createCompany("Closed Co " + suffix());
        Vacancy vacancy = closedVacancy(companyId, "Filled Role");
        Student student = createStudent();

        mockMvc.perform(post("/api/applications")
                        .with(asThisStudent(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy.getId())))
                .andExpect(status().isConflict());

        assertThat(applicationRepository.findAll())
                .noneMatch(a -> vacancy.getId().equals(a.getVacancyId()));
    }

    @Test
    void applyingToAnUnknownVacancyIsNotFound() throws Exception {
        Student student = createStudent();

        mockMvc.perform(post("/api/applications")
                        .with(asThisStudent(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(999_999L)))
                .andExpect(status().isNotFound());

        assertThat(applicationRepository.findAll())
                .allMatch(a -> a.getCreatedAt() != null);
    }

    @Test
    void aBodyWithoutAUsableVacancyIdIsABadRequest() throws Exception {
        Student student = createStudent();

        mockMvc.perform(post("/api/applications")
                        .with(asThisStudent(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/applications")
                        .with(asThisStudent(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vacancyId\": \"not-a-number\"}"))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.findAll())
                .allMatch(a -> a.getCreatedAt() != null);
    }

    @Test
    void transitioningAnUnknownApplicationIsNotFound() throws Exception {
        Long companyId = createCompany("Ghost Co " + suffix());

        mockMvc.perform(post("/api/applications/999999/transition")
                        .with(asCompany(companyId)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"REVIEWING\"}"))
                .andExpect(status().isNotFound());
    }
}
