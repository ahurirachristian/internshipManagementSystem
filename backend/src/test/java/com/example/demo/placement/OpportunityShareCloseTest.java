package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.notification.Notification;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * Step S6.6 (opportunity plan §8.7): {@code POST /api/opportunities/{id}/share/close}
 * — the university calls off a broadcast, and the plan's Tests column asks for
 * one thing above all: <b>a closed share is invisible to students</b>.
 *
 * <p>The suite treats the close as three coupled promises:
 *
 * <ol>
 *   <li><b>The feed drops it at once</b> — the same advert that was in the
 *       list and readable by id before the close is gone from both after it
 *       (the S6.4 feed's {@code SHARED} predicate and the S2.3 resolver do the
 *       work; this pins that the endpoint actually lands there) [H4].</li>
 *   <li><b>Everyone who was told is told again</b> — §9's
 *       {@code OPPORTUNITY_WITHDRAWN} reaches exactly the share's
 *       targeting-aware student audience (a mismatched student at the same
 *       university and any other university hear nothing), through the chunked
 *       fan-out [H11]; the sharing university's supervisors get their status
 *       notice; history and audit record the move.</li>
 *   <li><b>Nobody else can pull it</b> — the door is {@code SUPERVISOR} only
 *       (D2: even a super admin is refused, exactly like the share itself),
 *       the row is resolved from the path's advert + the session's university
 *       so another supervisor's close is a 404 [H9], a missing share is the
 *       same 404, and CLOSED is terminal (409) with no double notification.</li>
 * </ol>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityShareCloseTest {

    private static final int PROGRAMME_A1 = 95201;
    private static final int PROGRAMME_A2 = 95202;

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
    private OpportunityStatusHistoryRepository historyRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
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
        return universityRepository.save(new University(("CLS" + tag).substring(0, 15),
                "Close Test University " + tag)).getId();
    }

    private UserEntity supervisor(long universityId) {
        return account("clssup", Role.SUPERVISOR, universityId);
    }

    private UserEntity student(long universityId, Long programmeId) {
        UserEntity account = account("clsst", Role.STUDENT, universityId);
        Student row = new Student();
        row.setUserId(account.getId());
        row.setUniversityId(universityId);
        row.setProgrammeId(programmeId);
        row.setFirstName("Close");
        row.setLastName("Student" + suffix());
        row.setRegistrationNumber("REG" + suffix());
        row.setStudentNumber("CLS" + suffix());
        row.setDegreeProgram("Computer Science");
        row.setStartDate(LocalDate.now());
        studentRepository.save(row);
        return account;
    }

    private long advert() {
        Vacancy advert = new Vacancy("Close role " + suffix(),
                "A real role a student can be onboarded into", null, "Kampala", "None",
                Vacancy.Status.PUBLISHED.name(), LocalDate.now().plusDays(30), LocalDate.now());
        advert.setOrigin(Vacancy.Origin.UNIVERSITY);
        return vacancyRepository.save(advert).getId();
    }

    private long shareRow(long advertId, long universityId, OpportunityShare.Status status,
            String programmesCsv) {
        OpportunityShare row = new OpportunityShare();
        row.setVacancyId(advertId);
        row.setUniversityId(universityId);
        row.setStatus(status);
        row.setSharedBy(supervisor(universityId).getId());
        row.setSharedAt(LocalDateTime.now());
        row.setTargetProgrammeIds(programmesCsv);
        return shareRepository.save(row).getId();
    }

    private long shareRow(long advertId, long universityId) {
        return shareRow(advertId, universityId, OpportunityShare.Status.SHARED, null);
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    private void close(UserEntity actor, long advertId, int expected) throws Exception {
        mockMvc.perform(post("/api/opportunities/" + advertId + "/share/close").with(as(actor)))
                .andExpect(status().is(expected));
    }

    private List<String> inbox(UserEntity recipient) {
        return notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(
                recipient.getId()).stream().map(Notification::getType).toList();
    }

    private long withdrawalCount(UserEntity recipient) {
        return notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(
                recipient.getId()).stream()
                .filter(n -> "OPPORTUNITY_WITHDRAWN".equals(n.getType())).count();
    }

    // --- 1. the plan's named test: a closed share is invisible ---

    @Test
    void closingASharePullsItOutOfTheStudentFeedImmediately() throws Exception {
        long uni = university();
        UserEntity reviewer = supervisor(uni);
        UserEntity viewer = student(uni, null);
        long advertId = advert();
        shareRow(advertId, uni);

        // Before: the feed shows it and the by-id read answers 200.
        List<Object> before = com.jayway.jsonpath.JsonPath.read(
                mockMvc.perform(get("/api/opportunities").with(as(viewer)))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString(), "$[*].id");
        assertThat(before).extracting(x -> ((Number) x).longValue()).containsExactly(advertId);
        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(viewer)))
                .andExpect(status().isOk());

        close(reviewer, advertId, 200);

        // After: gone from the list, and guessing the id is 404 again [H3][H4].
        String after = mockMvc.perform(get("/api/opportunities").with(as(viewer)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat((List<?>) com.jayway.jsonpath.JsonPath.read(after, "$[*]")).isEmpty();
        mockMvc.perform(get("/api/opportunities/" + advertId).with(as(viewer)))
                .andExpect(status().isNotFound());

        // The row itself: CLOSED with its paperwork — the advert is untouched.
        OpportunityShare row = shareRepository.findById(shareRowId(advertId, uni)).orElseThrow();
        assertThat(row.getStatus()).isEqualTo(OpportunityShare.Status.CLOSED);
        assertThat(row.getClosedBy()).isEqualTo(reviewer.getId());
        assertThat(row.getClosedAt()).isNotNull();
        assertThat(vacancyRepository.findById(advertId).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PUBLISHED);
    }

    private Long shareRowId(long advertId, long universityId) {
        return shareRepository.findByVacancyIdAndUniversityId(advertId, universityId)
                .orElseThrow().getId();
    }

    // --- 2. who is told ---

    @Test
    void everyMatchingStudentIsToldTheOpportunityWasWithdrawnAndNobodyElseIs() throws Exception {
        long uni = university();
        long otherUni = university();
        UserEntity reviewer = supervisor(uni);
        UserEntity addressed = student(uni, (long) PROGRAMME_A1);
        UserEntity narrowedOut = student(uni, (long) PROGRAMME_A2);
        UserEntity otherUniversityStudent = student(otherUni, (long) PROGRAMME_A1);
        long advertId = advert();
        shareRow(advertId, uni, OpportunityShare.Status.SHARED, Integer.toString(PROGRAMME_A1));

        close(reviewer, advertId, 200);

        assertThat(inbox(addressed)).contains("OPPORTUNITY_WITHDRAWN");
        // The share narrowed to programme A1: a programme A2 student at the
        // same university was never in the audience, and another university's
        // student never saw the advert at all [H2] — neither is told.
        assertThat(inbox(narrowedOut)).doesNotContain("OPPORTUNITY_WITHDRAWN");
        assertThat(inbox(otherUniversityStudent)).isEmpty();
        // The supervisors who shared it get their status notice (§9).
        assertThat(inbox(reviewer)).contains("OPPORTUNITY_STATUS");
        // ... and no other university's supervisor hears a word.
        assertThat(inbox(supervisor(otherUni))).isEmpty();
    }

    @Test
    void aCloseWritesItsHistoryAndAuditRow() throws Exception {
        long uni = university();
        UserEntity reviewer = supervisor(uni);
        long advertId = advert();
        long shareId = shareRow(advertId, uni);

        close(reviewer, advertId, 200);

        List<OpportunityStatusHistory> trail = historyRepository
                .findByVacancyIdOrderByChangedAtAsc(advertId);
        assertThat(trail).hasSize(1);
        assertThat(trail.get(0).getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_SHARE);
        assertThat(trail.get(0).getFromStatus()).isEqualTo("SHARED");
        assertThat(trail.get(0).getToStatus()).isEqualTo("CLOSED");
        assertThat(trail.get(0).getChangedBy()).isEqualTo(reviewer.getId());

        assertThat(auditLogRepository.findAll().stream()
                .filter(a -> "OPPORTUNITY_SHARE_STATUS".equals(a.getAction())
                        && a.getDetails().contains("Share " + shareId + " (university " + uni + ")")
                        && a.getDetails().contains("SHARED -> CLOSED"))
                .count()).isEqualTo(1);
    }

    // --- 3. legality: CLOSED is terminal ---

    @Test
    void aShareCannotBeClosedTwiceAndNobodyIsRenotified() throws Exception {
        long uni = university();
        UserEntity reviewer = supervisor(uni);
        UserEntity addressed = student(uni, null);
        long advertId = advert();
        shareRow(advertId, uni);

        close(reviewer, advertId, 200);
        close(reviewer, advertId, 409);

        // One close, one notice — the refused second attempt moved nothing.
        assertThat(withdrawalCount(addressed)).isEqualTo(1);
        assertThat(historyRepository.findByVacancyIdOrderByChangedAtAsc(advertId)).hasSize(1);
    }

    // --- 4. scope and doors [H9][H6] ---

    @Test
    void anAdvertWithNoShareAtThisUniversityIs404() throws Exception {
        long uni = university();
        UserEntity reviewer = supervisor(uni);
        long advertId = advert(); // exists, but nobody shared it here

        close(reviewer, advertId, 404);
        assertThat(shareRepository.findByVacancyId(advertId)).isEmpty();
    }

    @Test
    void anotherUniversitysSupervisorCannotCloseMyShare() throws Exception {
        long uni = university();
        long otherUni = university();
        UserEntity outsider = supervisor(otherUni);
        long advertId = advert();
        long shareId = shareRow(advertId, uni);

        close(outsider, advertId, 404);

        // 404, never 403 — and the row is exactly where it was [H9].
        assertThat(shareRepository.findById(shareId).orElseThrow().getStatus())
                .isEqualTo(OpportunityShare.Status.SHARED);
    }

    @Test
    void theDoorIsSupervisorOnly() throws Exception {
        long uni = university();
        long advertId = advert();
        shareRow(advertId, uni);

        UserEntity studentActor = account("clsst", Role.STUDENT, uni);
        UserEntity companyActor = account("clsco", Role.COMPANY, null);
        UserEntity adminActor = account("clsadm", Role.ADMIN, null);

        close(studentActor, advertId, 403);
        close(companyActor, advertId, 403);
        close(adminActor, advertId, 403);
        // D2: even the super admin is refused — the university is the one
        // answering for its own share, exactly like the share endpoint.
        close(superAdmin(), advertId, 403);
        mockMvc.perform(post("/api/opportunities/" + advertId + "/share/close"))
                .andExpect(status().isUnauthorized());

        // Nothing moved.
        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uni)
                .orElseThrow().getStatus()).isEqualTo(OpportunityShare.Status.SHARED);
    }

    @Test
    void aSupervisorWithoutAUniversityIsRefusedRatherThanShownAnyonesShare() throws Exception {
        long uni = university();
        long advertId = advert();
        shareRow(advertId, uni);
        UserEntity stateless = account("clsstate", Role.SUPERVISOR, null);

        close(stateless, advertId, 403);
    }
}
