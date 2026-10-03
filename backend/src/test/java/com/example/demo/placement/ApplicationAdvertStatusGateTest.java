package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
 * The apply gate (opportunity plan §5.6, step S1.7).
 *
 * <p><b>Inverted from the Phase 0 baseline in this same commit.</b> This class was
 * written before the status vocabulary existed, and its {@code PUBLISHED} case asserted
 * a refusal — deliberately, so that the day someone turned {@code "OPEN"} into an enum
 * they would be confronted by a failing test rather than by a dead apply path in
 * production. The whole reason this file was committed early is now spent: the gate
 * asks {@link Vacancy.Status#acceptsApplications()} and {@code PUBLISHED} is admitted.
 *
 * <p>The trap it was pinning, restated because it is easy to reintroduce: a legacy
 * alias for {@code "OPEN"} is <b>not</b> sufficient on its own. The old gate was
 *
 * <pre>
 * if (!"OPEN".equalsIgnoreCase(vacancy.getStatus())) { throw ... }
 * </pre>
 *
 * The alias protects rows <i>already written</i> as {@code "OPEN"}. It does nothing for
 * rows written <i>after</i> the change, because a super-admin-published advert carries
 * {@code "PUBLISHED"} and {@code "OPEN".equalsIgnoreCase("PUBLISHED")} is false. So
 * alias-plus-old-gate would have made every correctly published opportunity
 * un-appliable: a 409 on apply, no compile error, and no failing test, since every
 * apply fixture used the legacy spelling. That is why the gate and the enum land
 * together, and why this test still exists in inverted form.
 *
 * <p>What is still refused is the point: {@code PENDING_REVIEW} is the private state of
 * R1, so admitting it would make the moderation step decoration.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationAdvertStatusGateTest {

    /** Statuses that must never accept an application, whatever else changes. */
    private static final String REFUSED_STATUSES =
            "PENDING_REVIEW,REJECTED,WITHDRAWN,EXPIRED,CLOSED";

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

    // --- The live status, spelled both ways ---

    @Test
    void publishedAcceptsAnApplication() throws Exception {
        // The assertion that was failing on purpose before this step. Without the gate
        // rewrite, this is a 409: "PUBLISHED" is not "OPEN".
        Vacancy vacancy = vacancyWithStatus("PUBLISHED", "The published advert");
        Student student = createStudent();

        apply(as(student), vacancy);

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isPresent();
    }

    @Test
    void theLegacyOpenSpellingStillAcceptsAnApplication() throws Exception {
        // The alias is a compatibility layer, not a second state. If this regressed,
        // every advert already in the production database would become un-appliable.
        Vacancy vacancy = vacancyWithStatus("OPEN", "The legacy open advert");
        Student student = createStudent();

        apply(as(student), vacancy);

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isPresent();
    }

    @ParameterizedTest(name = "\"{0}\" still accepts an application")
    @ValueSource(strings = { "open", "Open", "  OPEN  " })
    void theLegacySpellingIsStillCaseAndWhitespaceTolerant(String status) throws Exception {
        // equalsIgnoreCase used to make a lower-case row admissible. Keeping that is not
        // cosmetic: it is a live advert with a real set of applicants.
        Vacancy vacancy = vacancyWithStatus(status, "Lower-case open advert");
        Student student = createStudent();

        apply(as(student), vacancy);

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isPresent();
    }

    @Test
    void aLegacyOpenAdvertAndAPublishedAdvertAreTheSameState() throws Exception {
        // They must not merely both apply — they must be the same enum constant, or two
        // different code paths would be admitting them and only one would be tested.
        assertThat(vacancyWithStatus("OPEN", "Alias").getStatus())
                .isEqualTo(vacancyWithStatus("PUBLISHED", "Canonical").getStatus());
        assertThat(vacancyWithStatus("OPEN", "Alias").getStatus())
                .isEqualTo(Vacancy.Status.PUBLISHED);
    }

    // --- Everything else is still refused ---

    @ParameterizedTest(name = "{0} is not appliable")
    @ValueSource(strings = { "PENDING_REVIEW", "REJECTED", "WITHDRAWN", "EXPIRED", "CLOSED" })
    void everyNonLiveStatusIsRefused(String status) throws Exception {
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
    void anUnmoderatedCompanyAdvertIsStillRefused() throws Exception {
        // Spelled out rather than left inside the sweep above, because this is the case
        // the whole status machine exists for: R1 must not be bypassable by a company
        // posting and waiting.
        Vacancy vacancy = vacancyWithStatus("PENDING_REVIEW", "Unverified company advert");
        Student student = createStudent();

        mockMvc.perform(post("/api/applications").with(as(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy)))
                .andExpect(status().isConflict());

        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isEmpty();
    }

    @Test
    void aRefusedApplicationLeavesNoRowBehind() throws Exception {
        Vacancy vacancy = vacancyWithStatus("PENDING_REVIEW", "Unverified company advert");
        Student student = createStudent();

        mockMvc.perform(post("/api/applications").with(as(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(vacancy)))
                .andExpect(status().isConflict());

        // R1 also holds at the write, not only at the read: a student who guesses the
        // id of an unmoderated advert must not leave an application row.
        assertThat(applicationRepository.findByVacancyIdAndStudentId(vacancy.getId(), student.getId()))
                .isEmpty();
        assertThat(applicationRepository.count()).isZero();
    }

    @Test
    void noRefusedStatusInTheSweepEverLeavesARowBehind() throws Exception {
        // A single sweep, so a future change to the gate has to update one obvious list
        // rather than quietly altering which adverts are admissible.
        for (String status : REFUSED_STATUSES.split(",")) {
            Vacancy vacancy = vacancyWithStatus(status, "Sweep " + status);
            mockMvc.perform(post("/api/applications").with(as(createStudent()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(applyBody(vacancy)))
                    .andExpect(status().isConflict());
        }

        assertThat(applicationRepository.count()).isZero();
    }

    // --- The gate is membership, not a comparison against one string ---

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource({
            "PUBLISHED, true",
            "PENDING_REVIEW, false",
            "REJECTED, false",
            "WITHDRAWN, false",
            "EXPIRED, false",
            "CLOSED, false",
    })
    void theGateIsAMembershipQuestionOverNamedStates(String status, boolean appliable) {
        // The unit-level counterpart to the HTTP tests: it says the answer comes from
        // the enum, so adding a state cannot silently change it.
        assertThat(Vacancy.Status.parse(status).acceptsApplications()).isEqualTo(appliable);
    }

    @Test
    void anUnknownStatusCannotReachTheGateAtAll() throws Exception {
        // Previously a nonsense status was a 409 here — indistinguishable from a closed
        // advert, which is both wrong and unhelpful. It is now rejected where it
        // arrives, before any advert exists, so it is a 400 and never a 409.
        // See OpportunityStatusParseTest for the parse itself; this pins that the gate
        // is not the thing doing the validating any more.
        mockMvc.perform(post("/api/applications").with(as(createStudent()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vacancyId\": 999999, \"note\": \"Interested.\"}"))
                .andExpect(status().isNotFound());

        assertThat(applicationRepository.count()).isZero();
    }
}
