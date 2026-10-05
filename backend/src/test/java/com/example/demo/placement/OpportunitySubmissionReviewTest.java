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

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.notification.Notification;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S6.2 (opportunity plan §8.7): {@code GET /api/opportunities/submissions}
 * and {@code POST /{id}/submissions/{submissionId}/respond} — R6's review hop.
 *
 * <p>The plan names one test in this row: a supervisor cannot approve their own
 * submission's share without approval — that guard lives at S6.3 (the share
 * endpoint it blocks does not exist yet), and the repository comment at
 * {@code findByVacancyIdAndStatus} already pins where it is enforced. What this
 * suite owns is the review itself: the queue is the session university's own
 * [H7], the verdict is {@code SUPERVISOR}-only (D2 — even a super admin is
 * refused), the verb is parsed at the door, and a path-anchored submission id
 * that belongs to another advert is a 404 rather than a usable handle.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunitySubmissionReviewTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UniversityRepository universityRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
    @Autowired
    private OpportunitySubmissionRepository submissionRepository;
    @Autowired
    private OpportunityStatusHistoryRepository historyRepository;
    @Autowired
    private NotificationRepository notificationRepository;

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
        return universityRepository.save(new University(("RVW" + tag).substring(0, 15),
                "Review Test University " + tag)).getId();
    }

    private long advert() {
        return vacancyRepository.save(new Vacancy("Reviewed role " + suffix(),
                "A real role a student can be onboarded into", null, "Kampala", "None",
                Vacancy.Status.PENDING_REVIEW.name(), LocalDate.now().plusDays(30), LocalDate.now()))
                .getId();
    }

    /** An R6 proposal planted directly — S6.2 is about reviewing, not proposing. */
    private long submission(long advertId, long universityId, UserEntity proposer,
            OpportunitySubmission.Status status) {
        OpportunitySubmission row = new OpportunitySubmission();
        row.setVacancyId(advertId);
        row.setUniversityId(universityId);
        row.setSubmittedBy(proposer.getId());
        row.setStatus(status);
        return submissionRepository.save(row).getId();
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    private String respond(UserEntity actor, long advertId, long submissionId, String json)
            throws Exception {
        return mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/"
                        + submissionId + "/respond").with(as(actor))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse().getContentAsString();
    }

    private OpportunitySubmission row(long submissionId) {
        return submissionRepository.findById(submissionId).orElseThrow();
    }

    private List<String> noticeTypes(UserEntity recipient) {
        return notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(
                        recipient.getId()).stream()
                .map(Notification::getType).toList();
    }

    // --- 1. GET /submissions: this university's queue only ---

    @Test
    void aSupervisorSeesOnlyTheirOwnUniversitysQueue() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity proposerA = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity proposerB = account("rvprop", Role.SUPERVISOR, uniB);
        long mine = submission(advert(), uniA, proposerA, OpportunitySubmission.Status.PENDING);
        submission(advert(), uniB, proposerB, OpportunitySubmission.Status.PENDING);
        UserEntity supervisorA = account("rvsup", Role.SUPERVISOR, uniA);

        String body = mockMvc.perform(get("/api/opportunities/submissions").with(as(supervisorA)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> ids = JsonPath.read(body, "$[*].id");
        assertThat(ids).hasSize(1);
        assertThat(((Number) ids.get(0)).longValue()).isEqualTo(mine);
    }

    @Test
    void onlyPendingSubmissionsAreInTheQueue() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        long pending = submission(advert(), uniA, proposer, OpportunitySubmission.Status.PENDING);
        submission(advert(), uniA, proposer, OpportunitySubmission.Status.APPROVED);
        submission(advert(), uniA, proposer, OpportunitySubmission.Status.REJECTED);
        UserEntity supervisor = account("rvsup", Role.SUPERVISOR, uniA);

        String body = mockMvc.perform(get("/api/opportunities/submissions").with(as(supervisor)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> ids = JsonPath.read(body, "$[*].id");
        assertThat(ids).hasSize(1);
        assertThat(((Number) ids.get(0)).longValue()).isEqualTo(pending);
    }

    @Test
    void studentsCompaniesAndAnonymousCannotReadTheQueue() throws Exception {
        UserEntity student = account("rvsup", Role.STUDENT, university());
        UserEntity company = account("rvsup", Role.COMPANY, null);

        mockMvc.perform(get("/api/opportunities/submissions").with(as(student)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities/submissions").with(as(company)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities/submissions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aSupervisorWithoutAUniversityHasNoQueueToRead() throws Exception {
        UserEntity floating = account("rvsup", Role.SUPERVISOR, null);

        mockMvc.perform(get("/api/opportunities/submissions").with(as(floating)))
                .andExpect(status().isForbidden());
    }

    // --- 2. The verdict records its paperwork and tells the submitter ---

    @Test
    void approvingRecordsTheReviewAndNotifiesTheProposer() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer, OpportunitySubmission.Status.PENDING);

        String response = respond(reviewer, advertId, submissionId,
                "{\"decision\":\"APPROVED\",\"note\":\"Share it with year 4 only\"}");

        assertThat(response).contains("APPROVED");
        OpportunitySubmission saved = row(submissionId);
        assertThat(saved.getStatus()).isEqualTo(OpportunitySubmission.Status.APPROVED);
        assertThat(saved.getReviewedBy()).isEqualTo(reviewer.getId());
        assertThat(saved.getReviewedAt()).isNotNull();
        assertThat(saved.getReviewNote()).isEqualTo("Share it with year 4 only");

        List<OpportunityStatusHistory> trail = historyRepository
                .findByVacancyIdAndUniversityIdOrderByChangedAtAsc(advertId, uniA);
        assertThat(trail).hasSize(1);
        assertThat(trail.get(0).getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_SUBMISSION);
        assertThat(trail.get(0).getFromStatus()).isEqualTo("PENDING");
        assertThat(trail.get(0).getToStatus()).isEqualTo("APPROVED");
        // The proposer learns their proposal's fate (§9's review notice).
        assertThat(noticeTypes(proposer)).isNotEmpty();
    }

    @Test
    void rejectingRecordsTheSameShape() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer, OpportunitySubmission.Status.PENDING);

        respond(reviewer, advertId, submissionId, "{\"decision\":\"REJECTED\"}");

        OpportunitySubmission saved = row(submissionId);
        assertThat(saved.getStatus()).isEqualTo(OpportunitySubmission.Status.REJECTED);
        assertThat(saved.getReviewedBy()).isEqualTo(reviewer.getId());
        assertThat(saved.getReviewNote()).isNull();
    }

    @Test
    void theReviewNoteIsOptionalButCapped() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer, OpportunitySubmission.Status.PENDING);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/" + submissionId
                        + "/respond").with(as(reviewer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\",\"note\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());

        // Refused before the row moved — still answerable afterwards.
        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.PENDING);

        respond(reviewer, advertId, submissionId, "{\"decision\":\"APPROVED\"}");
        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.APPROVED);
    }

    // --- 3. The door: SUPERVISOR only (D2) ---

    @Test
    void onlyASupervisorMayReviewASubmission() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity student = account("rvsup", Role.STUDENT, uniA);
        UserEntity plainAdmin = account("rvsup", Role.ADMIN, null);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer, OpportunitySubmission.Status.PENDING);

        for (UserEntity actor : List.of(student, plainAdmin, superAdmin())) {
            mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/"
                            + submissionId + "/respond").with(as(actor))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"decision\":\"APPROVED\"}"))
                    .andExpect(status().isForbidden());
        }
        mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/" + submissionId
                        + "/respond")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    @Test
    void missingUnknownAndNonReviewVerbsAreAll400() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer, OpportunitySubmission.Status.PENDING);

        for (String verb : List.of("{\"note\":\"no verb\"}", "{\"decision\":\"PENDING\"}",
                "{\"decision\":\"BANANA\"}")) {
            mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/"
                            + submissionId + "/respond").with(as(reviewer))
                            .contentType(MediaType.APPLICATION_JSON).content(verb))
                    .andExpect(status().isBadRequest());
        }

        // A refused verb never half-reviews the proposal.
        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    // --- 4. [H7]: another university's queue and ids are out of reach ---

    @Test
    void aSupervisorOfAnotherUniversityGets404Not403() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity foreign = account("rvsup", Role.SUPERVISOR, uniB);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer, OpportunitySubmission.Status.PENDING);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/"
                        + submissionId + "/respond").with(as(foreign))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isNotFound());

        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    @Test
    void theForeignSupervisorsQueueNeverContainsIt() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity foreign = account("rvsup", Role.SUPERVISOR, uniB);
        submission(advert(), uniA, proposer, OpportunitySubmission.Status.PENDING);

        String body = mockMvc.perform(get("/api/opportunities/submissions").with(as(foreign)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).isEqualTo("[]");
    }

    // --- 5. Path anchoring and missing rows ---

    @Test
    void aSubmissionIdReplayedUnderAnotherAdvertsPathIsA404() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long realAdvert = advert();
        long otherAdvert = advert();
        long submissionId = submission(realAdvert, uniA, proposer,
                OpportunitySubmission.Status.PENDING);

        mockMvc.perform(post("/api/opportunities/" + otherAdvert + "/submissions/"
                        + submissionId + "/respond").with(as(reviewer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isNotFound());

        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    @Test
    void aMissingSubmissionIsA404() throws Exception {
        long uniA = university();
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long advertId = advert();

        mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/999999999"
                        + "/respond").with(as(reviewer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isNotFound());
    }

    // --- 6. One verdict, one history row ---

    @Test
    void aSubmissionCannotBeReviewedTwice() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer,
                OpportunitySubmission.Status.PENDING);

        respond(reviewer, advertId, submissionId, "{\"decision\":\"APPROVED\"}");
        mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/"
                        + submissionId + "/respond").with(as(reviewer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\"}"))
                .andExpect(status().isConflict());

        // The first verdict stands — no silent reversal of an approval.
        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.APPROVED);
        assertThat(historyRepository.findByVacancyIdAndUniversityIdOrderByChangedAtAsc(
                advertId, uniA)).hasSize(1);
    }

    @Test
    void aRejectedSubmissionIsTerminal() throws Exception {
        long uniA = university();
        UserEntity proposer = account("rvprop", Role.SUPERVISOR, uniA);
        UserEntity reviewer = account("rvsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long submissionId = submission(advertId, uniA, proposer,
                OpportunitySubmission.Status.REJECTED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/submissions/"
                        + submissionId + "/respond").with(as(reviewer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isConflict());

        assertThat(row(submissionId).getStatus()).isEqualTo(OpportunitySubmission.Status.REJECTED);
    }
}
