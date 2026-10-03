package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
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
 * Phase 0 baseline (opportunity plan §8.1, step S0.2).
 *
 * <p><b>This exists because of one line.</b> Whether a student may apply is
 * decided by a single case-insensitive string comparison against a literal:
 *
 * <pre>
 * // placement/ApplicationService.java:85-87
 * if (!"OPEN".equalsIgnoreCase(vacancy.getStatus())) {
 *     throw new IllegalStateException("This vacancy is no longer open.");
 * }
 * </pre>
 *
 * <p>The opportunity work replaces that free-text status with a real enum
 * (step S1.7) whose vocabulary is PENDING_REVIEW, PUBLISHED, REJECTED,
 * WITHDRAWN, CLOSED, EXPIRED — with {@code "OPEN"} accepted only as a legacy
 * alias of {@code PUBLISHED} so pre-existing rows keep working.
 *
 * <p><b>The trap that alias does not cover.</b> The alias protects rows that were
 * <i>already written</i> as {@code "OPEN"}. It does nothing for rows written
 * <i>after</i> the change: a super-admin-published advert will carry the string
 * {@code "PUBLISHED"}, and
 * {@code "OPEN".equalsIgnoreCase("PUBLISHED")} is {@code false}. So the day the
 * enum lands, every correctly published opportunity silently becomes
 * un-appliable — 409 on apply — with no compile error and no failing test,
 * because the only apply tests all use the old {@code "OPEN"} fixture.
 *
 * <p>{@code ApplicationLifecycleTest} already covers {@code "OPEN"} → applied
 * and {@code "CLOSED"} → refused. It never states that this one string is the
 * gate. This class pins the gate <b>as a set</b>, including the status names the
 * feature is about to introduce, so the step that introduces them is forced to
 * confront this line instead of inheriting a dead apply path.
 *
 * <p>The {@code PUBLISHED} case below is therefore expected to assert a refusal
 * today. That is not a bug in this test — it is the bug this test is here to
 * make visible before it is written.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationAdvertStatusGateTest {

    /** Statuses the feature will introduce, none of which are appliable today. */
    private static final String FUTURE_STATUSES = "PENDING_REVIEW,PUBLISHED,REJECTED,WITHDRAWN,EXPIRED";

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

    @Autowired
    private ApplicationRepository applicationRepository;

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    private Long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private Vacancy vacancyWithStatus(String status, String title) {
        return vacancyRepository.save(new Vacancy(title, "A description of the role",
                createCompany("Gate Co " + suffix()), "Kampala", "Some requirements",
                status, LocalDate.now().plusMonths(2), LocalDate.now()));
    }

    private Student createStudent() {
        UserEntity studentUser = new UserEntity("gatestud" + suffix(), "hash", Role.STUDENT);
        studentUser.setUniversityId(uniA());
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(uniA());
        student.setFirstName("Alan");
        student.setLastName("Turing");
        student.setStudentNumber("GATE" + suffix());
        student.setRegistrationNumber("GATEREG" + suffix());
        student.setDegreeProgram("BSc CS");
        return studentRepository.save(student);
    }

    private RequestPostProcessor as(Student student) {
        return user(userRepository.findById(student.getUserId()).orElseThrow().getUsername())
                .authorities(new SimpleGrantedAuthority("STUDENT"));
    }

    private void apply(RequestPostProcessor student, Vacancy vacancy) throws Exception {
        mockMvc.perform(post("/api/applications").with(student)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));
    }

    private String applyBody(Vacancy vacancy) {
        return "{\"vacancyId\": %d, \"note\": \"Interested.\"}".formatted(vacancy.getId());
    }

    // --- The one status that is appliable today ---

    @Test
    void openIsTheOnlyStatusThatCurrentlyAdmitsAnApplication() throws Exception {
        Vacancy vacancy = vacancyWithStatus("OPEN", "The legacy open advert");
        Student student = createStudent();

        apply(as(student), vacancy);

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isPresent();
    }

    @Test
    void theOpenComparisonIsCaseInsensitive() throws Exception {
        // equalsIgnoreCase, so a lower-case row is admissible today. The enum
        // parser at S1.7 has to keep normalising case or this regresses.
        Vacancy vacancy = vacancyWithStatus("open", "Lower-case open advert");
        Student student = createStudent();

        apply(as(student), vacancy);

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isPresent();
    }

    // --- Every status the feature is about to introduce ---

    @ParameterizedTest(name = "{0} is not appliable today")
    @ValueSource(strings = { "PENDING_REVIEW", "PUBLISHED", "REJECTED", "WITHDRAWN", "EXPIRED", "CLOSED" })
    void theGateKeysOnTheLiteralOpenAndNothingElse(String status) throws Exception {
        Vacancy vacancy = vacancyWithStatus(status, "Advert in state " + status);
        Student student = createStudent();

        mockMvc.perform(post("/api/applications").with(as(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy)))
                .andExpect(status().isConflict());

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isEmpty();
    }

    @Test
    void anUnknownStatusIsRefusedRatherThanRejectedAsBadInput() throws Exception {
        // Today this is a 409, not a 400: the gate is a string comparison, so an
        // unrecognised value is indistinguishable from a closed advert. Worth
        // knowing before S1.7 turns the column into an enum and 400 becomes
        // reachable — that is a deliberate behaviour change, not a free one.
        Vacancy vacancy = vacancyWithStatus("BANANA", "Advert with a nonsense status");

        mockMvc.perform(post("/api/applications").with(as(createStudent()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy)))
                .andExpect(status().isConflict());
    }

    @Test
    void aRefusedApplicationLeavesNoRowBehind() throws Exception {
        Vacancy vacancy = vacancyWithStatus("PENDING_REVIEW", "Unverified company advert");
        Student student = createStudent();

        mockMvc.perform(post("/api/applications").with(as(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy)))
                .andExpect(status().isConflict());

        // R1 also holds at the write, not only at the read: a student who guesses
        // the id of an unmoderated advert must not leave an application row.
        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isEmpty();
        assertThat(applicationRepository.count()).isZero();
    }

    @Test
    void everyStatusTheFeatureIntroducesIsAlreadyRefusedSoTheGateIsTheOnlyThingToChange() throws Exception {
        // A single sweep, so a future change to the gate has to update one obvious
        // list rather than quietly altering which adverts are admissible.
        for (String status : FUTURE_STATUSES.split(",")) {
            Vacancy vacancy = vacancyWithStatus(status, "Sweep " + status);
            mockMvc.perform(post("/api/applications").with(as(createStudent()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(applyBody(vacancy)))
                    .andExpect(status().isConflict());
        }

        assertThat(applicationRepository.count()).isZero();
    }
}
