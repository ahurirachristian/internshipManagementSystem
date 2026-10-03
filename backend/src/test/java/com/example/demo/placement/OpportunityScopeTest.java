package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.placement.OpportunityAudienceResolver.Capacity;

/**
 * Step S2.3 (opportunity plan §8.3) — <b>the security matrix</b>: every origin ×
 * every actor, in one table, plus the loophole pins H1–H4 and H9.
 *
 * <p>The central table is deliberately written out as data, one expected capacity
 * per (origin, actor) pair, so a reviewer can read the entire audience policy in
 * one screen and a future change to one predicate cannot quietly rewrite a pair
 * nobody was looking at. The state-dependent rules — closed shares, withdrawn
 * adverts, unmoderated submissions — are separate tests because they cut across
 * origins rather than forming a row of the table.
 *
 * <p>Everything here pins <i>visibility</i>. Authority to act on what you can see
 * is the transition engine's stricter, separate question (S2.1), and the pairing
 * of the two suites is the point: seeing must never imply acting.
 */
@SpringBootTest
@Transactional
class OpportunityScopeTest {

    private static final long COMPANY_OWN = 42L;
    private static final long COMPANY_RIVAL = 43L;
    private static final long UNI_A = 777L;
    private static final long UNI_B = 888L;

    @Autowired
    private OpportunityAudienceResolver resolver;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
    @Autowired
    private OpportunityOfferRepository offerRepository;
    @Autowired
    private OpportunityShareRepository shareRepository;
    @Autowired
    private OpportunitySubmissionRepository submissionRepository;

    // --- Fixtures ---

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private UserEntity superAdmin() {
        return userRepository.findByUsername("admin").orElseThrow();
    }

    private UserEntity plainAdmin() {
        return account("scadmin", Role.ADMIN, null, null);
    }

