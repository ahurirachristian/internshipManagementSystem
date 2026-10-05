package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S6.4 (opportunity plan §8.7): {@code GET /api/opportunities} and
 * {@code GET /api/opportunities/{id}} — the student's only advert read, and
 * the R7 audience matrix the plan's Tests column names.
 *
 * <p>Four predicates decide what a student sees, and each gets a test that
 * fails when it is removed: <b>my university's live share</b> (another
 * university's student sees nothing [H2], a {@code CLOSED} share leaves the
 * feed [H4]), <b>advert {@code PUBLISHED}</b> (a withdrawn advert leaves the
 * feed [H4]), <b>not past the deadline</b>, and <b>targeting match</b> (the
 * share's narrowed audience decides per student [H2]).
 *
 * <p>The by-id read is the guessing surface [H3]: an unshared advert, another
 * university's share, a closed share and a narrowed-out student must all be
 * the <i>same</i> 404 — never a 403 — so the endpoint cannot confirm that an
 * advert exists. The feed itself is {@code STUDENT}-only at the door, the
 * exact mirror of every other door on the controller.
 *
 * <p>Zero-fill (§2.6) is behaviour, not decoration: {@code applied} and
 * {@code applicationCount} are present on every row, {@code false}/{@code 0}
 * until application rows prove otherwise.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityFeedTest {

    private static final int DEPARTMENT_A = 94101;
    private static final int PROGRAMME_A1 = 94201;
    private static final int PROGRAMME_A2 = 94202;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UniversityRepository universityRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
    @Autowired
    private OpportunityShareRepository shareRepository;
    @Autowired
    private ApplicationRepository applicationRepository;
    @Autowired
    private StudentRepository studentRepository;

    // --- Fixtures ---

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private UserEntity superAdmin() {
        return userRepository.findByUsername("admin").orElseThrow();
    }

    private UserEntity account(String prefix, Role role, Long universityId) {
        UserEntity user = new UserEntity(prefix + suffix(), "hash", role);
        user.setMustChangePassword(false);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private long university() {
        String tag = suffix();
        return universityRepository.save(new University(("FEED" + tag).substring(0, 15),
                "Feed Test University " + tag)).getId();
    }

    private UserEntity student(long universityId, Long departmentId, Long programmeId,
            Integer yearOfStudy) {
        UserEntity account = account("feedst", Role.STUDENT, universityId);
        Student row = new Student();
        row.setUserId(account.getId());
        row.setUniversityId(universityId);
        row.setDepartmentId(departmentId);
        row.setProgrammeId(programmeId);
        row.setYearOfStudy(yearOfStudy);
        row.setFirstName("Feed");
        row.setLastName("Student" + suffix());
        row.setRegistrationNumber("REG" + suffix());
        row.setStudentNumber("FD" + suffix());
        row.setDegreeProgram("Computer Science");
        row.setStartDate(LocalDate.now());
        studentRepository.save(row);
        return account;
    }

    private long advert(Vacancy.Status status, LocalDate deadline) {
        Vacancy advert = new Vacancy("Feed role " + suffix(),
                "A real role a student can be onboarded into", null, "Kampala", "None",
                status.name(), deadline, LocalDate.now());
        advert.setOrigin(Vacancy.Origin.UNIVERSITY);
        return vacancyRepository.save(advert).getId();
    }

    private long shareRow(long advertId, long universityId, OpportunityShare.Status status,
            String programmesCsv, String departmentsCsv, String yearsCsv, int minutesAgo) {
        OpportunityShare row = new OpportunityShare();
        row.setVacancyId(advertId);
        row.setUniversityId(universityId);
        row.setStatus(status);
        row.setSharedBy(superAdmin().getId());
        row.setSharedAt(LocalDateTime.now().minusMinutes(minutesAgo));
        row.setNote("Shared with our students");
        row.setTargetProgrammeIds(programmesCsv);
        row.setTargetDepartmentIds(departmentsCsv);
        row.setTargetYearOfStudy(yearsCsv);
        return shareRepository.save(row).getId();
    }

    private long shareRow(long advertId, long universityId) {
        return shareRow(advertId, universityId, OpportunityShare.Status.SHARED,
                null, null, null, 0);
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    private String feedBody(UserEntity actor) throws Exception {
        return mockMvc.perform(get("/api/opportunities").with(as(actor)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private List<Long> feedIds(UserEntity actor) throws Exception {
        List<Object> raw = JsonPath.read(feedBody(actor), "$[*].id");
        return raw.stream().map(x -> ((Number) x).longValue()).toList();
    }

    private long itemId(UserEntity actor, long advertId) throws Exception {
        String body = mockMvc.perform(get("/api/opportunities/" + advertId).with(as(actor)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    // --- The list: every predicate in the plan's S6.4 row ---

    @Test
    void aStudentSeesTheirOwnUniversitysLiveShareWithZeroFilledMetadata() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA);

        String body = feedBody(viewer);
        List<Object> raw = JsonPath.read(body, "$[*].id");
        assertThat(raw).extracting(x -> ((Number) x).longValue()).containsExactly(advertId);
        assertThat((String) JsonPath.read(body, "$[0].title")).startsWith("Feed role");
        assertThat((String) JsonPath.read(body, "$[0].status")).isEqualTo("PUBLISHED");
        assertThat((String) JsonPath.read(body, "$[0].shareNote")).isEqualTo("Shared with our students");
        // Zero-filled: no application rows exist, so the badge must read false/0 [§2.6].
        assertThat((Boolean) JsonPath.read(body, "$[0].applied")).isFalse();
        assertThat((Integer) JsonPath.read(body, "$[0].applicationCount")).isZero();
    }

    @Test
    void theFeedIsOrderedNewestShareFirst() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long older = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        long newer = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(older, uniA, OpportunityShare.Status.SHARED, null, null, null, 30);
        shareRow(newer, uniA, OpportunityShare.Status.SHARED, null, null, null, 0);

        assertThat(feedIds(viewer)).containsExactly(newer, older);
    }

    @Test
    void anotherUniversitysStudentSeesNothing() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity outsider = student(uniB, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA);

        assertThat(feedIds(outsider)).isEmpty();
    }

    @Test
    void aClosedShareLeavesTheFeed() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA, OpportunityShare.Status.CLOSED, null, null, null, 0);

        assertThat(feedIds(viewer)).isEmpty();
    }

    @Test
    void aWithdrawnAdvertLeavesTheFeedEvenWhileItsShareIsLive() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.WITHDRAWN, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA);

        assertThat(feedIds(viewer)).isEmpty();
    }

    @Test
    void aPastDeadlineLeavesTheFeedButTodaysDeadlineStays() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long stale = advert(Vacancy.Status.PUBLISHED, LocalDate.now().minusDays(1));
        long today = advert(Vacancy.Status.PUBLISHED, LocalDate.now());
        long open = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(7));
        shareRow(stale, uniA);
        shareRow(today, uniA);
        shareRow(open, uniA);

        assertThat(feedIds(viewer)).containsExactlyInAnyOrder(today, open);
    }

    @Test
    void theSharesTargetingDecidesWhichStudentsAreAddressed() throws Exception {
        long uniA = university();
        UserEntity addressed = student(uniA, (long) DEPARTMENT_A, (long) PROGRAMME_A1, 3);
        UserEntity otherProgramme = student(uniA, (long) DEPARTMENT_A, (long) PROGRAMME_A2, 3);
        UserEntity otherYear = student(uniA, (long) DEPARTMENT_A, (long) PROGRAMME_A1, 2);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA, OpportunityShare.Status.SHARED,
                Integer.toString(PROGRAMME_A1), null, "3", 0);

        assertThat(feedIds(addressed)).containsExactly(advertId);
        assertThat(feedIds(otherProgramme)).isEmpty();
        assertThat(feedIds(otherYear)).isEmpty();
    }

    @Test
    void theAppliedFlagAndApplicationCountAreZeroFilledPerViewer() throws Exception {
        long uniA = university();
        UserEntity applicant = student(uniA, null, null, null);
        UserEntity bystander = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA);

        // Before any application: both viewers read false/0.
        String before = feedBody(applicant);
        assertThat((Boolean) JsonPath.read(before, "$[0].applied")).isFalse();
        assertThat((Integer) JsonPath.read(before, "$[0].applicationCount")).isZero();

        Student row = studentRepository.findByUserId(applicant.getId()).orElseThrow();
        Application application = new Application();
        application.setVacancyId(advertId);
        application.setCompanyId(1L);
        application.setStudentId(row.getId());
        applicationRepository.save(application);

        String after = feedBody(applicant);
        assertThat((Boolean) JsonPath.read(after, "$[0].applied")).isTrue();
        assertThat((Integer) JsonPath.read(after, "$[0].applicationCount")).isEqualTo(1);
        // Same advert, other viewer: the count is a fact about the advert, the
        // flag is a fact about the viewer — both still zero-filled correctly.
        String otherView = feedBody(bystander);
        assertThat((Boolean) JsonPath.read(otherView, "$[0].applied")).isFalse();
        assertThat((Integer) JsonPath.read(otherView, "$[0].applicationCount")).isEqualTo(1);
    }

    // --- The by-id read: guessing must look like non-existence [H3] ---

    @Test
    void guessingAnUnsharedAdvertIs404() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));

        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(viewer)))
                .andExpect(status().isNotFound());
    }

    @Test
    void guessingAnotherUniversitysShareIs404Not403() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity outsider = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniB);

        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(outsider)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aClosedShareIs404ByGuess() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA, OpportunityShare.Status.CLOSED, null, null, null, 0);

        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(viewer)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aWithdrawnAdvertIs404ByGuess() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.WITHDRAWN, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA);

        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(viewer)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aStudentOutsideTheSharesTargetingIs404ByGuess() throws Exception {
        long uniA = university();
        UserEntity addressed = student(uniA, null, (long) PROGRAMME_A1, 3);
        UserEntity narrowedOut = student(uniA, null, (long) PROGRAMME_A2, 3);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA, OpportunityShare.Status.SHARED,
                Integer.toString(PROGRAMME_A1), null, null, 0);

        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(narrowedOut)))
                .andExpect(status().isNotFound());
        assertThat(itemId(addressed, advertId)).isEqualTo(advertId);
    }

    @Test
    void anAddressedStudentReadsTheFeedItemById() throws Exception {
        long uniA = university();
        UserEntity viewer = student(uniA, null, null, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA);

        String body = mockMvc.perform(get("/api/opportunities/" + advertId).with(as(viewer)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(((Number) JsonPath.read(body, "$.id")).longValue()).isEqualTo(advertId);
        assertThat((Boolean) JsonPath.read(body, "$.applied")).isFalse();
        assertThat((Integer) JsonPath.read(body, "$.applicationCount")).isZero();
    }

    // --- Doors: the mirror of every other endpoint on the controller ---

    @Test
    void theFeedDoorIsStudentOnly() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("feedsup", Role.SUPERVISOR, uniA);
        UserEntity company = account("feedco", Role.COMPANY, null);
        UserEntity admin = account("feedadm", Role.ADMIN, null);

        mockMvc.perform(get("/api/opportunities").with(as(supervisor)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities").with(as(company)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities").with(as(admin)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theFeedItemDoorIsStudentOnly() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("feedsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, LocalDate.now().plusDays(30));
        shareRow(advertId, uniA);

        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(supervisor)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities/" + advertId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aStudentAccountWithNoStudentRowIsRefusedRatherThanShownAnUnscopedFeed() throws Exception {
        long uniA = university();
        UserEntity orphan = account("feedorph", Role.STUDENT, uniA);

        mockMvc.perform(get("/api/opportunities").with(as(orphan)))
                .andExpect(status().isForbidden());
    }
}
