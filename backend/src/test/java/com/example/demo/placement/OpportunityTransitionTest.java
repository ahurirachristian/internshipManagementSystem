package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * Step S2.1 (opportunity plan §8.3): the closed transition engine.
 *
 * <p>Two disciplines shape this suite:
 *
 * <ul>
 *   <li><b>The expected tables are hard-coded here, not read from the service.</b>
 *       An oracle that asks the production code which transitions are legal would
 *       agree with it by construction and could never catch it drifting from
 *       §5.6–§5.9. Every legal pair must actually pass end to end (scope, role,
 *       legality, history); every other pair in the cross product must be a 409.</li>
 *   <li><b>Scope is asserted before role.</b> A foreign id must produce
 *       {@ NoSuchElementException} — never {@ AccessDeniedException} — so the
 *       endpoint cannot be used to probe which rows exist elsewhere [H9][H7].</li>
 * </ul>
 *
 * <p>There are no endpoints yet (they arrive per phase); the exception types are the
 * ones {@code GlobalExceptionHandler} maps — {@code NoSuchElementException}→404,
 * {@code AccessDeniedException}→403, {@code IllegalStateException}→409.
 */
@SpringBootTest
@Transactional
class OpportunityTransitionTest {

    // --- Independent oracles (plan §5.6 advert, §5.7 offer, §5.8 share, §5.9 submission) ---

    private static final Map<Vacancy.Status, Set<Vacancy.Status>> ADVERT_OK = Map.of(
            Vacancy.Status.PENDING_REVIEW, Set.of(Vacancy.Status.PUBLISHED, Vacancy.Status.REJECTED,
                    Vacancy.Status.WITHDRAWN),
            Vacancy.Status.PUBLISHED, Set.of(Vacancy.Status.CLOSED, Vacancy.Status.WITHDRAWN),
            Vacancy.Status.REJECTED, Set.of(),
            Vacancy.Status.WITHDRAWN, Set.of(),
            Vacancy.Status.CLOSED, Set.of(),
            Vacancy.Status.EXPIRED, Set.of());

    private static final Map<OpportunityOffer.Status, Set<OpportunityOffer.Status>> OFFER_OK = Map.of(
            OpportunityOffer.Status.OFFERED,
            Set.of(OpportunityOffer.Status.ACCEPTED, OpportunityOffer.Status.DECLINED),
            OpportunityOffer.Status.ACCEPTED,
            Set.of(OpportunityOffer.Status.SHARED, OpportunityOffer.Status.CLOSED),
            OpportunityOffer.Status.SHARED, Set.of(OpportunityOffer.Status.CLOSED),
            OpportunityOffer.Status.DECLINED, Set.of(),
            OpportunityOffer.Status.CLOSED, Set.of());

    private static final Map<OpportunityShare.Status, Set<OpportunityShare.Status>> SHARE_OK = Map.of(
            OpportunityShare.Status.SHARED, Set.of(OpportunityShare.Status.CLOSED),
            OpportunityShare.Status.CLOSED, Set.of());

    private static final Map<OpportunitySubmission.Status, Set<OpportunitySubmission.Status>> SUBMISSION_OK = Map.of(
            OpportunitySubmission.Status.PENDING,
            Set.of(OpportunitySubmission.Status.APPROVED, OpportunitySubmission.Status.REJECTED),
            OpportunitySubmission.Status.APPROVED, Set.of(),
            OpportunitySubmission.Status.REJECTED, Set.of());

    private static final long COMPANY_A = 42L;
    private static final long COMPANY_RIVAL = 43L;
    private static final long UNI_A = 777L;
    private static final long UNI_B = 888L;

    @Autowired
    private OpportunityTransitionService service;
    @Autowired
    private UserRepository userRepository;
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

    // --- Fixtures (runtime-created; MigrationCatalogCountTest forbids seeded users) ---

