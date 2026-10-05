package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.notification.Notification;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.school.School;
import com.example.demo.school.SchoolRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S6.3 (opportunity plan §8.7): {@code POST /api/opportunities/{id}/share}
 * and {@code GET /api/opportunities/shared} — the hop that puts an advert in
 * front of students (R4/R5/R6).
 *
 * <p>The plan's Tests column names three things this suite owns: the three
 * relay claims that decide who may share at all (offer → submission → the
 * R5 creator's university, everyone else 404 [H9]), <b>the audience may narrow
 * but never widen</b> [§5.8], and targeting ids that must belong to the
 * session's own university [H7]. It also carries the two tests earlier steps
 * deferred here, because the endpoint they guard did not exist until now: an
 * offer that was <b>never accepted</b> cannot be shared (S6.1), and a
 * supervisor cannot push <b>their own submission</b> into the feed without the
 * review hop (S6.2).
 *
 * <p>The side effects are treated as part of the behaviour, not decoration:
 * sharing an R6 advert publishes it (D2 — the university is the verifier), the
 * §9 {@code OPPORTUNITY_SHARED} notice reaches exactly the students the
 * targeting names and nobody else, and one §5.10 history row appears where the
 * relay began.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityShareTest {

    /** This university's academic units — targeting must resolve inside them. */
    private static final int SCHOOL_A = 93001;
    private static final int DEPARTMENT_A = 93101;
    private static final int PROGRAMME_A1 = 93201;
    private static final int PROGRAMME_A2 = 93202;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UniversityRepository universityRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
    @Autowired
    private OpportunityOfferRepository offerRepository;
    @Autowired
    private OpportunityShareRepository shareRepository;
    @Autowired
    private OpportunitySubmissionRepository submissionRepository;
    @Autowired
    private OpportunityStatusHistoryRepository historyRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private SchoolRepository schoolRepository;
    @Autowired
    private DepartmentRepository departmentRepository;
    @Autowired
    private ProgrammeRepository programmeRepository;
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
        return universityRepository.save(new University(("SHR" + tag).substring(0, 15),
                "Share Test University " + tag)).getId();
    }

    private void academicUnits(long universityId) {
        School school = new School();
        school.setSchoolId(SCHOOL_A);
        school.setUniversityId((int) universityId);
        school.setSchoolName("School of Sharing");
        schoolRepository.save(school);

        Department department = new Department();
        department.setDepartmentId(DEPARTMENT_A);
        department.setSchoolId(SCHOOL_A);
        department.setUniversityId((int) universityId);
        department.setDepartmentName("Department of Sharing");
        departmentRepository.save(department);

        for (int programmeId : new int[] { PROGRAMME_A1, PROGRAMME_A2 }) {
            Programme programme = new Programme();
            programme.setProgrammeId(programmeId);
            programme.setSchoolId(SCHOOL_A);
            programme.setUniversityId((int) universityId);
            programme.setProgrammeCode("BSC-SHR" + programmeId);
            programme.setProgrammeName("BSc Sharing " + programmeId);
            programme.setProgrammeLevel("UNDERGRADUATE");
            programme.setDurationYears(3);
            programmeRepository.save(programme);
        }
    }

    private long advert(Vacancy.Status status, Vacancy.Origin origin) {
        Vacancy advert = new Vacancy("Shared role " + suffix(),
                "A real role a student can be onboarded into", null, "Kampala", "None",
                status.name(), LocalDate.now().plusDays(30), LocalDate.now());
        advert.setOrigin(origin);
        return vacancyRepository.save(advert).getId();
    }

    /** An R5-style advert with a real creator — targeting tests share this shape. */
    private long advertTargeting(UserEntity creator, String programmesCsv, String yearsCsv) {
        long id = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        Vacancy advert = vacancyRepository.findById(id).orElseThrow();
        advert.setVerifiedBy(creator.getId());
        advert.setTargetProgrammeIds(programmesCsv);
        advert.setTargetYearOfStudy(yearsCsv);
        return vacancyRepository.save(advert).getId();
    }

    private long submission(long advertId, long universityId, UserEntity proposer,
            OpportunitySubmission.Status status) {
        OpportunitySubmission row = new OpportunitySubmission();
        row.setVacancyId(advertId);
        row.setUniversityId(universityId);
        row.setSubmittedBy(proposer.getId());
        row.setStatus(status);
        return submissionRepository.save(row).getId();
    }

    private long offer(long advertId, long universityId, OpportunityOffer.Status status) {
        OpportunityOffer row = new OpportunityOffer();
        row.setVacancyId(advertId);
        row.setUniversityId(universityId);
        row.setStatus(status);
        row.setOfferedBy(superAdmin().getId());
        return offerRepository.save(row).getId();
    }

    private UserEntity student(long universityId, Long departmentId, Long programmeId,
            Integer yearOfStudy) {
        UserEntity account = account("shrst", Role.STUDENT, universityId);
        Student student = new Student();
        student.setUserId(account.getId());
        student.setUniversityId(universityId);
        student.setDepartmentId(departmentId);
        student.setProgrammeId(programmeId);
        student.setYearOfStudy(yearOfStudy);
        student.setFirstName("Share");
        student.setLastName("Student" + suffix());
        student.setRegistrationNumber("REG" + suffix());
        student.setStudentNumber("SHR" + suffix());
        student.setDegreeProgram("Computer Science");
        student.setStartDate(LocalDate.now());
        studentRepository.save(student);
        return account;
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    private String share(UserEntity actor, long advertId, String json) throws Exception {
        return mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(actor))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse().getContentAsString();
    }

    private OpportunityShare row(long advertId, long universityId) {
        return shareRepository.findByVacancyIdAndUniversityId(advertId, universityId)
                .orElseThrow();
    }

    private List<String> noticeTypes(UserEntity recipient) {
        return notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(
                        recipient.getId()).stream()
                .map(Notification::getType).toList();
    }

    private long auditCount(String action) {
        return auditLogRepository.findAll().stream()
                .filter(a -> action.equals(a.getAction()))
                .count();
    }

    // --- 1. R6: an approved submission can be shared ---

    @Test
    void anApprovedSubmissionCanBeSharedAndTheAdvertGoesLive() throws Exception {
        long uniA = university();
        academicUnits(uniA);
        UserEntity proposer = account("shrprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PENDING_REVIEW, Vacancy.Origin.SUPERVISOR);
        submission(advertId, uniA, proposer, OpportunitySubmission.Status.APPROVED);

        String response = share(reviewer, advertId,
                "{\"note\":\"Year 3 only\","
                        + "\"target\":{\"programmeIds\":[93201],\"departmentIds\":[93101],"
                        + "\"yearsOfStudy\":[3]}}");

        long shareId = ((Number) JsonPath.read(response, "$.id")).longValue();
        OpportunityShare saved = shareRepository.findById(shareId).orElseThrow();
        assertThat(saved.getUniversityId()).isEqualTo(uniA);
        assertThat(saved.getOfferId()).isNull();
        assertThat(saved.getStatus()).isEqualTo(OpportunityShare.Status.SHARED);
        assertThat(saved.getSharedBy()).isEqualTo(reviewer.getId());
        assertThat(saved.getNote()).isEqualTo("Year 3 only");
        assertThat(saved.getTargetProgrammeIds()).isEqualTo("93201");
        assertThat(saved.getTargetYearOfStudy()).isEqualTo("3");

        // D2: the university's approval is the verdict, so sharing publishes it.
        Vacancy live = vacancyRepository.findById(advertId).orElseThrow();
        assertThat(live.getStatus()).isEqualTo(Vacancy.Status.PUBLISHED);
        assertThat(live.getPublishedAt()).isNotNull();

        List<OpportunityStatusHistory> trail = historyRepository
                .findByVacancyIdOrderByChangedAtAsc(advertId);
        assertThat(trail).anySatisfy(row -> {
            assertThat(row.getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_SHARE);
            assertThat(row.getFromStatus()).isNull();
            assertThat(row.getToStatus()).isEqualTo(OpportunityShare.Status.SHARED.name());
            assertThat(row.getUniversityId()).isEqualTo(uniA);
        });
        assertThat(trail).anySatisfy(row -> {
            assertThat(row.getRelayType()).isNull();
            assertThat(row.getFromStatus()).isEqualTo(Vacancy.Status.PENDING_REVIEW.name());
            assertThat(row.getToStatus()).isEqualTo(Vacancy.Status.PUBLISHED.name());
        });
        assertThat(auditCount("OPPORTUNITY_SHARED")).isEqualTo(1);
    }

    @Test
    void theFanOutReachesExactlyTheStudentsTheTargetingNames() throws Exception {
        long uniA = university();
        long uniB = university();
        academicUnits(uniA);
        UserEntity proposer = account("shrprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PENDING_REVIEW, Vacancy.Origin.SUPERVISOR);
        submission(advertId, uniA, proposer, OpportunitySubmission.Status.APPROVED);

        UserEntity matching = student(uniA, (long) DEPARTMENT_A, (long) PROGRAMME_A1, 3);
        UserEntity wrongProgramme = student(uniA, (long) DEPARTMENT_A, (long) PROGRAMME_A2, 3);
        UserEntity wrongYear = student(uniA, (long) DEPARTMENT_A, (long) PROGRAMME_A1, 4);
        UserEntity otherUniversity = student(uniB, null, null, 3);

        share(reviewer, advertId,
                "{\"target\":{\"programmeIds\":[93201],\"yearsOfStudy\":[3]}}");

        assertThat(noticeTypes(matching)).contains("OPPORTUNITY_SHARED");
        assertThat(noticeTypes(wrongProgramme)).doesNotContain("OPPORTUNITY_SHARED");
        assertThat(noticeTypes(wrongYear)).doesNotContain("OPPORTUNITY_SHARED");
        assertThat(noticeTypes(otherUniversity)).doesNotContain("OPPORTUNITY_SHARED");
    }

    @Test
    void aSupervisorsSubmissionCannotBeSharedWithoutTheReviewHop() throws Exception {
        // The guard S6.2 deferred to this step: approval first, feed second.
        long uniA = university();
        UserEntity proposer = account("shrprop", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PENDING_REVIEW, Vacancy.Origin.SUPERVISOR);
        submission(advertId, uniA, proposer, OpportunitySubmission.Status.PENDING);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(proposer))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
        // Refused before anything moved — still PENDING, still unshared.
        assertThat(submissionRepository.findByVacancyId(advertId).orElseThrow().getStatus())
                .isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    @Test
    void aRejectedSubmissionsShareIsRefused() throws Exception {
        long uniA = university();
        UserEntity proposer = account("shrprop", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PENDING_REVIEW, Vacancy.Origin.SUPERVISOR);
        submission(advertId, uniA, proposer, OpportunitySubmission.Status.REJECTED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(proposer))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
    }

    @Test
    void theShareNoteIsOptionalButCapped() throws Exception {
        long uniA = university();
        UserEntity proposer = account("shrprop", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        vacancyRepository.findById(advertId).orElseThrow().setVerifiedBy(proposer.getId());
        submission(advertId, uniA, proposer, OpportunitySubmission.Status.APPROVED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(proposer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());

        // Refused before the row — a short note then lands cleanly.
        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
        share(proposer, advertId, "{\"note\":\"  fits  \"}");
        assertThat(row(advertId, uniA).getNote()).isEqualTo("fits");
    }

    // --- 2. R4: an accepted offer can be shared ---

    @Test
    void anAcceptedOfferIsSharedAndTheOfferMovesAlong() throws Exception {
        long uniA = university();
        academicUnits(uniA);
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.COMPANY);
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.ACCEPTED);

        String response = share(supervisor, advertId, "{}");

        long shareId = ((Number) JsonPath.read(response, "$.id")).longValue();
        assertThat(shareRepository.findById(shareId).orElseThrow().getOfferId())
                .isEqualTo(offerId);
        assertThat(offerRepository.findById(offerId).orElseThrow().getStatus())
                .isEqualTo(OpportunityOffer.Status.SHARED);

        assertThat(historyRepository
                .findByVacancyIdAndRelayTypeOrderByChangedAtAsc(advertId,
                        OpportunityStatusHistory.RELAY_OFFER))
                .anySatisfy(row -> {
                    assertThat(row.getFromStatus())
                            .isEqualTo(OpportunityOffer.Status.ACCEPTED.name());
                    assertThat(row.getToStatus())
                            .isEqualTo(OpportunityOffer.Status.SHARED.name());
                });
        assertThat(historyRepository
                .findByVacancyIdAndRelayTypeOrderByChangedAtAsc(advertId,
                        OpportunityStatusHistory.RELAY_SHARE))
                .hasSize(1);
    }

    @Test
    void anOfferThatWasNeverAcceptedCannotBeShared() throws Exception {
        // The test S6.1 deferred: an unaccepted offer carries no authority.
        long uniA = university();
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.COMPANY);
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
        assertThat(offerRepository.findById(offerId).orElseThrow().getStatus())
                .isEqualTo(OpportunityOffer.Status.OFFERED);
    }

    @Test
    void aDeclinedOfferCannotBeShared() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.COMPANY);
        offer(advertId, uniA, OpportunityOffer.Status.DECLINED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
    }

    // --- 3. Scope: another university's claim does not exist [H9] ---

    @Test
    void aSupervisorOfAnOfferedAdvertAtAnotherUniversityGets404() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity foreign = account("shrfor", Role.SUPERVISOR, uniB);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.COMPANY);
        offer(advertId, uniA, OpportunityOffer.Status.ACCEPTED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(foreign))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniB)).isEmpty();
    }

    @Test
    void aSupervisorOfASubmissionAtAnotherUniversityGets404() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity proposer = account("shrprop", Role.SUPERVISOR, uniA);
        UserEntity foreign = account("shrfor", Role.SUPERVISOR, uniB);
        long advertId = advert(Vacancy.Status.PENDING_REVIEW, Vacancy.Origin.SUPERVISOR);
        submission(advertId, uniA, proposer, OpportunitySubmission.Status.APPROVED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(foreign))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniB)).isEmpty();
    }

    @Test
    void theUniversityThatSourcedTheAdvertCanShareIt() throws Exception {
        // R5: no offer, no submission — the claim is the session that sourced it.
        long uniA = university();
        UserEntity sourced = account("shrsrc", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        vacancyRepository.findById(advertId).orElseThrow().setVerifiedBy(sourced.getId());

        String response = share(sourced, advertId, "{}");

        long shareId = ((Number) JsonPath.read(response, "$.id")).longValue();
        OpportunityShare saved = shareRepository.findById(shareId).orElseThrow();
        assertThat(saved.getUniversityId()).isEqualTo(uniA);
        assertThat(saved.getOfferId()).isNull();
    }

    @Test
    void anotherUniversityCannotShareASourcedAdvert() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity sourced = account("shrsrc", Role.SUPERVISOR, uniA);
        UserEntity foreign = account("shrfor", Role.SUPERVISOR, uniB);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        vacancyRepository.findById(advertId).orElseThrow().setVerifiedBy(sourced.getId());

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(foreign))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniB)).isEmpty();
    }

    @Test
    void aSupervisorWithoutAUniversityCannotShare() throws Exception {
        UserEntity floating = account("shrflo", Role.SUPERVISOR, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(floating))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void aMissingAdvertIsA404() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);

        mockMvc.perform(post("/api/opportunities/999999999/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
    }

    // --- 4. The audience may narrow, never widen [§5.8] ---

    @Test
    void targetingIdsMustBelongToTheOwnUniversity() throws Exception {
        long uniA = university();
        academicUnits(uniA);
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advertTargeting(supervisor, null, null);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target\":{\"programmeIds\":[999999]}}"))
                .andExpect(status().isBadRequest());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
    }

    @Test
    void droppingTheOfferedTargetingIsWidening() throws Exception {
        long uniA = university();
        academicUnits(uniA);
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advertTargeting(supervisor, "93201", null);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
    }

    @Test
    void targetingAProgrammeThatWasNotOfferedIsWidening() throws Exception {
        long uniA = university();
        academicUnits(uniA);
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advertTargeting(supervisor, "93201", null);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target\":{\"programmeIds\":[93202]}}"))
                .andExpect(status().isBadRequest());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
    }

    @Test
    void narrowingWithinTheOfferedAudienceIsAllowed() throws Exception {
        long uniA = university();
        academicUnits(uniA);
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advertTargeting(supervisor, "93201,93202", "3,4");

        share(supervisor, advertId,
                "{\"target\":{\"programmeIds\":[93201],\"yearsOfStudy\":[3]}}");

        OpportunityShare saved = row(advertId, uniA);
        assertThat(saved.getTargetProgrammeIds()).isEqualTo("93201");
        assertThat(saved.getTargetYearOfStudy()).isEqualTo("3");
    }

    // --- 5. The door, dead adverts, and a second share ---

    @Test
    void studentsCompaniesAdminsAndSuperAdminsAreRefusedAtTheDoor() throws Exception {
        long uniA = university();
        UserEntity student = account("shrstu", Role.STUDENT, uniA);
        UserEntity company = account("shrco", Role.COMPANY, null);
        UserEntity plainAdmin = account("shradm", Role.ADMIN, null);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);

        for (UserEntity actor : List.of(student, company, plainAdmin, superAdmin())) {
            mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(actor))
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden());
        }
        assertThat(shareRepository.findByVacancyId(advertId)).isEmpty();
    }

    @Test
    void anonymousIsRefused() throws Exception {
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aDeadAdvertCannotBeShared() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.WITHDRAWN, Vacancy.Origin.COMPANY);
        offer(advertId, uniA, OpportunityOffer.Status.ACCEPTED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());

        assertThat(shareRepository.findByVacancyIdAndUniversityId(advertId, uniA)).isEmpty();
    }

    @Test
    void sharingTheSameAdvertTwiceIsAConflict() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        vacancyRepository.findById(advertId).orElseThrow().setVerifiedBy(supervisor.getId());

        share(supervisor, advertId, "{}");
        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());

        assertThat(shareRepository.findByVacancyId(advertId)).hasSize(1);
    }

    @Test
    void aClosedShareCannotBeReopenedBySharingAgain() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);
        long advertId = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        vacancyRepository.findById(advertId).orElseThrow().setVerifiedBy(supervisor.getId());
        OpportunityShare closed = new OpportunityShare();
        closed.setVacancyId(advertId);
        closed.setUniversityId(uniA);
        closed.setStatus(OpportunityShare.Status.CLOSED);
        closed.setSharedBy(supervisor.getId());
        shareRepository.save(closed);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());
    }

    // --- 6. GET /shared: my university's own broadcasts ---

    @Test
    void theSharedListIsScopedToMyOwnUniversity() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity supervisorA = account("shrsup", Role.SUPERVISOR, uniA);
        UserEntity supervisorB = account("shrsup", Role.SUPERVISOR, uniB);
        long advertA = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        vacancyRepository.findById(advertA).orElseThrow().setVerifiedBy(supervisorA.getId());
        long advertB = advert(Vacancy.Status.PUBLISHED, Vacancy.Origin.UNIVERSITY);
        vacancyRepository.findById(advertB).orElseThrow().setVerifiedBy(supervisorB.getId());
        share(supervisorA, advertA, "{}");
        share(supervisorB, advertB, "{}");

        String body = mockMvc.perform(get("/api/opportunities/shared").with(as(supervisorA)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> ids = JsonPath.read(body, "$[*].id");
        assertThat(ids).hasSize(1);
        assertThat(((Number) ids.get(0)).longValue())
                .isEqualTo(row(advertA, uniA).getId());
    }

    @Test
    void theSharedListRefusesStudentsAndTheUniversityless() throws Exception {
        long uniA = university();
        UserEntity student = account("shrstu", Role.STUDENT, uniA);
        UserEntity floating = account("shrflo", Role.SUPERVISOR, null);

        mockMvc.perform(get("/api/opportunities/shared").with(as(student)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities/shared"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/opportunities/shared").with(as(floating)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anEmptySharedListIsAnEmptyList() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("shrsup", Role.SUPERVISOR, uniA);

        String body = mockMvc.perform(get("/api/opportunities/shared").with(as(supervisor)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).isEqualTo("[]");
    }
}
