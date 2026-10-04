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
 * Step S5.2 (opportunity plan §8.6): {@code GET /api/opportunities/offers} and
 * {@code POST /{id}/offers/{offerId}/respond} — the university half of the
 * offer hop (R3's answer).
 *
 * <p>Two requirements anchor the suite. <b>[H9]: a supervisor of another
 * university gets 404, not 403</b> — an offer id must not become a probing
 * oracle for where adverts are being offered — and <b>an offer cannot be
 * answered twice</b>, which is the closed map's 409 rather than a silent
 * overwrite of the first verdict. The path's advert id is checked as an
 * anchor too: replaying an offer id under another advert's path is a 404.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityOfferRespondTest {

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
        return universityRepository.save(new University(("RSP" + tag).substring(0, 15),
                "Respond Test University " + tag)).getId();
    }

    private long advert() {
        return vacancyRepository.save(new Vacancy("Responded role " + suffix(),
                "A real role a student can be onboarded into", null, "Kampala", "None",
                Vacancy.Status.PUBLISHED.name(), LocalDate.now().plusDays(30), LocalDate.now()))
                .getId();
    }

    /** An offer planted directly — S5.2 is about answering, not about creating. */
    private long offer(long advertId, long universityId, OpportunityOffer.Status status) {
        OpportunityOffer row = new OpportunityOffer();
        row.setVacancyId(advertId);
        row.setUniversityId(universityId);
        row.setOfferedBy(superAdmin().getId());
        row.setStatus(status);
        return offerRepository.save(row).getId();
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    private String respond(UserEntity actor, long advertId, long offerId, String json)
            throws Exception {
        return mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(actor))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse().getContentAsString();
    }

    private OpportunityOffer row(long offerId) {
        return offerRepository.findById(offerId).orElseThrow();
    }

    private List<String> noticeTypes(UserEntity recipient) {
        return notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(
                        recipient.getId()).stream()
                .map(Notification::getType).toList();
    }

    // --- 1. GET /offers: my university's offers only, forced from session ---

    @Test
    void aSupervisorSeesOnlyTheirOwnUniversitysOffers() throws Exception {
        long uniA = university();
        long uniB = university();
        long advertId = advert();
        long mine = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);
        long theirs = offer(advertId, uniB, OpportunityOffer.Status.OFFERED);
        UserEntity supervisorA = account("rsup", Role.SUPERVISOR, uniA);

        String body = mockMvc.perform(get("/api/opportunities/offers").with(as(supervisorA)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> ids = JsonPath.read(body, "$[*].id");
        assertThat(ids).hasSize(1);
        assertThat(((Number) ids.get(0)).longValue()).isEqualTo(mine);
        // The rival's row never leaves the server for this caller [H9].
        assertThat(ids).extracting(Integer::longValue).doesNotContain(theirs);
    }

    @Test
    void theOffersListShowsEachOfferOwnStatusAndProvenance() throws Exception {
        long uniA = university();
        long advertId = advert();
        long offered = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);

        String body = mockMvc.perform(get("/api/opportunities/offers").with(as(supervisor)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("OFFERED");
        assertThat(body).contains(String.valueOf(advertId));
        List<Integer> ids = JsonPath.read(body, "$[*].id");
        assertThat(((Number) ids.get(0)).longValue()).isEqualTo(offered);
    }

    @Test
    void studentsCompaniesAndAnonymousCannotReadAnyOfferList() throws Exception {
        UserEntity student = account("rsup", Role.STUDENT, university());
        UserEntity company = account("rsup", Role.COMPANY, null);

        mockMvc.perform(get("/api/opportunities/offers").with(as(student)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities/offers").with(as(company)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/opportunities/offers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aSupervisorWithoutAUniversityHasNoOffersToRead() throws Exception {
        UserEntity floating = account("rsup", Role.SUPERVISOR, null);

        mockMvc.perform(get("/api/opportunities/offers").with(as(floating)))
                .andExpect(status().isForbidden());
    }

    // --- 2. respond: ACCEPTED / DECLINED record the answer ---

    @Test
    void acceptingAnOfferRecordsTheAnswerAndNotifiesTheSuperAdmins() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        String response = respond(supervisor, advertId, offerId,
                "{\"decision\":\"ACCEPTED\",\"note\":\"We will share it with ICT year 3\"}");

        assertThat(response).contains("ACCEPTED");
        OpportunityOffer saved = row(offerId);
        assertThat(saved.getStatus()).isEqualTo(OpportunityOffer.Status.ACCEPTED);
        assertThat(saved.getRespondedBy()).isEqualTo(supervisor.getId());
        assertThat(saved.getRespondedAt()).isNotNull();
        assertThat(saved.getResponseNote()).isEqualTo("We will share it with ICT year 3");

        // The relay trail for this offer...
        List<OpportunityStatusHistory> trail = historyRepository
                .findByVacancyIdAndUniversityIdOrderByChangedAtAsc(advertId, uniA);
        assertThat(trail).hasSize(1);
        assertThat(trail.get(0).getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_OFFER);
        assertThat(trail.get(0).getFromStatus()).isEqualTo("OFFERED");
        assertThat(trail.get(0).getToStatus()).isEqualTo("ACCEPTED");
        // ...and the §9 notice to the super admins who offered it (counted by
        // type: the seeded account carries unrelated notices too).
        assertThat(noticeTypes(superAdmin())).contains("OPPORTUNITY_OFFER_ANSWERED");
        assertThat(noticeTypes(superAdmin()))
                .filteredOn("OPPORTUNITY_OFFER_ANSWERED"::equals).hasSize(1);
    }

    @Test
    void decliningAnOfferRecordsTheSameShapeWithoutAcceptance() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        respond(supervisor, advertId, offerId, "{\"decision\":\"DECLINED\"}");

        OpportunityOffer saved = row(offerId);
        assertThat(saved.getStatus()).isEqualTo(OpportunityOffer.Status.DECLINED);
        assertThat(saved.getRespondedBy()).isEqualTo(supervisor.getId());
        assertThat(saved.getResponseNote()).isNull();
    }

    @Test
    void aResponseNoteIsOptionalButCapped() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\",\"note\":\""
                                + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());

        // Refused before the row was touched: still answerable afterwards.
        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.OFFERED);

        respond(supervisor, advertId, offerId, "{\"decision\":\"ACCEPTED\"}");
        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.ACCEPTED);
    }

    // --- 3. The doors: SUPERVISOR only, anonymous out ---

    @Test
    void onlyASupervisorMayAnswerAnOffer() throws Exception {
        long uniA = university();
        UserEntity student = account("rsup", Role.STUDENT, uniA);
        UserEntity plainAdmin = account("rsup", Role.ADMIN, null);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        for (UserEntity actor : List.of(student, plainAdmin, superAdmin())) {
            mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                            + "/respond").with(as(actor))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"decision\":\"ACCEPTED\"}"))
                    .andExpect(status().isForbidden());
        }
        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.OFFERED);
    }

    @Test
    void aMissingDecisionAndAnUnknownDecisionAreBoth400() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"no verb\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"SHARED\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"BANANA\"}"))
                .andExpect(status().isBadRequest());

        // A refused verb never half-answers the offer.
        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.OFFERED);
    }

    // --- 4. [H9]: another university's offer id does not exist ---

    @Test
    void aSupervisorOfAnotherUniversityGets404Not403() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity foreign = account("rsup", Role.SUPERVISOR, uniB);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(foreign))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\"}"))
                .andExpect(status().isNotFound());

        // Not answered by the stranger, and the path never leaked a 403 either.
        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.OFFERED);
    }

    @Test
    void theForeignSupervisorsOwnListNeverContainsTheOffer() throws Exception {
        long uniA = university();
        long uniB = university();
        UserEntity foreign = account("rsup", Role.SUPERVISOR, uniB);
        long advertId = advert();
        offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        String body = mockMvc.perform(get("/api/opportunities/offers").with(as(foreign)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).isEqualTo("[]");
    }

    // --- 5. An offer is anchored to the advert in its path ---

    @Test
    void anOfferIdReplayedUnderAnotherAdvertsPathIsA404() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long realAdvert = advert();
        long otherAdvert = advert();
        long offerId = offer(realAdvert, uniA, OpportunityOffer.Status.OFFERED);

        mockMvc.perform(post("/api/opportunities/" + otherAdvert + "/offers/" + offerId
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\"}"))
                .andExpect(status().isNotFound());

        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.OFFERED);
    }

    @Test
    void aMissingOfferIsA404() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long advertId = advert();

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/999999999"
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\"}"))
                .andExpect(status().isNotFound());
    }

    // --- 6. Cannot answer twice, and cannot revive a declined offer ---

    @Test
    void anOfferCannotBeAnsweredTwice() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.OFFERED);

        respond(supervisor, advertId, offerId, "{\"decision\":\"ACCEPTED\"}");
        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"DECLINED\"}"))
                .andExpect(status().isConflict());

        // The first answer stands — no silent overwrite of a decision.
        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.ACCEPTED);
        List<OpportunityStatusHistory> trail = historyRepository
                .findByVacancyIdAndUniversityIdOrderByChangedAtAsc(advertId, uniA);
        assertThat(trail).hasSize(1);
    }

    @Test
    void aDeclinedOfferIsTerminal() throws Exception {
        long uniA = university();
        UserEntity supervisor = account("rsup", Role.SUPERVISOR, uniA);
        long advertId = advert();
        long offerId = offer(advertId, uniA, OpportunityOffer.Status.DECLINED);

        mockMvc.perform(post("/api/opportunities/" + advertId + "/offers/" + offerId
                        + "/respond").with(as(supervisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\"}"))
                .andExpect(status().isConflict());

        assertThat(row(offerId).getStatus()).isEqualTo(OpportunityOffer.Status.DECLINED);
    }
}
