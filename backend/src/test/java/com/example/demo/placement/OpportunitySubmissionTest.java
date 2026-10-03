package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLog;
import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.notification.Notification;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.school.School;
import com.example.demo.school.SchoolRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S3.1 (opportunity plan §8.4): {@code POST /api/opportunities}.
 *
 * <p>The suite is built around one inversion: <b>every field that carries
 * authority is sent in the body and proven to be ignored</b>. A test that only
 * checked the happy path would pass an implementation that trusted the body —
 * which is exactly the forgery [H5][H6][H8] this endpoint exists to make
 * impossible.
 *
 * <p>The other half is the two supervisor stories (R5 vs R6): same role, same
 * endpoint, and the only difference is the evidence field, because the brief
 * genuinely contains both "the university sources it itself" and "a supervisor
 * proposes it for review". Origin still derives from the session either way.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunitySubmissionTest {

    private static final long COMPANY_ID = 42L;
    private static final long UNI_A = 777L;
    private static final long UNI_B = 888L;

    /** Academic units at UNI_A — the actor's own. */
    private static final int SCHOOL_A = 91001;
    private static final int DEPARTMENT_A = 91101;
    private static final int PROGRAMME_A = 91201;
    /** The same kinds of unit at UNI_B — someone else's. */
    private static final int SCHOOL_B = 92001;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
    @Autowired
    private SchoolRepository schoolRepository;
    @Autowired
    private DepartmentRepository departmentRepository;
    @Autowired
    private ProgrammeRepository programmeRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private OpportunitySubmissionRepository submissionRepository;
    @Autowired
    private OpportunityAudienceResolver resolver;

    // --- Fixtures ---

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private UserEntity superAdmin() {
        return userRepository.findByUsername("admin").orElseThrow();
    }

    private UserEntity account(String prefix, Role role, Long companyId, Long universityId) {
        UserEntity user = new UserEntity(prefix + suffix(), "hash", role);
        user.setMustChangePassword(false);
        user.setCompanyId(companyId);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private UserEntity companyUser() {
        Company company = new Company();
        company.setName("Submit Co " + suffix());
        long companyId = companyRepository.save(company).getId();
        return account("subco", Role.COMPANY, companyId, null);
    }

    private UserEntity supervisor() {
        return account("subsup", Role.SUPERVISOR, null, UNI_A);
    }

    private UserEntity plainAdmin() {
        return account("subadm", Role.ADMIN, null, null);
    }

    private void academicUnits() {
        School school = new School();
        school.setSchoolId(SCHOOL_A);
        school.setUniversityId((int) UNI_A);
        school.setSchoolName("School of Testing A");
        schoolRepository.save(school);

        School foreign = new School();
        foreign.setSchoolId(SCHOOL_B);
        foreign.setUniversityId((int) UNI_B);
        foreign.setSchoolName("School of Testing B");
        schoolRepository.save(foreign);

        Department department = new Department();
        department.setDepartmentId(DEPARTMENT_A);
        department.setSchoolId(SCHOOL_A);
        department.setUniversityId((int) UNI_A);
        department.setDepartmentName("Department of Testing A");
        departmentRepository.save(department);

        Programme programme = new Programme();
        programme.setProgrammeId(PROGRAMME_A);
        programme.setSchoolId(SCHOOL_A);
        programme.setUniversityId((int) UNI_A);
        programme.setProgrammeCode("BSC-TST");
        programme.setProgrammeName("BSc Testing");
        programme.setProgrammeLevel("UNDERGRADUATE");
        programme.setDurationYears(3);
        programmeRepository.save(programme);
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    /** A minimal valid body; extras are raw JSON fragments such as "\"slots\": 3". */
    private String body(String... extras) {
        StringBuilder json = new StringBuilder(
                "{\"title\":\"Data intern\","
                        + "\"description\":\"A real role a student can be onboarded into\","
                        + "\"deadline\":\"2026-12-31\"");
        for (String extra : extras) {
            json.append(',').append(extra);
        }
        return json.append('}').toString();
    }

    private String postExpecting(UserEntity actor, String json, int expectedStatus) throws Exception {
        return mockMvc.perform(post("/api/opportunities").with(as(actor))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString();
    }

    private long idOf(String responseBody) {
        return ((Number) JsonPath.read(responseBody, "$.id")).longValue();
    }

    private boolean notified(UserEntity recipient, String type) {
        return notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(recipient.getId()).stream()
                .anyMatch(n -> type.equals(n.getType()));
    }

    private long auditCount(String detailsFragment) {
        return auditLogRepository.findAll().stream()
                .filter(a -> "OPPORTUNITY_SUBMITTED".equals(a.getAction())
                        && a.getDetails() != null && a.getDetails().contains(detailsFragment))
                .count();
    }

    // --- 1. Each role's derived origin, status and company ------------------

    @Test
    void aCompanySubmissionIsBornPendingReviewAndUnverified() throws Exception {
        UserEntity owner = companyUser();

        String response = postExpecting(owner, body(), 201);

        assertThat(response).contains("\"origin\":\"COMPANY\"");
        assertThat(response).contains("\"status\":\"PENDING_REVIEW\"");
        assertThat(response).contains("\"verificationStatus\":\"UNVERIFIED\"");
        assertThat(response).contains("\"sourceKind\":\"COMPANY_DIRECT\"");
        assertThat(vacancyRepository.findById(idOf(response)).orElseThrow().getCompanyId())
                .isEqualTo(owner.getCompanyId());
    }

    @Test
    void everyForgeableFieldInTheBodyIsIgnored() throws Exception {
        UserEntity owner = companyUser();

        // Send every authority-carrying field pointing somewhere else entirely.
        String response = postExpecting(owner,
                body("\"origin\":\"SUPER_ADMIN\"", "\"status\":\"PUBLISHED\"",
                        "\"verificationStatus\":\"VERIFIED\"", "\"companyId\":9999",
                        "\"externalOrgName\":\"Ignored Ltd\""),
                201);

        assertThat(response).contains("\"origin\":\"COMPANY\"");
        assertThat(response).contains("\"status\":\"PENDING_REVIEW\"");
        assertThat(response).contains("\"verificationStatus\":\"UNVERIFIED\"");
        // The session's company, not the body's 9999 [H8].
        assertThat(vacancyRepository.findById(idOf(response)).orElseThrow().getCompanyId())
                .isEqualTo(owner.getCompanyId())
                .isNotEqualTo(9999L);
    }

    @Test
    void aSuperAdminSourcesAnExternalOfferPublishedAndVerifiedInOneMove() throws Exception {
        UserEntity admin = superAdmin();

        String response = postExpecting(admin,
                body("\"origin\":\"PENDING_REVIEW\"", "\"status\":\"PENDING_REVIEW\"",
                        "\"verificationStatus\":\"REJECTED\"", "\"companyId\":9999",
                        "\"externalOrgName\":\"Global Fintech Ltd\"",
                        "\"sourceKind\":\"EXTERNAL_OFFER\"",
                        "\"sourceReference\":\"https://example.org/careers/7\""),
                201);

        assertThat(response).contains("\"origin\":\"SUPER_ADMIN\"");
        assertThat(response).contains("\"status\":\"PUBLISHED\"");
        assertThat(response).contains("\"verificationStatus\":\"VERIFIED\"");
        assertThat(response).contains("\"sourceReference\":\"https://example.org/careers/7\"");
        Vacancy saved = vacancyRepository.findById(idOf(response)).orElseThrow();
        assertThat(saved.getCompanyId()).isNull();
        assertThat(saved.getVerifiedBy()).isEqualTo(admin.getId());
        assertThat(saved.getVerifiedAt()).isNotNull();
        assertThat(saved.getPublishedAt()).isNotNull();
    }

    @Test
    void aSourcedOfferWithoutEvidenceIsRefused() throws Exception {
        postExpecting(superAdmin(),
                body("\"externalOrgName\":\"Global Fintech Ltd\""),
                400);
    }

    @Test
    void aPlainAdminPostingLandsInReviewNotInPublish() throws Exception {
        // R2's legitimacy verdict belongs to the super_admin flag, not the role
        // alone: without it the admin is just another submitter.
        String response = postExpecting(plainAdmin(),
                body("\"externalOrgName\":\"Global Fintech Ltd\"",
                        "\"sourceReference\":\"ref-1\""),
                201);

        assertThat(response).contains("\"origin\":\"SUPER_ADMIN\"");
        assertThat(response).contains("\"status\":\"PENDING_REVIEW\"");
        assertThat(response).contains("\"verificationStatus\":\"UNVERIFIED\"");
    }

    @Test
    void aSupervisorProposalIsPendingReviewWhileForgingNothing() throws Exception {
        UserEntity reviewerTarget = supervisor();

        String response = postExpecting(reviewerTarget,
                body("\"origin\":\"UNIVERSITY\"", "\"status\":\"PUBLISHED\"",
                        "\"verificationStatus\":\"VERIFIED\"", "\"companyId\":9999",
                        "\"externalOrgName\":\"Kololo Labs\"",
                        "\"sourceKind\":\"SUPERVISOR_SOURCED\""),
                201);

        // R6: a proposal waits for the university (its submission row follows in S3.2).
        assertThat(response).contains("\"origin\":\"SUPERVISOR\"");
        assertThat(response).contains("\"status\":\"PENDING_REVIEW\"");
        assertThat(response).contains("\"verificationStatus\":\"UNVERIFIED\"");
        assertThat(vacancyRepository.findById(idOf(response)).orElseThrow().getCompanyId())
                .isNull();
    }

    @Test
    void aUniversitySourcedOpportunityGoesStraightToPublished() throws Exception {
        UserEntity sourcingSupervisor = supervisor();

        String response = postExpecting(sourcingSupervisor,
                body("\"origin\":\"COMPANY\"", "\"status\":\"PENDING_REVIEW\"",
                        "\"externalOrgName\":\"Kololo Labs\"",
                        "\"sourceKind\":\"UNIVERSITY_SOURCED\"",
                        "\"verificationNote\":\"Listed by the faculty notice board.\""),
                201);

        // R5 + D2: the university is the trusted verifier — no super-admin hop.
        assertThat(response).contains("\"origin\":\"UNIVERSITY\"");
        assertThat(response).contains("\"status\":\"PUBLISHED\"");
        assertThat(response).contains("\"verificationStatus\":\"VERIFIED\"");
        Vacancy saved = vacancyRepository.findById(idOf(response)).orElseThrow();
        assertThat(saved.getVerifiedBy()).isEqualTo(sourcingSupervisor.getId());
    }

    // --- 2. The validations §8.4 names --------------------------------------

    @Test
    void anExternalOrganisationIsRequiredWhenThereIsNoCompany() throws Exception {
        postExpecting(supervisor(), body(), 400);
    }

    @Test
    void targetingIdsMustBelongToTheActorsUniversity() throws Exception {
        academicUnits();
        UserEntity actor = supervisor();

        // Another university's school [H7] — refused...
        postExpecting(actor,
                body("\"externalOrgName\":\"Kololo Labs\"", "\"targetSchoolIds\":\"" + SCHOOL_B + "\""),
                400);

        // ...and their own school is fine.
        String response = postExpecting(actor,
                body("\"externalOrgName\":\"Kololo Labs\"",
                        "\"targetSchoolIds\":\"" + SCHOOL_A + "\"",
                        "\"targetDepartmentIds\":\"" + DEPARTMENT_A + "\"",
                        "\"targetProgrammeIds\":\"" + PROGRAMME_A + "\""),
                201);
        assertThat(response).contains("\"targetSchoolIds\":\"" + SCHOOL_A + "\"");
    }

    @Test
    void targetingIsRefusedForAnActorWithNoUniversity() throws Exception {
        // A company cannot claim academic targeting: there is no university whose
        // units it could name. Targeting is set on the way down (§5.8).
        postExpecting(companyUser(),
                body("\"targetProgrammeIds\":\"" + PROGRAMME_A + "\""),
                400);
    }

    @Test
    void logisticsOrderingAndVocabularyAreValidated() throws Exception {
        UserEntity actor = companyUser();

        postExpecting(actor, body("\"startDate\":\"2026-09-01\"", "\"endDate\":\"2026-07-01\""),
                400);
        postExpecting(actor, body("\"durationWeeks\":0"), 400);
        postExpecting(actor, body("\"slots\":-1"), 400);
        postExpecting(actor, body("\"workMode\":\"BY_CARRIER_PIGEON\""),
                400);
        postExpecting(companyUser(), body("\"sourceKind\":\"LEGENDARY\""),
                400);
    }

    // --- 3. Who may post at all --------------------------------------------

    @Test
    void studentsAndFieldSupervisorsCannotPostAnOpportunity() throws Exception {
        postExpecting(account("substd", Role.STUDENT, null, UNI_A), body(),
                403);
        postExpecting(account("subind", Role.INDUSTRIAL_SUPERVISOR, COMPANY_ID, null), body(),
                403);
    }

    // --- 4. Side effects ----------------------------------------------------

    @Test
    void awaitingReviewNotifiesWhoeverIsActuallyWaitingAndEveryCreationIsAudited() throws Exception {
        UserEntity admin = superAdmin();

        // A company submission waits on the super admin's inbox [R1]...
        String pending = postExpecting(companyUser(), body(), 201);
        assertThat(notified(admin, "OPPORTUNITY_SUBMITTED")).isTrue();
        assertThat(auditCount("Opportunity " + idOf(pending))).isEqualTo(1);

        // ...while a born-published advert awaits nobody's decision: audited, never
        // announced as awaiting review (§9's catalog event does not apply to it).
        String published = postExpecting(admin,
                body("\"externalOrgName\":\"Global Fintech Ltd\"", "\"sourceReference\":\"ref-9\""),
                201);
        assertThat(auditCount("Opportunity " + idOf(published))).isEqualTo(1);
        long submittedNotices = notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(admin.getId()).stream()
                .filter(n -> "OPPORTUNITY_SUBMITTED".equals(n.getType()))
                .count();
        assertThat(submittedNotices).isEqualTo(1);
    }

    @Test
    void theResponseNeverEchoesAForgedIdentityBackAsFact() throws Exception {
        // A forged body must not even come back looking successful-but-wrong: what
        // the client reads is what was derived, so an integrator can detect the
        // ignore instead of believing their own payload stuck.
        UserEntity owner = companyUser();
        String response = postExpecting(owner,
                body("\"origin\":\"UNIVERSITY\"", "\"status\":\"CLOSED\""),
                201);

        assertThat(response).contains("\"origin\":\"COMPANY\"");
        assertThat(response).contains("\"status\":\"PENDING_REVIEW\"");
        assertThat(response).doesNotContain("\"status\":\"CLOSED\"");
    }

    @Test
    void notificationsReachOnlyTheModeratorsWhoAreWaiting() throws Exception {
        UserEntity owner = companyUser();
        UserEntity rival = companyUser();

        postExpecting(owner, body(), 201);

        assertThat(notified(superAdmin(), "OPPORTUNITY_SUBMITTED")).isTrue();
        assertThat(notified(rival, "OPPORTUNITY_SUBMITTED")).isFalse();
    }

    // --- 5. S3.2: the R6 submission record ---------------------------------

    @Test
    void aSupervisorProposalWritesAPendingSubmissionForTheirUniversity() throws Exception {
        UserEntity proposer = supervisor();

        String response = postExpecting(proposer,
                body("\"externalOrgName\":\"Kololo Labs\""), 201);

        OpportunitySubmission proposal = submissionRepository
                .findByVacancyId(idOf(response)).orElseThrow();
        // The session's university, forced — no universityId exists on the body to
        // forge even if a client tried [H7].
        assertThat(proposal.getUniversityId()).isEqualTo(UNI_A);
        assertThat(proposal.getSubmittedBy()).isEqualTo(proposer.getId());
        assertThat(proposal.getStatus()).isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    @Test
    void theProposalReachesItsOwnUniversityAndNoOtherAndNeverAStudent() throws Exception {
        String response = postExpecting(supervisor(),
                body("\"externalOrgName\":\"Kololo Labs\""), 201);
        Vacancy advert = vacancyRepository.findById(idOf(response)).orElseThrow();

        // R6 half one: the university's review queue holds it...
        assertThat(submissionRepository
                .findByUniversityIdAndStatusOrderBySubmittedAtAsc(UNI_A,
                        OpportunitySubmission.Status.PENDING))
                .anyMatch(s -> s.getVacancyId().equals(advert.getId()));
        // ...no other university sees it...
        assertThat(submissionRepository
                .findByUniversityIdAndStatusOrderBySubmittedAtAsc(UNI_B,
                        OpportunitySubmission.Status.PENDING))
                .noneMatch(s -> s.getVacancyId().equals(advert.getId()));
        // ...and a student of the very same university never does: a proposal is
        // R1's private state until it is reviewed and shared.
        UserEntity student = account("substd", Role.STUDENT, null, UNI_A);
        assertThat(resolver.capacityOf(student, advert))
                .isEqualTo(OpportunityAudienceResolver.Capacity.NONE);
    }

    @Test
    void theProposalIsAnnouncedToItsUniversityAndNotToTheSuperAdmins() throws Exception {
        UserEntity peerAtSameUniversity = account("subsup", Role.SUPERVISOR, null, UNI_A);
        UserEntity peerElsewhere = account("subsup", Role.SUPERVISOR, null, UNI_B);
        UserEntity admin = superAdmin();

        postExpecting(supervisor(), body("\"externalOrgName\":\"Kololo Labs\""), 201);

        assertThat(notified(peerAtSameUniversity, "OPPORTUNITY_SUBMISSION")).isTrue();
        assertThat(notified(peerElsewhere, "OPPORTUNITY_SUBMISSION")).isFalse();
        // D2: an R6 proposal never passes the super admin — their inbox stays quiet.
        assertThat(notified(admin, "OPPORTUNITY_SUBMITTED")).isFalse();
    }

    @Test
    void companyAndUniversitySourcedPostsWriteNoSubmissionRow() throws Exception {
        String companyResponse = postExpecting(companyUser(), body(), 201);
        String sourcedResponse = postExpecting(supervisor(),
                body("\"externalOrgName\":\"Kololo Labs\"",
                        "\"sourceKind\":\"UNIVERSITY_SOURCED\""),
                201);

        // Company submissions wait in the super admin's inbox instead; R5 needs no
        // review hop at all (D2) — only R6 has this record.
        assertThat(submissionRepository.findByVacancyId(idOf(companyResponse))).isEmpty();
        assertThat(submissionRepository.findByVacancyId(idOf(sourcedResponse))).isEmpty();
    }

    @Test
    void aSupervisorWithoutAUniversityCannotProposeAnything() throws Exception {
        // There is no pipeline to put it in — refused rather than floating unscored.
        postExpecting(account("subsup", Role.SUPERVISOR, null, null),
                body("\"externalOrgName\":\"Kololo Labs\""), 403);
    }
}