    private UserEntity account(String prefix, Role role, Long companyId, Long universityId) {
        UserEntity user = new UserEntity(prefix + suffix(), "hash", role);
        user.setMustChangePassword(false);
        user.setCompanyId(companyId);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private Vacancy advert(Vacancy.Origin origin, Long companyId, Vacancy.Status status) {
        Vacancy advert = new Vacancy("Scope role " + suffix(),
                "A description of the role", companyId, "Kampala", "Some requirements",
                status.name(), LocalDate.now().plusMonths(2), LocalDate.now());
        if (origin != null) {
            advert.setOrigin(origin);
        }
        return vacancyRepository.save(advert);
    }

    private Vacancy withOrigin(Vacancy base, Vacancy.Origin origin) {
        base.setOrigin(origin);
        return vacancyRepository.save(base);
    }

    private void shareLink(Long vacancyId, long universityId, OpportunityShare.Status status) {
        OpportunityShare row = new OpportunityShare();
        row.setVacancyId(vacancyId);
        row.setUniversityId(universityId);
        row.setSharedBy(account("scsh", Role.SUPERVISOR, null, universityId).getId());
        row.setStatus(status);
        shareRepository.save(row);
    }

    private void submissionLink(Long vacancyId, long universityId) {
        OpportunitySubmission row = new OpportunitySubmission();
        row.setVacancyId(vacancyId);
        row.setUniversityId(universityId);
        row.setSubmittedBy(account("scsub", Role.SUPERVISOR, null, universityId).getId());
        submissionRepository.save(row);
    }

    private void offerLink(Long vacancyId, long universityId) {
        OpportunityOffer row = new OpportunityOffer();
        row.setVacancyId(vacancyId);
        row.setUniversityId(universityId);
        row.setOfferedBy(superAdmin().getId());
        row.setStatus(OpportunityOffer.Status.OFFERED);
        offerRepository.save(row);
    }

    // --- 1. The whole policy in one table ----------------------------------

    @Test
    void everyOriginByEveryActorHasExactlyTheCapacityThePolicyDeclares() {
        // The four origins of §1.1 (the fifth row of that table, "shared by", is
        // a state of these, covered by the state tests below).
        Map<String, Vacancy> origins = new LinkedHashMap<>();
        origins.put("COMPANY", advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.PUBLISHED));
        origins.put("SUPER_ADMIN", withOrigin(advert(null, null, Vacancy.Status.PUBLISHED),
                Vacancy.Origin.SUPER_ADMIN));
        origins.put("UNIVERSITY", universitySourcedAtUniA());
        origins.put("SUPERVISOR", supervisorSubmittedAtUniA());

        Map<String, UserEntity> actors = new LinkedHashMap<>();
        actors.put("superAdmin", superAdmin());
        actors.put("admin", plainAdmin());
        actors.put("companyOwn", account("scco", Role.COMPANY, COMPANY_OWN, null));
        actors.put("companyRival", account("scco", Role.COMPANY, COMPANY_RIVAL, null));
        actors.put("fieldOwnCompany", account("scind", Role.INDUSTRIAL_SUPERVISOR, COMPANY_OWN, null));
        actors.put("supervisorLinked", account("scsup", Role.SUPERVISOR, null, UNI_A));
        actors.put("supervisorForeign", account("scsup", Role.SUPERVISOR, null, UNI_B));
        actors.put("studentA", account("scstd", Role.STUDENT, null, UNI_A));
        actors.put("studentB", account("scstd", Role.STUDENT, null, UNI_B));

        Map<String, Capacity> expected = Map.ofEntries(
                // origin           actor               capacity
                e("COMPANY", "superAdmin", Capacity.MODERATOR),
                e("COMPANY", "admin", Capacity.MODERATOR),
                e("COMPANY", "companyOwn", Capacity.ORIGINATOR),
                e("COMPANY", "companyRival", Capacity.NONE),          // H1
                e("COMPANY", "fieldOwnCompany", Capacity.ORIGINATOR),
                e("COMPANY", "supervisorLinked", Capacity.NONE),      // no link, no audience
                e("COMPANY", "supervisorForeign", Capacity.NONE),
                e("COMPANY", "studentA", Capacity.NONE),
                e("COMPANY", "studentB", Capacity.NONE),              // H3: nothing guessed into being

                e("SUPER_ADMIN", "superAdmin", Capacity.MODERATOR),
                e("SUPER_ADMIN", "admin", Capacity.MODERATOR),
                e("SUPER_ADMIN", "companyOwn", Capacity.NONE),        // R2's sourced offer belongs to no company
                e("SUPER_ADMIN", "companyRival", Capacity.NONE),
                e("SUPER_ADMIN", "fieldOwnCompany", Capacity.NONE),
                e("SUPER_ADMIN", "supervisorLinked", Capacity.NONE),  // until it is offered
                e("SUPER_ADMIN", "supervisorForeign", Capacity.NONE),
                e("SUPER_ADMIN", "studentA", Capacity.NONE),
                e("SUPER_ADMIN", "studentB", Capacity.NONE),

                e("UNIVERSITY", "superAdmin", Capacity.MODERATOR),
                e("UNIVERSITY", "admin", Capacity.MODERATOR),
                e("UNIVERSITY", "companyOwn", Capacity.NONE),
                e("UNIVERSITY", "companyRival", Capacity.NONE),
                e("UNIVERSITY", "fieldOwnCompany", Capacity.NONE),
                e("UNIVERSITY", "supervisorLinked", Capacity.UNIVERSITY),
                e("UNIVERSITY", "supervisorForeign", Capacity.NONE),  // H9
                e("UNIVERSITY", "studentA", Capacity.STUDENT),        // R5: sourced here, shared here
                e("UNIVERSITY", "studentB", Capacity.NONE),           // H2: another university's student

                e("SUPERVISOR", "superAdmin", Capacity.MODERATOR),
                e("SUPERVISOR", "admin", Capacity.MODERATOR),
                e("SUPERVISOR", "companyOwn", Capacity.NONE),
                e("SUPERVISOR", "companyRival", Capacity.NONE),
                e("SUPERVISOR", "fieldOwnCompany", Capacity.NONE),
                e("SUPERVISOR", "supervisorLinked", Capacity.UNIVERSITY),
                e("SUPERVISOR", "supervisorForeign", Capacity.NONE),  // H9
                e("SUPERVISOR", "studentA", Capacity.NONE),           // a submission is not a share
                e("SUPERVISOR", "studentB", Capacity.NONE));

        for (Map.Entry<String, Vacancy> origin : origins.entrySet()) {
            for (Map.Entry<String, UserEntity> actor : actors.entrySet()) {
                String pair = origin.getKey() + " x " + actor.getKey();
                Capacity actual = resolver.capacityOf(actor.getValue(), origin.getValue());
                assertThat(actual).as(pair).isEqualTo(expected.get(pair));
                assertThat(resolver.canSee(actor.getValue(), origin.getValue()))
                        .as("canSee agrees with capacity for " + pair)
                        .isEqualTo(actual != Capacity.NONE);
            }
        }
    }

    private Map.Entry<String, Capacity> e(String origin, String actor, Capacity capacity) {
        return Map.entry(origin + " x " + actor, capacity);
    }

    private Vacancy universitySourcedAtUniA() {
        Vacancy advert = withOrigin(advert(null, null, Vacancy.Status.PUBLISHED),
                Vacancy.Origin.UNIVERSITY);
        shareLink(advert.getId(), UNI_A, OpportunityShare.Status.SHARED);
        return advert;
    }

    private Vacancy supervisorSubmittedAtUniA() {
        Vacancy advert = withOrigin(advert(null, null, Vacancy.Status.PENDING_REVIEW),
                Vacancy.Origin.SUPERVISOR);
        submissionLink(advert.getId(), UNI_A);
        return advert;
    }

