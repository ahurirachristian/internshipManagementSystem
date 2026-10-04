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
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S4.1 (opportunity plan §8.5): {@code GET /api/opportunities/inbox} —
 * the super-admin moderation queue.
 *
 * <p>The suite is anchored on R1's headline: <b>a student cannot see a
 * company's submission</b>. The test posts a real company advert through the
 * real endpoint, then walks the roster across the inbox door — student,
 * company, supervisor, plain admin — and each one is refused before a single
 * row could be read. The positive half proves the queue holds exactly the
 * {@code PENDING_REVIEW} + {@code UNVERIFIED} rows: born-published adverts
 * (the super admin's own sourced offers) and rows that already carry a verdict
 * never enter it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityInboxTest {

    private static final long UNI_A = 777L;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private VacancyRepository vacancyRepository;

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
        company.setName("Inbox Co " + suffix());
        long companyId = companyRepository.save(company).getId();
        return account("inbco", Role.COMPANY, companyId, null);
    }

    private UserEntity supervisor() {
        return account("inbsup", Role.SUPERVISOR, null, UNI_A);
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    /** A minimal valid body; extras are raw JSON fragments such as "\\"slots\\": 3". */
    private String body(String... extras) {
        StringBuilder json = new StringBuilder(
                "{\"title\":\"Awaiting the verdict\","
                        + "\"description\":\"A real role a student can be onboarded into\","
                        + "\"deadline\":\"2026-12-31\"");
        for (String extra : extras) {
            json.append(',').append(extra);
        }
        return json.append('}').toString();
    }

    private long submit(UserEntity actor, String json) throws Exception {
        String response = mockMvc.perform(post("/api/opportunities").with(as(actor))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    private String inbox(UserEntity actor) throws Exception {
        return mockMvc.perform(get("/api/opportunities/inbox").with(as(actor)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private List<Long> inboxIds(UserEntity actor) throws Exception {
        List<Integer> ids = JsonPath.read(inbox(actor), "$[*].id");
        return ids.stream().map(Integer::longValue).toList();
    }

    /** A row outside the queue predicate — verdict recorded, review not pending. */
    private long advert(String title, Vacancy.Status status, Vacancy.VerificationStatus verification) {
        Vacancy advert = new Vacancy(title, "A role that is not waiting for anyone",
                null, "Kampala", "None", status.name(), LocalDate.now().plusDays(30), LocalDate.now());
        advert.setVerificationStatus(verification);
        return vacancyRepository.save(advert).getId();
    }

    // --- 1. The super admin reads the queue ---

    @Test
    void superAdminSeesEveryAdvertAwaitingAVerdict() throws Exception {
        long companyAdvert = submit(companyUser(), body());
        long supervisorProposal = submit(supervisor(),
                body("\"externalOrgName\":\"Proposed Ltd\""));

        List<Long> ids = inboxIds(superAdmin());

        assertThat(ids).contains(companyAdvert, supervisorProposal);
        String body = inbox(superAdmin());
        assertThat(body).contains("Awaiting the verdict");
    }

    @Test
    void bornPublishedAndAlreadyJudgedAdvertsNeverEnterTheQueue() throws Exception {
        // The super admin's own sourced offer — published and verified in one move.
        long sourced = submit(superAdmin(),
                body("\"externalOrgName\":\"Global Fintech Ltd\"",
                        "\"sourceKind\":\"EXTERNAL_OFFER\"",
                        "\"sourceReference\":\"https://example.org/careers/7\""));
        long rejected = advert("Already rejected", Vacancy.Status.REJECTED, Vacancy.VerificationStatus.UNVERIFIED);
        long publishedUnverified = advert("Published but unverified", Vacancy.Status.PUBLISHED,
                Vacancy.VerificationStatus.UNVERIFIED);
        long pendingButVerified = advert("Pending yet verified", Vacancy.Status.PENDING_REVIEW,
                Vacancy.VerificationStatus.VERIFIED);
        long stillWaiting = advert("Genuinely waiting", Vacancy.Status.PENDING_REVIEW,
                Vacancy.VerificationStatus.UNVERIFIED);

        List<Long> ids = inboxIds(superAdmin());

        assertThat(ids).doesNotContain(sourced, rejected, publishedUnverified, pendingButVerified);
        assertThat(ids).contains(stillWaiting);
    }

    // --- 2. R1's headline: nobody else gets near the queue ---

    @Test
    void aStudentCannotReadACompanysSubmission() throws Exception {
        // A real company submission sits in the queue when the student asks.
        long companyAdvert = submit(companyUser(), body());
        UserEntity student = account("inbstd", Role.STUDENT, null, UNI_A);

        mockMvc.perform(get("/api/opportunities/inbox").with(as(student)))
                .andExpect(status().isForbidden());

        // Belt and braces: even if the door opened, the rows must not leak.
        assertThat(inboxIds(superAdmin())).contains(companyAdvert);
    }

    @Test
    void aCompanyCannotReadTheInbox() throws Exception {
        submit(companyUser(), body());

        mockMvc.perform(get("/api/opportunities/inbox").with(as(companyUser())))
                .andExpect(status().isForbidden());
    }

    @Test
    void aSupervisorCannotReadTheInbox() throws Exception {
        submit(companyUser(), body());

        mockMvc.perform(get("/api/opportunities/inbox").with(as(supervisor())))
                .andExpect(status().isForbidden());
    }

    @Test
    void aPlainAdminWithoutTheSuperAdminFlagIsNotAModerator() throws Exception {
        submit(companyUser(), body());
        UserEntity plainAdmin = account("inbadm", Role.ADMIN, null, null);

        // Passes the ADMIN authority gate, then is refused by the service [H6].
        mockMvc.perform(get("/api/opportunities/inbox").with(as(plainAdmin)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousIsRefused() throws Exception {
        mockMvc.perform(get("/api/opportunities/inbox"))
                .andExpect(status().isUnauthorized());
    }
}
