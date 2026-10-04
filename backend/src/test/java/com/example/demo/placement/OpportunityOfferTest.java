package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
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

import com.example.demo.audit.AuditLog;
import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.notification.Notification;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S5.1 (opportunity plan §8.6): {@code POST /api/opportunities/{id}/offers}
 * — the super-admin broadcast of a published advert to chosen universities (R3).
 *
 * <p>The suite is built around the four questions the plan's Tests column names
 * — super admin only [H6], unknown university → 400, re-offer → 409, and a
 * non-{@code PUBLISHED} advert → 409 — plus the two side effects that make the
 * offer real rather than a row: the §9 notification to each offered
 * university's own supervisors, and the §5.10 history row that shows where the
 * relay began.
 *
 * <p>The atomicity pin matters as much as the codes: a batch naming one good
 * and one unknown university must leave <b>zero</b> offers behind, or a later
 * retry would 409 on the half that landed and the super admin could never
 * finish the broadcast.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityOfferTest {

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
    private OpportunityStatusHistoryRepository historyRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;

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

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    /** A real university row — the batch validator must find every id here. */
    private long university() {
        String tag = suffix();
        University university = new University(("OFF" + tag).substring(0, 15),
                "Offer Test University " + tag);
        return universityRepository.save(university).getId();
    }

    private long advert(Vacancy.Status status) {
        Vacancy advert = new Vacancy("Broadcast role " + suffix(),
                "A real role a student can be onboarded into", null, "Kampala", "None",
                status.name(), LocalDate.now().plusDays(30), LocalDate.now());
        advert.setVerificationStatus(status == Vacancy.Status.PUBLISHED
                ? Vacancy.VerificationStatus.VERIFIED
                : Vacancy.VerificationStatus.UNVERIFIED);
        return vacancyRepository.save(advert).getId();
    }

    private String body(long... universityIds) {
        StringBuilder json = new StringBuilder("{\"universityIds\":[");
        for (int i = 0; i < universityIds.length; i++) {
            if (i > 0) {
                json.append(',');
            }
            json.append(universityIds[i]);
        }
        return json.append("]}").toString();
    }

    private String offer(UserEntity actor, long advertId, String json) throws Exception {
        return mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(actor))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse().getContentAsString();
    }

    private List<Long> offersFor(long advertId) {
        return offerRepository.findByVacancyId(advertId).stream()
                .map(OpportunityOffer::getUniversityId).toList();
    }

    // --- 1. The super admin broadcasts ---

    @Test
    void superAdminOffersAPublishedAdvertToTheChosenUniversities() throws Exception {
        long uniA = university();
        long uniB = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(uniA, uniB)))
                .andExpect(status().isCreated());

        List<OpportunityOffer> created = offerRepository.findByVacancyId(advertId);
        assertThat(created).hasSize(2);
        assertThat(created).extracting(OpportunityOffer::getUniversityId)
                .containsExactlyInAnyOrder(uniA, uniB);
        assertThat(created).allSatisfy(offer -> {
            assertThat(offer.getStatus()).isEqualTo(OpportunityOffer.Status.OFFERED);
            assertThat(offer.getOfferedBy()).isEqualTo(superAdmin().getId());
            assertThat(offer.getOfferedAt()).isNotNull();
            assertThat(offer.getRespondedAt()).isNull();
        });
    }

    @Test
    void theOfferNoteIsCarriedToTheRow() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        String response = offer(superAdmin(), advertId,
                "{\"universityIds\":[\"" + uniA + "\"],\"note\":\"Best fit for the ICT cohort\"}");

        assertThat(response).contains("Best fit for the ICT cohort");
        List<OpportunityOffer> created = offerRepository.findByVacancyId(advertId);
        assertThat(created).hasSize(1);
        assertThat(created.get(0).getNote()).isEqualTo("Best fit for the ICT cohort");
    }

    @Test
    void everyOfferWritesTheRelayHistoryRowAndOneAuditRow() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        offer(superAdmin(), advertId, body(uniA));

        List<OpportunityStatusHistory> history = historyRepository.findByVacancyIdOrderByChangedAtAsc(advertId);
        assertThat(history).hasSize(1);
        assertThat(history.get(0).getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_OFFER);
        assertThat(history.get(0).getUniversityId()).isEqualTo(uniA);
        // from is null — the relay has no predecessor (§5.10).
        assertThat(history.get(0).getFromStatus()).isNull();
        assertThat(history.get(0).getToStatus()).isEqualTo("OFFERED");
        assertThat(history.get(0).getChangedBy()).isEqualTo(superAdmin().getId());

        List<AuditLog> audits = auditLogRepository.findByActionAndTargetEntity(
                "OPPORTUNITY_OFFERED", "OpportunityOffer");
        assertThat(audits).hasSize(1);
    }

    // --- 2. Recipients come from the server, not the body (L15) ---

    @Test
    void eachOfferedUniversitysOwnSupervisorsAreNotifiedAndNobodyElse() throws Exception {
        long uniA = university();
        long uniB = university();
        long uniC = university();
        UserEntity supervisorA = account("ofsup", Role.SUPERVISOR, uniA);
        UserEntity supervisorB = account("ofsup", Role.SUPERVISOR, uniB);
        UserEntity supervisorC = account("ofsup", Role.SUPERVISOR, uniC);
        long advertId = advert(Vacancy.Status.PUBLISHED);

        offer(superAdmin(), advertId, body(uniA, uniB));

        assertThat(noticeTypes(supervisorA)).containsExactly("OPPORTUNITY_OFFERED");
        assertThat(noticeTypes(supervisorB)).containsExactly("OPPORTUNITY_OFFERED");
        // A university nobody offered hears nothing — the broadcast is selective (R3).
        assertThat(noticeTypes(supervisorC)).isEmpty();
    }

    private List<String> noticeTypes(UserEntity recipient) {
        return notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(
                        recipient.getId()).stream()
                .map(Notification::getType).toList();
    }

    // --- 3. R3's door: super admin only [H6] ---

    @Test
    void aPlainAdminWithoutTheSuperAdminFlagCannotOffer() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);
        UserEntity plainAdmin = account("ofadm", Role.ADMIN, null);

        // Passes the ADMIN authority gate, then is refused by the service [H6].
        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(plainAdmin))
                        .contentType(MediaType.APPLICATION_JSON).content(body(uniA)))
                .andExpect(status().isForbidden());

        assertThat(offersFor(advertId)).isEmpty();
    }

    @Test
    void studentsCompaniesAndSupervisorsAreRefusedAtTheDoor() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        for (Role role : List.of(Role.STUDENT, Role.COMPANY, Role.SUPERVISOR)) {
            mockMvc.perform(post("/api/opportunities/" + advertId + "/offers")
                            .with(as(account("ofdoor", role, uniA)))
                            .contentType(MediaType.APPLICATION_JSON).content(body(uniA)))
                    .andExpect(status().isForbidden());
        }

        assertThat(offersFor(advertId)).isEmpty();
    }

    @Test
    void anonymousIsRefused() throws Exception {
        mockMvc.perform(post("/api/opportunities/" + advert(Vacancy.Status.PUBLISHED) + "/offers")
                        .contentType(MediaType.APPLICATION_JSON).content(body(1L)))
                .andExpect(status().isUnauthorized());
    }

    // --- 4. The body is validated before anything is written ---

    @Test
    void anUnknownUniversityRejectsTheWholeBatch() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);
        long unknown = 999_999_999L;

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body(uniA, unknown)))
                .andExpect(status().isBadRequest());

        // Atomicity: the good id in the batch must not survive the bad one, or a
        // retry would 409 and the broadcast could never be finished.
        assertThat(offersFor(advertId)).isEmpty();
        assertThat(historyRepository.findByVacancyIdOrderByChangedAtAsc(advertId)).isEmpty();
    }

    @Test
    void anEmptyUniversityListIsRejected() throws Exception {
        long advertId = advert(Vacancy.Status.PUBLISHED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"universityIds\":[]}"))
                .andExpect(status().isBadRequest());

        assertThat(offersFor(advertId)).isEmpty();
    }

    @Test
    void anOverlongOfferNoteIsRejected() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universityIds\":[\"" + uniA + "\"],\"note\":\""
                                + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());

        assertThat(offersFor(advertId)).isEmpty();
    }

    // --- 5. Re-offer and the wrong advert state are conflicts, not creations ---

    @Test
    void offeringTheSameUniversityTwiceIsAConflict() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body(uniA)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body(uniA)))
                .andExpect(status().isConflict());

        // One row, not a duplicate two inboxes would both act on.
        assertThat(offersFor(advertId)).containsExactly(uniA);
    }

    @Test
    void anAdvertThatIsNotPublishedCannotBeOffered() throws Exception {
        long uniA = university();
        long pendingId = advert(Vacancy.Status.PENDING_REVIEW);

        mockMvc.perform(post("/api/opportunities/" + pendingId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body(uniA)))
                .andExpect(status().isConflict());

        assertThat(offersFor(pendingId)).isEmpty();
    }

    @Test
    void aWithdrawnAdvertCannotBeOfferedEither() throws Exception {
        long uniA = university();
        long withdrawnId = advert(Vacancy.Status.WITHDRAWN);

        mockMvc.perform(post("/api/opportunities/" + withdrawnId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body(uniA)))
                .andExpect(status().isConflict());

        assertThat(offersFor(withdrawnId)).isEmpty();
    }

    // --- 6. A missing advert is 404, and the super admin's own empty batch is safe ---

    @Test
    void aMissingAdvertIsA404() throws Exception {
        mockMvc.perform(post("/api/opportunities/999999999/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body(1L)))
                .andExpect(status().isNotFound());
    }

    @Test
    void offeringOneUniversityTwiceInASingleBatchCreatesOneOffer() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body(uniA, uniA)))
                .andExpect(status().isCreated());

        assertThat(offersFor(advertId)).containsExactly(uniA);
    }

    /** Guards the JSON shape the endpoint actually binds ({@code universityIds} array). */
    @Test
    void aBodyWithoutUniversityIdsIsRejected() throws Exception {
        long advertId = advert(Vacancy.Status.PUBLISHED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers").with(as(superAdmin()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"no targets\"}"))
                .andExpect(status().isBadRequest());

        assertThat(offersFor(advertId)).isEmpty();
    }

    /** Sanity: the response body is the created list, not a bare 201 with no payload. */
    @Test
    void theResponseEchoesTheCreatedOffers() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Status.PUBLISHED);

        String response = offer(superAdmin(), advertId, body(uniA));

        List<Integer> ids = JsonPath.read(response, "$[*].universityId");
        assertThat(ids).hasSize(1);
        assertThat(((Number) ids.get(0)).longValue()).isEqualTo(uniA);
    }
}