    // --- 2. The state rules the table cannot express -----------------------

    @Test
    void aStudentNeverSeesAClosedOrWithdrawnAdvertEvenWithALiveShare() {
        UserEntity student = account("scstd", Role.STUDENT, null, UNI_A);

        Vacancy closed = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.CLOSED);
        shareLink(closed.getId(), UNI_A, OpportunityShare.Status.SHARED);
        assertThat(resolver.capacityOf(student, closed)).isEqualTo(Capacity.NONE);

        Vacancy withdrawn = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.WITHDRAWN);
        shareLink(withdrawn.getId(), UNI_A, OpportunityShare.Status.SHARED);
        assertThat(resolver.capacityOf(student, withdrawn)).isEqualTo(Capacity.NONE);

        // H4's other half: the share itself was called off.
        Vacancy stillLive = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.PUBLISHED);
        shareLink(stillLive.getId(), UNI_A, OpportunityShare.Status.CLOSED);
        assertThat(resolver.capacityOf(student, stillLive)).isEqualTo(Capacity.NONE);
    }

    @Test
    void aStudentNeverSeesAnUnmoderatedSubmission() {
        // R1 before sharing: PENDING_REVIEW company adverts reach no student, even
        // at a university that has every reason to be looking.
        UserEntity student = account("scstd", Role.STUDENT, null, UNI_A);
        Vacancy pending = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.PENDING_REVIEW);

        assertThat(resolver.capacityOf(student, pending)).isEqualTo(Capacity.NONE);
    }

    @Test
    void aUniversitySeesAnAdvertItWasOfferedAndNothingElse() {
        // S5.2/S6.1 read path: being offered something is a link (capacity exists),
        // and an offer to one university is not an offer to another [H9].
        Vacancy advert = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.PUBLISHED);
        offerLink(advert.getId(), UNI_A);
        UserEntity linked = account("scsup", Role.SUPERVISOR, null, UNI_A);
        UserEntity foreign = account("scsup", Role.SUPERVISOR, null, UNI_B);

        assertThat(resolver.capacityOf(linked, advert)).isEqualTo(Capacity.UNIVERSITY);
        assertThat(resolver.capacityOf(foreign, advert)).isEqualTo(Capacity.NONE);
    }

    @Test
    void aCompanyAdvertRelayedToAUniversityIsVisibleToThatUniversityOnly() {
        Vacancy advert = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.PUBLISHED);
        shareLink(advert.getId(), UNI_A, OpportunityShare.Status.SHARED);
        UserEntity linked = account("scsup", Role.SUPERVISOR, null, UNI_A);
        UserEntity foreign = account("scsup", Role.SUPERVISOR, null, UNI_B);
        UserEntity rival = account("scco", Role.COMPANY, COMPANY_RIVAL, null);

        assertThat(resolver.capacityOf(linked, advert)).isEqualTo(Capacity.UNIVERSITY);
        assertThat(resolver.capacityOf(foreign, advert)).isEqualTo(Capacity.NONE);
        // H1 holds after relay: sharing your advert onward does not open it to the
        // company that never submitted it.
        assertThat(resolver.capacityOf(rival, advert)).isEqualTo(Capacity.NONE);
    }

    // --- 3. requireVisible: 404, never 403 [H3] -----------------------------

    @Test
    void requireVisibleAnswersNotFoundForEveryoneOutsideTheAudience() {
        Vacancy advert = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.PUBLISHED);
        UserEntity student = account("scstd", Role.STUDENT, null, UNI_A);
        UserEntity rival = account("scco", Role.COMPANY, COMPANY_RIVAL, null);

        assertThatThrownBy(() -> resolver.requireVisible(student, advert.getId()))
                .isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> resolver.requireVisible(rival, advert.getId()))
                .isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> resolver.requireVisible(student, 999999L))
                .isInstanceOf(java.util.NoSuchElementException.class);

        // The in-audience half, so the gate cannot simply refuse everything.
        assertThat(resolver.requireVisible(superAdmin(), advert.getId())).isSameAs(advert);
        UserEntity owner = account("scco", Role.COMPANY, COMPANY_OWN, null);
        assertThat(resolver.requireVisible(owner, advert.getId())).isSameAs(advert);
    }

    @Test
    void aStudentWithoutAUniversityIsNoOnesAudience() {
        UserEntity drift = account("scstd", Role.STUDENT, null, null);
        Vacancy advert = advert(Vacancy.Origin.COMPANY, COMPANY_OWN, Vacancy.Status.PUBLISHED);
        shareLink(advert.getId(), UNI_A, OpportunityShare.Status.SHARED);

        assertThat(resolver.capacityOf(drift, advert)).isEqualTo(Capacity.NONE);
    }
}
