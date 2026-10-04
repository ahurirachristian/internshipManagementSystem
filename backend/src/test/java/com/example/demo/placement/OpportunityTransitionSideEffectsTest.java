package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLog;
import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.notification.Notification;
import com.example.demo.notification.NotificationRepository;

/**
 * Step S2.2 (opportunity plan §8.3): every transition emits exactly one
 * notification and one audit row, from inside {@link OpportunityTransitionService}
 * — never from a controller — matching {@code PlacementPipelineService}'s
 * history → notify → audit ordering.
 *
 * <p>The assertions are deliberately about <b>exactly</b> one audit row per
 * transition: an implementation that audited twice would still "notify and audit"
 * and pass a looser test, leaving the admin's audit search with duplicates nobody
 * can distinguish. The negative half matters as much: a refused transition must
 * emit nothing, or the audit log would claim decisions that were never made.
 *
 * <p>Recipients follow the §9 catalog where the catalog covers the event
 * (verified/rejected → submitter; answered offer → super admins). The
 * student-facing fan-out needs targeting and chunking [H11] and stays with
 * S6.5/S6.6 — pinned here by {@link #closingAShareTellsTheSharingUniversitysSupervisorsNotTheWorld}.
 */
@SpringBootTest
@Transactional
class OpportunityTransitionSideEffectsTest {

    private static final long COMPANY_A = 42L;
    private static final long COMPANY_RIVAL = 43L;
    private static final long UNI_A = 777L;
    private static final long UNI_B = 888L;

    @Autowired
    private OpportunityTransitionService service;
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

    private long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private UserEntity companyUser(long companyId) {
        UserEntity user = new UserEntity("seco" + suffix(), "hash", Role.COMPANY);
        user.setMustChangePassword(false);
        user.setCompanyId(companyId);
        return userRepository.save(user);
    }

