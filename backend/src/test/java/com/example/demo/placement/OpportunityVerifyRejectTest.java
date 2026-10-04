package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import com.example.demo.notification.NotificationRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S4.2 (opportunity plan §8.5): verify or reject through
 * {@code POST /api/opportunities/{id}/transition}.
 *
 * <p>The endpoint wires the S2.1 engine to HTTP, and this suite pins the three
 * things the plan names for the step plus the ordering the engine promises:
 *
 * <ul>
 *   <li><b>A verdict is never bare</b> (D7): rejecting or verifying without a
 *       note is a 400 and the row does not move — a moderation decision with no
 *       recorded reason is exactly the audit hole {@code verification_note}
 *       exists to close [H6].</li>
 *   <li><b>Only the super admin verifies</b>: a plain {@code ADMIN}, the owning
 *       company, a student and a field supervisor are all refused, by whichever
 *       of door/scope/role reaches them first — 403 for a role that can see the
 *       queue, 404 for a stranger probing ids.</li>
 *   <li><b>Nothing about the engine changes</b>: an illegal jump is still 409,
 *       an unknown status still 400, and every verdict writes exactly one
 *       history row and tells the submitter.</li>
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityVerifyRejectTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
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

    private UserEntity account(String prefix, Role role, Long companyId, Long universityId) {
        UserEntity user = new UserEntity(prefix + suffix(), "hash", role);
        user.setMustChangePassword(false);
        user.setCompanyId(companyId);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private UserEntity companyUser() {
        Company company = new Company();
        company.setName("Verdict Co " + suffix());
        long companyId = companyRepository.save(company).getId();
        return account("vdc", Role.COMPANY, companyId, null);
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    /** A minimal valid body; extras are raw JSON fragments. */
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

    /** A fresh company submission and its owner, both from the real endpoint. */
    private record Fixture(UserEntity owner, Vacancy advert) {
    }

    private Fixture pendingAdvert() throws Exception {
        UserEntity owner = companyUser();
        String response = mockMvc.perform(post("/api/opportunities").with(as(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(response, "$.id")).longValue();
        return new Fixture(owner, vacancyRepository.findById(id).orElseThrow());
    }

    private int transition(UserEntity actor, long id, String json) throws Exception {
        return mockMvc.perform(post("/api/opportunities/{id}/transition", id).with(as(actor))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse().getStatus();
    }

    private boolean notified(UserEntity recipient, String type) {
        return notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(recipient.getId()).stream()
                .anyMatch(n -> type.equals(n.getType()));
    }

    private List<OpportunityStatusHistory> history(long vacancyId) {
        return historyRepository.findByVacancyIdOrderByChangedAtAsc(vacancyId);
    }

    // --- 1. Verify: publish, record the verdict, tell the submitter --------

    @Test
    void verifyingAPendingAdvertPublishesItRecordsTheVerdictAndTellsTheSubmitter() throws Exception {
        Fixture fixture = pendingAdvert();
        UserEntity owner = fixture.owner();
        Vacancy advert = fixture.advert();

        // The plan's own spelling of the note key, not just the camelCase one.
        int status = transition(superAdmin(), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verification_note\":\"Evidence checked and legit\"}");

        assertThat(status).isEqualTo(200);
        Vacancy saved = vacancyRepository.findById(advert.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(Vacancy.Status.PUBLISHED);
        assertThat(saved.getVerificationStatus()).isEqualTo(Vacancy.VerificationStatus.VERIFIED);
        assertThat(saved.getVerifiedBy()).isEqualTo(superAdmin().getId());
        assertThat(saved.getVerifiedAt()).isNotNull();
        assertThat(saved.getVerificationNote()).isEqualTo("Evidence checked and legit");
        assertThat(saved.getReviewedAt()).isNotNull();

        assertThat(notified(owner, "OPPORTUNITY_VERIFIED")).isTrue();

        List<OpportunityStatusHistory> rows = history(advert.getId());
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getFromStatus()).isEqualTo("PENDING_REVIEW");
        assertThat(rows.get(0).getToStatus()).isEqualTo("PUBLISHED");
        assertThat(rows.get(0).getChangedBy()).isEqualTo(superAdmin().getId());

        // And it has left the S4.1 queue behind.
        String inbox = mockMvc.perform(get("/api/opportunities/inbox").with(as(superAdmin())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Integer> queued = JsonPath.read(inbox, "$[*].id");
        assertThat(queued).doesNotContain(advert.getId().intValue());
    }

    // --- 2. Reject: same paperwork, other verdict --------------------------

    @Test
    void rejectingAPendingAdvertRecordsTheRejectionAndTellsTheSubmitter() throws Exception {
        Fixture fixture = pendingAdvert();
        UserEntity owner = fixture.owner();
        Vacancy advert = fixture.advert();

        int status = transition(superAdmin(), advert.getId(),
                "{\"status\":\"REJECTED\",\"verificationNote\":\"No evidence behind this offer\"}");

        assertThat(status).isEqualTo(200);
        Vacancy saved = vacancyRepository.findById(advert.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(Vacancy.Status.REJECTED);
        assertThat(saved.getVerificationStatus()).isEqualTo(Vacancy.VerificationStatus.REJECTED);
        assertThat(saved.getVerifiedBy()).isEqualTo(superAdmin().getId());
        assertThat(saved.getVerificationNote()).isEqualTo("No evidence behind this offer");

        assertThat(notified(owner, "OPPORTUNITY_REJECTED")).isTrue();
        assertThat(history(advert.getId())).hasSize(1);
    }

    // --- 3. The note is not optional (D7) ---

    @Test
    void rejectingWithoutANoteIs400AndChangesNothing() throws Exception {
        Fixture fixture = pendingAdvert();
        UserEntity owner = fixture.owner();
        Vacancy advert = fixture.advert();

        int status = transition(superAdmin(), advert.getId(), "{\"status\":\"REJECTED\"}");

        assertThat(status).isEqualTo(400);
        Vacancy saved = vacancyRepository.findById(advert.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(Vacancy.Status.PENDING_REVIEW);
        assertThat(saved.getVerificationStatus()).isEqualTo(Vacancy.VerificationStatus.UNVERIFIED);
        assertThat(saved.getVerifiedBy()).isNull();
        assertThat(saved.getVerificationNote()).isNull();
        assertThat(history(advert.getId())).isEmpty();
        assertThat(notified(owner, "OPPORTUNITY_REJECTED")).isFalse();
    }

    @Test
    void verifyingWithoutANoteIs400() throws Exception {
        Vacancy advert = pendingAdvert().advert();

        int status = transition(superAdmin(), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verificationNote\":\"   \"}");

        assertThat(status).isEqualTo(400);
        assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PENDING_REVIEW);
    }

    // --- 4. Only the super admin verifies [H6] -----------------------------

    @Test
    void onlyASuperAdminCanVerify() throws Exception {
        Vacancy advert = pendingAdvert().advert();

        // A plain ADMIN passes the door, then the role check refuses [H6].
        assertThat(transition(account("vdam", Role.ADMIN, null, null), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verificationNote\":\"Looks fine to me\"}"))
                .isEqualTo(403);

        // The owning company is in scope — and still may not wave through its
        // own advert.
        assertThat(transition(account("vdc2", Role.COMPANY, advert.getCompanyId(), null), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verificationNote\":\"Trust us\"}"))
                .isEqualTo(403);

        assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PENDING_REVIEW);
    }

    @Test
    void aStrangerProbingIdsGets404Not403() throws Exception {
        Vacancy advert = pendingAdvert().advert();
        Company rivalCompany = new Company();
        rivalCompany.setName("Verdict Rival " + suffix());
        long rivalId = companyRepository.save(rivalCompany).getId();

        // Scope runs before role: out of scope never reveals the row exists [H9].
        assertThat(transition(account("vdriv", Role.COMPANY, rivalId, null), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verificationNote\":\"Not ours\"}"))
                .isEqualTo(404);
    }

    @Test
    void studentsAndFieldSupervisorsAreRefusedAtTheDoor() throws Exception {
        Vacancy advert = pendingAdvert().advert();

        assertThat(transition(account("vdst", Role.STUDENT, null, 777L), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verificationNote\":\"Why not\"}"))
                .isEqualTo(403);
        assertThat(transition(account("vdis", Role.INDUSTRIAL_SUPERVISOR, null, 777L), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verificationNote\":\"Why not\"}"))
                .isEqualTo(403);
    }

    @Test
    void anAnonymousCallerIsRefused() throws Exception {
        Vacancy advert = pendingAdvert().advert();

        mockMvc.perform(post("/api/opportunities/{id}/transition", advert.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\",\"verificationNote\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }

    // --- 5. The engine's other answers survive the wiring ------------------

    @Test
    void anUnknownOrMissingStatusIs400() throws Exception {
        Vacancy advert = pendingAdvert().advert();

        assertThat(transition(superAdmin(), advert.getId(),
                "{\"status\":\"GREENLIGHTED\",\"verificationNote\":\"x\"}")).isEqualTo(400);
        assertThat(transition(superAdmin(), advert.getId(),
                "{\"verificationNote\":\"x\"}")).isEqualTo(400);
    }

    @Test
    void anIllegalMoveIsStillA409ThroughTheEndpoint() throws Exception {
        Vacancy advert = pendingAdvert().advert();
        transition(superAdmin(), advert.getId(),
                "{\"status\":\"REJECTED\",\"verificationNote\":\"First verdict\"}");

        // A terminal state stays terminal, note or no note: the closed map
        // answers before request validation ever runs.
        assertThat(transition(superAdmin(), advert.getId(),
                "{\"status\":\"PUBLISHED\",\"verificationNote\":\"Changed our mind\"}"))
                .isEqualTo(409);
    }
}