    private UserEntity account(String username, Role role) {
        UserEntity user = new UserEntity(username + suffix(), "hash", role);
        user.setMustChangePassword(false);
        return userRepository.save(user);
    }

    private UserEntity superAdmin() {
        return userRepository.findByUsername("admin").orElseThrow();
    }

    private UserEntity plainAdmin() {
        return account("tradmin", Role.ADMIN);
    }

    private UserEntity companyActor(long companyId) {
        UserEntity user = account("trco", Role.COMPANY);
        user.setCompanyId(companyId);
        return userRepository.save(user);
    }

    private UserEntity supervisor(long universityId) {
        UserEntity user = account("trsup", Role.SUPERVISOR);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private UserEntity student(long universityId) {
        UserEntity user = account("trstud", Role.STUDENT);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private Vacancy vacancy(Long companyId, Vacancy.Status from) {
        return vacancyRepository.save(new Vacancy("Transition role " + suffix(),
                "A description of the role", companyId, "Kampala", "Some requirements",
                from.name(), LocalDate.now().plusMonths(2), LocalDate.now()));
    }

    /** An advert under a university's care: no company, origin SUPERVISOR, linked by a submission row. */
    private Vacancy supervisorAdvert(long universityId, Vacancy.Status from) {
        Vacancy advert = vacancy(null, from);
        advert.setOrigin(Vacancy.Origin.SUPERVISOR);
        OpportunitySubmission link = new OpportunitySubmission();
        link.setVacancyId(advert.getId());
        link.setUniversityId(universityId);
        link.setSubmittedBy(supervisor(universityId).getId());
        submissionRepository.save(link);
        return vacancyRepository.save(advert);
    }

    private OpportunityOffer offer(long universityId, OpportunityOffer.Status from) {
        OpportunityOffer row = new OpportunityOffer();
        row.setVacancyId(freshRelayVacancyKey());
        row.setUniversityId(universityId);
        // offered_by is NOT NULL (§5.7): the super admin is who offered it (R3).
        row.setOfferedBy(superAdmin().getId());
        row.setStatus(from);
        return offerRepository.save(row);
    }

    private OpportunityShare share(long universityId, OpportunityShare.Status from) {
        OpportunityShare row = new OpportunityShare();
        row.setVacancyId(freshRelayVacancyKey());
        row.setUniversityId(universityId);
        // shared_by is NOT NULL (§5.8): a supervisor of that university shared it.
        row.setSharedBy(supervisor(universityId).getId());
        row.setStatus(from);
        return shareRepository.save(row);
    }

    private OpportunitySubmission submission(long universityId, long submittedBy,
            OpportunitySubmission.Status from) {
        OpportunitySubmission row = new OpportunitySubmission();
        row.setVacancyId(freshRelayVacancyKey());
        row.setUniversityId(universityId);
        row.setSubmittedBy(submittedBy);
        row.setStatus(from);
        return submissionRepository.save(row);
    }

    /**
     * Relay fixtures need a distinct vacancy_id per row: submissions carry
     * UNIQUE (vacancy_id) and offers/shares carry UNIQUE (vacancy_id, university_id),
     * so the matrix loops cannot share one advert id. No FK — the scalar is free.
     */
    private long freshRelayVacancyKey() {
        return System.nanoTime();
    }

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private int historyFor(Long vacancyId) {
        return historyRepository.findByVacancyIdOrderByChangedAtAsc(vacancyId).size();
    }

    // --- 1. Every legal pair passes, as the super admin ---------------------

    @Test
    void everyLegalAdvertTransitionPassesAndLeavesOneHistoryRow() {
        UserEntity admin = superAdmin();
        for (Vacancy.Status from : Vacancy.Status.values()) {
            for (Vacancy.Status to : Vacancy.Status.values()) {
                if (!ADVERT_OK.get(from).contains(to)) {
                    continue;
                }
                Vacancy advert = vacancy(COMPANY_A, from);

                Vacancy result = service.transitionAdvert(admin, advert.getId(), to,
                        "Reviewed: " + from + " -> " + to);

                assertThat(result.getStatus()).as("%s -> %s", from, to).isEqualTo(to);
                if (from == Vacancy.Status.PENDING_REVIEW
                        && (to == Vacancy.Status.PUBLISHED || to == Vacancy.Status.REJECTED)) {
                    // S4.2: a verdict is never bare — it records who judged, when, why.
                    assertThat(result.getVerificationStatus()).as("%s -> %s verdict", from, to)
                            .isEqualTo(to == Vacancy.Status.PUBLISHED
                                    ? Vacancy.VerificationStatus.VERIFIED
                                    : Vacancy.VerificationStatus.REJECTED);
                    assertThat(result.getVerifiedBy()).as("%s -> %s judge", from, to)
                            .isEqualTo(admin.getId());
                    assertThat(result.getVerifiedAt()).as("%s -> %s time", from, to).isNotNull();
                    assertThat(result.getVerificationNote()).as("%s -> %s note", from, to)
                            .isEqualTo("Reviewed: " + from + " -> " + to);
                }
                assertThat(historyFor(advert.getId())).as("%s -> %s history", from, to).isEqualTo(1);
                OpportunityStatusHistory row = historyRepository
                        .findByVacancyIdOrderByChangedAtAsc(advert.getId()).get(0);
                assertThat(row.getFromStatus()).isEqualTo(from.name());
                assertThat(row.getToStatus()).isEqualTo(to.name());
                assertThat(row.getRelayType()).isNull();
                assertThat(row.getUniversityId()).isNull();
                assertThat(row.getChangedBy()).isEqualTo(admin.getId());
            }
        }
    }

    @Test
    void everyLegalOfferTransitionPasses() {
        UserEntity uniSupervisor = supervisor(UNI_A);
        for (OpportunityOffer.Status from : OpportunityOffer.Status.values()) {
            for (OpportunityOffer.Status to : OpportunityOffer.Status.values()) {
                if (!OFFER_OK.get(from).contains(to)) {
                    continue;
                }
                OpportunityOffer row = offer(UNI_A, from);

                OpportunityOffer result = service.transitionOffer(uniSupervisor, row.getId(), to);

                assertThat(result.getStatus()).as("%s -> %s", from, to).isEqualTo(to);
                OpportunityStatusHistory history = historyRepository
                        .findByVacancyIdOrderByChangedAtAsc(row.getVacancyId()).get(0);
                assertThat(history.getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_OFFER);
                assertThat(history.getUniversityId()).isEqualTo(UNI_A);
            }
        }
    }

    @Test
    void everyLegalShareTransitionPasses() {
        UserEntity uniSupervisor = supervisor(UNI_A);
        OpportunityShare row = share(UNI_A, OpportunityShare.Status.SHARED);

        OpportunityShare result = service.transitionShare(uniSupervisor, row.getId(),
                OpportunityShare.Status.CLOSED);

        assertThat(result.getStatus()).isEqualTo(OpportunityShare.Status.CLOSED);
        OpportunityStatusHistory history = historyRepository
                .findByVacancyIdOrderByChangedAtAsc(row.getVacancyId()).get(0);
        assertThat(history.getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_SHARE);
        assertThat(history.getFromStatus()).isEqualTo("SHARED");
        assertThat(history.getToStatus()).isEqualTo("CLOSED");
        assertThat(history.getUniversityId()).isEqualTo(UNI_A);
    }

    @Test
    void everyLegalSubmissionTransitionPasses() {
        UserEntity uniSupervisor = supervisor(UNI_A);
        for (OpportunitySubmission.Status from : OpportunitySubmission.Status.values()) {
            for (OpportunitySubmission.Status to : OpportunitySubmission.Status.values()) {
                if (!SUBMISSION_OK.get(from).contains(to)) {
                    continue;
                }
                OpportunitySubmission row = submission(UNI_A, uniSupervisor.getId(), from);

                OpportunitySubmission result = service.transitionSubmission(uniSupervisor, row.getId(), to);

                assertThat(result.getStatus()).as("%s -> %s", from, to).isEqualTo(to);
                OpportunityStatusHistory history = historyRepository
                        .findByVacancyIdOrderByChangedAtAsc(row.getVacancyId()).get(0);
                assertThat(history.getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_SUBMISSION);
                assertThat(history.getUniversityId()).isEqualTo(UNI_A);
            }
        }
    }

    // --- 2. Every other pair is a 409, and writes nothing -------------------

    @Test
    void everyIllegalAdvertTransitionIsAConflictAndWritesNoHistory() {
        UserEntity admin = superAdmin();
        for (Vacancy.Status from : Vacancy.Status.values()) {
            Vacancy advert = vacancy(COMPANY_A, from);
            for (Vacancy.Status to : Vacancy.Status.values()) {
                if (ADVERT_OK.get(from).contains(to)) {
                    continue;
                }
                assertThatThrownBy(() -> service.transitionAdvert(admin, advert.getId(), to))
                        .as("%s -> %s must be refused", from, to)
                        .isInstanceOf(IllegalStateException.class);

                assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                        .as("%s -> %s must not move the row", from, to)
                        .isEqualTo(from);
            }
            assertThat(historyFor(advert.getId()))
                    .as("refused transitions from %s write no history", from)
                    .isZero();
        }
    }

    @Test
    void everyIllegalOfferTransitionIsAConflict() {
        UserEntity uniSupervisor = supervisor(UNI_A);
        for (OpportunityOffer.Status from : OpportunityOffer.Status.values()) {
            OpportunityOffer row = offer(UNI_A, from);
            for (OpportunityOffer.Status to : OpportunityOffer.Status.values()) {
                if (OFFER_OK.get(from).contains(to)) {
                    continue;
                }
                assertThatThrownBy(() -> service.transitionOffer(uniSupervisor, row.getId(), to))
                        .as("%s -> %s must be refused", from, to)
                        .isInstanceOf(IllegalStateException.class);

                assertThat(offerRepository.findById(row.getId()).orElseThrow().getStatus())
                        .isEqualTo(from);
            }
            assertThat(historyFor(row.getVacancyId())).isZero();
        }
    }

    @Test
    void everyIllegalShareTransitionIsAConflict() {
        UserEntity uniSupervisor = supervisor(UNI_A);
        OpportunityShare row = share(UNI_A, OpportunityShare.Status.CLOSED);

        assertThatThrownBy(() -> service.transitionShare(uniSupervisor, row.getId(),
                OpportunityShare.Status.SHARED))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.transitionShare(uniSupervisor, row.getId(),
                OpportunityShare.Status.CLOSED))
                .isInstanceOf(IllegalStateException.class);

        assertThat(shareRepository.findById(row.getId()).orElseThrow().getStatus())
                .isEqualTo(OpportunityShare.Status.CLOSED);
        assertThat(historyFor(row.getVacancyId())).isZero();
    }

    @Test
    void everyIllegalSubmissionTransitionIsAConflict() {
        UserEntity uniSupervisor = supervisor(UNI_A);
        for (OpportunitySubmission.Status from : OpportunitySubmission.Status.values()) {
            OpportunitySubmission row = submission(UNI_A, uniSupervisor.getId(), from);
            for (OpportunitySubmission.Status to : OpportunitySubmission.Status.values()) {
                if (SUBMISSION_OK.get(from).contains(to)) {
                    continue;
                }
                assertThatThrownBy(() -> service.transitionSubmission(uniSupervisor, row.getId(), to))
                        .as("%s -> %s must be refused", from, to)
                        .isInstanceOf(IllegalStateException.class);

                assertThat(submissionRepository.findById(row.getId()).orElseThrow().getStatus())
                        .isEqualTo(from);
            }
            assertThat(historyFor(row.getVacancyId())).isZero();
        }
    }

    // --- 3. Terminal is terminal -------------------------------------------

    @Test
    void everyTerminalStateRefusesEveryTargetIncludingItself() {
        UserEntity admin = superAdmin();
        Set<Vacancy.Status> terminal = Set.of(Vacancy.Status.REJECTED, Vacancy.Status.WITHDRAWN,
                Vacancy.Status.CLOSED, Vacancy.Status.EXPIRED);

        for (Vacancy.Status from : terminal) {
            Vacancy advert = vacancy(COMPANY_A, from);
            for (Vacancy.Status to : Vacancy.Status.values()) {
                assertThatThrownBy(() -> service.transitionAdvert(admin, advert.getId(), to))
                        .as("terminal %s refuses %s", from, to)
                        .isInstanceOf(IllegalStateException.class);
            }
            assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                    .isEqualTo(from);
            assertThat(historyFor(advert.getId())).isZero();
        }
    }

    // --- 4. Scope first: a foreign id is 404, never 403 ---------------------

    @Test
    void aRivalCompanyIsNotFoundOnAnotherCompanysAdvert() {
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PUBLISHED);
        UserEntity rival = companyActor(COMPANY_RIVAL);

        assertThatThrownBy(() -> service.transitionAdvert(rival, advert.getId(),
                Vacancy.Status.WITHDRAWN))
                .isInstanceOf(java.util.NoSuchElementException.class);

        assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PUBLISHED);
        assertThat(historyFor(advert.getId())).isZero();
    }

    @Test
    void aSupervisorOfAnotherUniversityIsNotFoundOnAnOffer() {
        OpportunityOffer row = offer(UNI_A, OpportunityOffer.Status.OFFERED);
        UserEntity foreign = supervisor(UNI_B);

        assertThatThrownBy(() -> service.transitionOffer(foreign, row.getId(),
                OpportunityOffer.Status.ACCEPTED))
                .isInstanceOf(java.util.NoSuchElementException.class);

        // Scope fires before role: even though this supervisor IS a SUPERVISOR and
        // ACCEPTED is a legal target, the offer was never theirs to see [H9].
        assertThat(offerRepository.findById(row.getId()).orElseThrow().getStatus())
                .isEqualTo(OpportunityOffer.Status.OFFERED);
        assertThat(row.getRespondedBy()).isNull();
    }

    @Test
    void aSupervisorOfAnotherUniversityIsNotFoundOnASubmission() {
        UserEntity sender = supervisor(UNI_A);
        OpportunitySubmission row = submission(UNI_A, sender.getId(),
                OpportunitySubmission.Status.PENDING);
        UserEntity foreign = supervisor(UNI_B);

        assertThatThrownBy(() -> service.transitionSubmission(foreign, row.getId(),
                OpportunitySubmission.Status.APPROVED))
                .isInstanceOf(java.util.NoSuchElementException.class);

        assertThat(submissionRepository.findById(row.getId()).orElseThrow().getStatus())
                .isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    @Test
    void aStudentIsNotFoundOnAnAdvert() {
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PUBLISHED);
        UserEntity student = student(UNI_A);

        assertThatThrownBy(() -> service.transitionAdvert(student, advert.getId(),
                Vacancy.Status.WITHDRAWN))
                .isInstanceOf(java.util.NoSuchElementException.class);

        assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PUBLISHED);
    }

    @Test
    void anUnknownIdIsNotFound() {
        assertThatThrownBy(() -> service.transitionAdvert(superAdmin(), 999999L,
                Vacancy.Status.PUBLISHED))
                .isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> service.transitionOffer(superAdmin(), 999999L,
                OpportunityOffer.Status.CLOSED))
                .isInstanceOf(java.util.NoSuchElementException.class);
    }

    // --- 5. Then role: in scope, wrong persona, is 403 ----------------------

    @Test
    void aCompanyCannotVerifyItsOwnAdvert() {
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PENDING_REVIEW);
        UserEntity owner = companyActor(COMPANY_A);

        // In scope (it is their advert), but verification is the super admin's [H6].
        assertThatThrownBy(() -> service.transitionAdvert(owner, advert.getId(),
                Vacancy.Status.PUBLISHED))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThatThrownBy(() -> service.transitionAdvert(owner, advert.getId(),
                Vacancy.Status.REJECTED))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PENDING_REVIEW);
        assertThat(historyFor(advert.getId())).isZero();
    }

    @Test
    void aPlainAdminWithoutTheSuperAdminFlagCannotVerifyAnAdvert() {
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PENDING_REVIEW);
        UserEntity adminRole = plainAdmin();

        assertThatThrownBy(() -> service.transitionAdvert(adminRole, advert.getId(),
                Vacancy.Status.PUBLISHED))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PENDING_REVIEW);
    }

    @Test
    void theOriginatorMayWithdrawItsOwnAdvert() {
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PUBLISHED);
        UserEntity owner = companyActor(COMPANY_A);

        Vacancy result = service.transitionAdvert(owner, advert.getId(), Vacancy.Status.WITHDRAWN);

        assertThat(result.getStatus()).isEqualTo(Vacancy.Status.WITHDRAWN);
        assertThat(historyFor(advert.getId())).isEqualTo(1);
    }

    @Test
    void aSupervisorMayWithdrawTheAdvertTheirUniversitySubmitted() {
        Vacancy advert = supervisorAdvert(UNI_A, Vacancy.Status.PENDING_REVIEW);
        UserEntity uniSupervisor = supervisor(UNI_A);

        Vacancy result = service.transitionAdvert(uniSupervisor, advert.getId(),
                Vacancy.Status.WITHDRAWN);

        assertThat(result.getStatus()).isEqualTo(Vacancy.Status.WITHDRAWN);
        assertThat(historyFor(advert.getId())).isEqualTo(1);
    }

    @Test
    void aSupervisorCannotWithdrawAnAdvertTheirUniversityIsNotLinkedTo() {
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PUBLISHED);
        UserEntity uniSupervisor = supervisor(UNI_A);

        // No submission or share row links UNI_A to this company advert, and its
        // origin is COMPANY — scope fails before the role question is asked.
        assertThatThrownBy(() -> service.transitionAdvert(uniSupervisor, advert.getId(),
                Vacancy.Status.WITHDRAWN))
                .isInstanceOf(java.util.NoSuchElementException.class);

        assertThat(vacancyRepository.findById(advert.getId()).orElseThrow().getStatus())
                .isEqualTo(Vacancy.Status.PUBLISHED);
    }

    @Test
    void onlyAUniversitySupervisorMayAnswerAnOffer() {
        OpportunityOffer row = offer(UNI_A, OpportunityOffer.Status.OFFERED);
        UserEntity admin = superAdmin();
        UserEntity student = student(UNI_A);

        // Scope passes for both (super admin sees all; the student is at UNI_A) —
        // the relay answer is the university's to give, so role refuses both [§6.3].
        assertThatThrownBy(() -> service.transitionOffer(admin, row.getId(),
                OpportunityOffer.Status.ACCEPTED))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThatThrownBy(() -> service.transitionOffer(student, row.getId(),
                OpportunityOffer.Status.DECLINED))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        assertThat(offerRepository.findById(row.getId()).orElseThrow().getStatus())
                .isEqualTo(OpportunityOffer.Status.OFFERED);
        assertThat(historyFor(row.getVacancyId())).isZero();
    }

    @Test
    void aStudentAtTheRightUniversityCannotCloseAShare() {
        OpportunityShare row = share(UNI_A, OpportunityShare.Status.SHARED);
        UserEntity student = student(UNI_A);

        assertThatThrownBy(() -> service.transitionShare(student, row.getId(),
                OpportunityShare.Status.CLOSED))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        assertThat(shareRepository.findById(row.getId()).orElseThrow().getStatus())
                .isEqualTo(OpportunityShare.Status.SHARED);
        assertThat(row.getClosedBy()).isNull();
    }

    @Test
    void aSuperAdminCannotReviewAUniversitysSubmission() {
        OpportunitySubmission row = submission(UNI_A, supervisor(UNI_A).getId(),
                OpportunitySubmission.Status.PENDING);
        UserEntity admin = superAdmin();

        // In scope, wrong persona: §6.3 gates the review endpoint to SUPERVISOR, and
        // D2 says the university is the trusted verifier for its own pipeline.
        assertThatThrownBy(() -> service.transitionSubmission(admin, row.getId(),
                OpportunitySubmission.Status.APPROVED))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        assertThat(submissionRepository.findById(row.getId()).orElseThrow().getStatus())
                .isEqualTo(OpportunitySubmission.Status.PENDING);
    }

    // --- 6. The side fields each transition owns ----------------------------

    @Test
    void verifyingRecordsTheModerationTimestamps() {
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PENDING_REVIEW);

        service.transitionAdvert(superAdmin(), advert.getId(), Vacancy.Status.PUBLISHED,
                "Evidence checked");

        Vacancy reloaded = vacancyRepository.findById(advert.getId()).orElseThrow();
        assertThat(reloaded.getPublishedAt()).isNotNull();
        assertThat(reloaded.getReviewedAt()).isNotNull();
        assertThat(reloaded.getUpdatedAt()).isNotNull();
        // S4.2: the verdict's own fields — who judged, when, and why [H6].
        assertThat(reloaded.getVerifiedBy()).isEqualTo(superAdmin().getId());
        assertThat(reloaded.getVerifiedAt()).isNotNull();
        assertThat(reloaded.getVerificationNote()).isEqualTo("Evidence checked");
        assertThat(reloaded.getVerificationStatus()).isEqualTo(Vacancy.VerificationStatus.VERIFIED);
    }

    @Test
    void answeringAnOfferRecordsWhoAndWhen() {
        OpportunityOffer row = offer(UNI_A, OpportunityOffer.Status.OFFERED);
        UserEntity uniSupervisor = supervisor(UNI_A);

        service.transitionOffer(uniSupervisor, row.getId(), OpportunityOffer.Status.ACCEPTED);

        OpportunityOffer reloaded = offerRepository.findById(row.getId()).orElseThrow();
        assertThat(reloaded.getRespondedBy()).isEqualTo(uniSupervisor.getId());
        assertThat(reloaded.getRespondedAt()).isNotNull();
    }

    @Test
    void closingAShareRecordsWhoAndWhen() {
        OpportunityShare row = share(UNI_A, OpportunityShare.Status.SHARED);
        UserEntity uniSupervisor = supervisor(UNI_A);

        service.transitionShare(uniSupervisor, row.getId(), OpportunityShare.Status.CLOSED);

        OpportunityShare reloaded = shareRepository.findById(row.getId()).orElseThrow();
        assertThat(reloaded.getClosedBy()).isEqualTo(uniSupervisor.getId());
        assertThat(reloaded.getClosedAt()).isNotNull();
    }

    @Test
    void reviewingASubmissionRecordsWhoAndWhen() {
        OpportunitySubmission row = submission(UNI_A, supervisor(UNI_A).getId(),
                OpportunitySubmission.Status.PENDING);
        UserEntity reviewer = supervisor(UNI_A);

        service.transitionSubmission(reviewer, row.getId(), OpportunitySubmission.Status.APPROVED);

        OpportunitySubmission reloaded = submissionRepository.findById(row.getId()).orElseThrow();
        assertThat(reloaded.getReviewedBy()).isEqualTo(reviewer.getId());
        assertThat(reloaded.getReviewedAt()).isNotNull();
    }
}