    private UserEntity supervisor(long universityId) {
        UserEntity user = new UserEntity("sesup" + suffix(), "hash", Role.SUPERVISOR);
        user.setMustChangePassword(false);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private Vacancy vacancy(Long companyId, Vacancy.Status from) {
        return vacancyRepository.save(new Vacancy("Side effect role " + suffix(),
                "A description of the role", companyId, "Kampala", "Some requirements",
                from.name(), LocalDate.now().plusMonths(2), LocalDate.now()));
    }

    private OpportunityOffer offer(long universityId, OpportunityOffer.Status from) {
        OpportunityOffer row = new OpportunityOffer();
        row.setVacancyId(System.nanoTime());
        row.setUniversityId(universityId);
        row.setOfferedBy(superAdmin().getId());
        row.setStatus(from);
        return offerRepository.save(row);
    }

    private OpportunityShare share(long universityId, OpportunityShare.Status from) {
        OpportunityShare row = new OpportunityShare();
        row.setVacancyId(System.nanoTime());
        row.setUniversityId(universityId);
        row.setSharedBy(supervisor(universityId).getId());
        row.setStatus(from);
        return shareRepository.save(row);
    }

    private OpportunitySubmission submission(long universityId, long submittedBy,
            OpportunitySubmission.Status from) {
        OpportunitySubmission row = new OpportunitySubmission();
        row.setVacancyId(System.nanoTime());
        row.setUniversityId(universityId);
        row.setSubmittedBy(submittedBy);
        row.setStatus(from);
        return submissionRepository.save(row);
    }

    // --- Assertion helpers ---

    private List<Notification> inbox(UserEntity user) {
        return notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(user.getId());
    }

    private List<AuditLog> auditRows(String action, String detailsFragment) {
        return auditLogRepository.findAll().stream()
                .filter(a -> action.equals(a.getAction())
                        && a.getDetails() != null
                        && a.getDetails().contains(detailsFragment))
                .toList();
    }

    // --- 1. The §9 catalog events ------------------------------------------

    @Test
    void verifyingAnAdvertNotifiesTheSubmitterAndAuditsExactlyOnce() {
        long companyId = createCompany("Side Verify Co " + suffix());
        UserEntity owner = companyUser(companyId);
        Vacancy advert = vacancy(companyId, Vacancy.Status.PENDING_REVIEW);

        service.transitionAdvert(superAdmin(), advert.getId(), Vacancy.Status.PUBLISHED,
                "Legit offer, evidence checked");

        assertThat(inbox(owner))
                .anyMatch(n -> "OPPORTUNITY_VERIFIED".equals(n.getType())
                        && n.getBody().contains(advert.getTitle()));
        assertThat(auditRows("OPPORTUNITY_STATUS", "Opportunity " + advert.getId()))
                .hasSize(1);
    }

    @Test
    void rejectingAnAdvertNotifiesTheSubmitterWithTheRejectionType() {
        long companyId = createCompany("Side Reject Co " + suffix());
        UserEntity owner = companyUser(companyId);
        Vacancy advert = vacancy(companyId, Vacancy.Status.PENDING_REVIEW);

        service.transitionAdvert(superAdmin(), advert.getId(), Vacancy.Status.REJECTED,
                "No evidence behind this offer");

        assertThat(inbox(owner))
                .anyMatch(n -> "OPPORTUNITY_REJECTED".equals(n.getType()));
        assertThat(auditRows("OPPORTUNITY_STATUS", "Opportunity " + advert.getId()))
                .hasSize(1);
    }

    @Test
    void answeringAnOfferNotifiesTheSuperAdmins() {
        UserEntity admin = superAdmin();
        OpportunityOffer row = offer(UNI_A, OpportunityOffer.Status.OFFERED);
        UserEntity uniSupervisor = supervisor(UNI_A);

        service.transitionOffer(uniSupervisor, row.getId(), OpportunityOffer.Status.ACCEPTED);

        assertThat(inbox(admin))
                .anyMatch(n -> "OPPORTUNITY_OFFER_ANSWERED".equals(n.getType()));
        assertThat(auditRows("OPPORTUNITY_OFFER_STATUS",
                "Offer " + row.getId() + " (university " + UNI_A + ")"))
                        .hasSize(1);
    }

    // --- 2. One notification and one audit row per transition, not more -----

    @Test
    void everyAdvertTransitionInALifecycleIsAuditedExactlyOnce() {
        UserEntity admin = superAdmin();
        Vacancy advert = vacancy(COMPANY_A, Vacancy.Status.PENDING_REVIEW);

        service.transitionAdvert(admin, advert.getId(), Vacancy.Status.PUBLISHED,
                "Verified after review");
        service.transitionAdvert(admin, advert.getId(), Vacancy.Status.CLOSED);

        // Two transitions, two audit rows — a double-writing implementation or a
        // missing one both fail here.
        assertThat(auditRows("OPPORTUNITY_STATUS", "Opportunity " + advert.getId()))
                .hasSize(2);
        assertThat(historyRepository.findByVacancyIdOrderByChangedAtAsc(advert.getId()))
                .hasSize(2);
    }

    @Test
    void withdrawingUsesThePlainStatusNotice() {
        long companyId = createCompany("Side Withdraw Co " + suffix());
        UserEntity owner = companyUser(companyId);
        Vacancy advert = vacancy(companyId, Vacancy.Status.PUBLISHED);

        service.transitionAdvert(owner, advert.getId(), Vacancy.Status.WITHDRAWN);

        assertThat(inbox(owner))
                .anyMatch(n -> "OPPORTUNITY_STATUS".equals(n.getType())
                        && "Opportunity updated".equals(n.getTitle()));
        assertThat(auditRows("OPPORTUNITY_STATUS", "Opportunity " + advert.getId()))
                .hasSize(1);
    }

    @Test
    void aUniversitySubmittedAdvertTellsThatUniversitysSupervisors() {
        // origin=SUPERVISOR, linked by a submission row: the counterpart is that
        // university's supervisors, not the company list and not the world.
        UserEntity uniSupervisor = supervisor(UNI_A);
        Vacancy advert = vacancy(null, Vacancy.Status.PENDING_REVIEW);
        advert.setOrigin(Vacancy.Origin.SUPERVISOR);
        advert = vacancyRepository.save(advert);
        OpportunitySubmission link = new OpportunitySubmission();
        link.setVacancyId(advert.getId());
        link.setUniversityId(UNI_A);
        link.setSubmittedBy(uniSupervisor.getId());
        submissionRepository.save(link);

        service.transitionAdvert(superAdmin(), advert.getId(), Vacancy.Status.PUBLISHED,
                "Supervisor proposal approved");

        assertThat(inbox(uniSupervisor))
                .anyMatch(n -> "OPPORTUNITY_VERIFIED".equals(n.getType()));
    }

    @Test
    void closingAShareTellsTheSharingUniversitysSupervisorsNotTheWorld() {
        UserEntity uniSupervisor = supervisor(UNI_A);
        OpportunityShare row = share(UNI_A, OpportunityShare.Status.SHARED);
        UserEntity otherUniversity = supervisor(UNI_B);

        service.transitionShare(uniSupervisor, row.getId(), OpportunityShare.Status.CLOSED);

        assertThat(inbox(uniSupervisor))
                .anyMatch(n -> "OPPORTUNITY_STATUS".equals(n.getType())
                        && n.getBody().contains(String.valueOf(row.getVacancyId())));
        // The student fan-out [H11] belongs to S6.5/S6.6; until then nobody outside
        // the sharing university is told, and in particular not other universities.
        assertThat(inbox(otherUniversity)).noneMatch(n -> n.getType().startsWith("OPPORTUNITY"));
        assertThat(auditRows("OPPORTUNITY_SHARE_STATUS",
                "Share " + row.getId() + " (university " + UNI_A + ")"))
                        .hasSize(1);
    }

    @Test
    void reviewingASubmissionNotifiesTheSubmitter() {
        UserEntity submitter = supervisor(UNI_A);
        UserEntity reviewer = supervisor(UNI_A);
        OpportunitySubmission row = submission(UNI_A, submitter.getId(),
                OpportunitySubmission.Status.PENDING);

        service.transitionSubmission(reviewer, row.getId(), OpportunitySubmission.Status.APPROVED);

        assertThat(inbox(submitter))
                .anyMatch(n -> "OPPORTUNITY_STATUS".equals(n.getType())
                        && "Submission reviewed".equals(n.getTitle())
                        && n.getBody().contains("APPROVED"));
        assertThat(auditRows("OPPORTUNITY_SUBMISSION_STATUS",
                "Submission " + row.getId() + " (university " + UNI_A + ")"))
                        .hasSize(1);
    }

    // --- 3. The negatives: nobody uninvolved, and nothing on a refusal ------

    @Test
    void aRivalCompanyIsNeverToldAboutYourVerdict() {
        long companyId = createCompany("Side Mine Co " + suffix());
        long rivalId = createCompany("Side Rival Co " + suffix());
        UserEntity rival = companyUser(rivalId);
        Vacancy advert = vacancy(companyId, Vacancy.Status.PENDING_REVIEW);

        service.transitionAdvert(superAdmin(), advert.getId(), Vacancy.Status.REJECTED,
                "Turned down at review");

        assertThat(inbox(rival)).noneMatch(n -> n.getType().startsWith("OPPORTUNITY"));
    }

    @Test
    void aRefusedTransitionEmitsNoNotificationAndNoAuditRow() {
        long companyId = createCompany("Side Refused Co " + suffix());
        UserEntity owner = companyUser(companyId);
        Vacancy advert = vacancy(companyId, Vacancy.Status.PENDING_REVIEW);

        // In scope, wrong persona: the company may not verify its own advert [H6].
        assertThatThrownBy(() -> service.transitionAdvert(owner, advert.getId(),
                Vacancy.Status.PUBLISHED))
                .isInstanceOf(AccessDeniedException.class);

        assertThat(inbox(owner)).noneMatch(n -> n.getType().startsWith("OPPORTUNITY"));
        assertThat(auditRows("OPPORTUNITY_STATUS", "Opportunity " + advert.getId()))
                .isEmpty();
        assertThat(historyRepository.findByVacancyIdOrderByChangedAtAsc(advert.getId()))
                .isEmpty();
    }
}
