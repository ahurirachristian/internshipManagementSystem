package com.example.demo.placement;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.notification.NotificationService;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.school.School;
import com.example.demo.school.SchoolRepository;

/**
 * S3.1 (opportunity plan §6.1): {@code POST /api/opportunities} — one endpoint
 * where the session role decides everything that carries authority:
 *
 * <ul>
 *   <li><b>Origin and initial status are derived, never read from the body</b>
 *       [H5]. A company posts {@code COMPANY} + {@code PENDING_REVIEW} +
 *       {@code UNVERIFIED} (R1's private state); a super admin sourcing an offer
 *       posts {@code SUPER_ADMIN} + {@code PUBLISHED} + {@code VERIFIED} in one
 *       move (R2 — the legitimacy verdict is their session, recorded with
 *       {@code verified_by}/{@code verified_at} and their required
 *       {@code sourceReference} evidence); a plain {@code ADMIN} without the
 *       {@code super_admin} flag is treated as a submitter, not a moderator, and
 *       lands in {@code PENDING_REVIEW}.</li>
 *   <li><b>The supervisor's two paths</b> (both stories are the same role):
 *       {@code sourceKind=UNIVERSITY_SOURCED} is R5 — the university is the
 *       trusted verifier (D2), so it is born {@code PUBLISHED} for its own
 *       university; anything else is R6 — a proposal the university reviews,
 *       born {@code PENDING_REVIEW}, and its {@code opportunity_submissions} row
 *       is written in the same save — the session's university, never the body's
 *       [H7] — so the university's queue holds it from the first second.</li>
 *   <li><b>{@code companyId} comes from the session, never the body</b> [H8],
 *       and every non-company origin has no company at all — the external
 *       organisation's name is then required (R2/R5/R6 may have no company
 *       record).</li>
 *   <li><b>Targeting ids must belong to the actor's university</b> [H7]: a
 *       supervisor cannot aim an advert at another university's schools, and an
 *       actor with no university cannot claim academic targeting at all. The
 *       {@code Integer}/{@code Long} conversion happens once, here — never in a
 *       controller (§2.5).</li>
 * </ul>
 *
 * <p>Side effects follow the house rule: one audit row always, and the §9
 * catalog's audience depends on who is actually waiting — a company or
 * plain-admin submission goes to the super admins' inbox
 * ({@code OPPORTUNITY_SUBMITTED}), while an R6 proposal goes to the proposing
 * university's own supervisors ({@code OPPORTUNITY_SUBMISSION}) because D2 says
 * it never passes the super admin at all. A born-published advert awaits nobody's
 * decision, so it is audited and never announced as awaiting review.
 */
@Service
@Transactional
public class OpportunityService {

    private final VacancyRepository vacancyRepository;
    private final OpportunitySubmissionRepository submissionRepository;
    private final SchoolRepository schoolRepository;
    private final DepartmentRepository departmentRepository;
    private final ProgrammeRepository programmeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public OpportunityService(VacancyRepository vacancyRepository,
            OpportunitySubmissionRepository submissionRepository, SchoolRepository schoolRepository,
            DepartmentRepository departmentRepository, ProgrammeRepository programmeRepository,
            UserRepository userRepository, NotificationService notificationService,
            AuditLogService auditLogService) {
        this.vacancyRepository = vacancyRepository;
        this.submissionRepository = submissionRepository;
        this.schoolRepository = schoolRepository;
        this.departmentRepository = departmentRepository;
        this.programmeRepository = programmeRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    /**
     * What the session says this submission is — the only source of the four
     * fields a client may try to forge.
     */
    private record Derived(Vacancy.Origin origin, Vacancy.Status status,
            Vacancy.VerificationStatus verification, Long companyId, boolean awaitingReview) {
    }

    public Vacancy create(UserEntity actor, OpportunityCreateRequest request) {
        Derived derived = derive(actor, request);
        if (derived.companyId() == null
                && (request.externalOrgName() == null || request.externalOrgName().isBlank())) {
            // R2/R5/R6 may have no company record — the advert still has to say who is
            // offering the internship, or a student cannot decide or show up.
            throw new IllegalArgumentException(
                    "An opportunity with no company must name the external organisation.");
        }
        validateLogistics(request);
        validateTargeting(actor, request);

        Vacancy advert = new Vacancy(request.title(), request.description(), derived.companyId(),
                request.location(), request.requirements(), derived.status().name(),
                request.deadline(), LocalDate.now());
        advert.setOrigin(derived.origin());
        advert.setExternalOrgName(request.externalOrgName());
        advert.setSourceKind(resolveSourceKind(actor, request));
        advert.setSourceReference(request.sourceReference());
        advert.setVerificationStatus(derived.verification());
        if (derived.verification() == Vacancy.VerificationStatus.VERIFIED) {
            advert.setVerifiedBy(actor.getId());
            advert.setVerifiedAt(LocalDateTime.now());
        }
        if (derived.status() == Vacancy.Status.PUBLISHED) {
            advert.setPublishedAt(LocalDateTime.now());
        }
        advert.setUpdatedAt(LocalDateTime.now());
        copyAwareness(request, advert);
        copyLogistics(request, advert);
        copyTargetingAndContact(request, advert);

        Vacancy saved = vacancyRepository.save(advert);

        OpportunitySubmission proposal = null;
        if (derived.origin() == Vacancy.Origin.SUPERVISOR) {
            // R6: the proposal is a submission for approval — one hop of review at
            // the university that was forced from the session, never the body [H7].
            proposal = new OpportunitySubmission();
            proposal.setVacancyId(saved.getId());
            proposal.setUniversityId(actor.getUniversityId());
            proposal.setSubmittedBy(actor.getId());
            submissionRepository.save(proposal);
        }

        auditLogService.log(actor.getUsername(), actor.getRole().name(), "OPPORTUNITY_SUBMITTED", "Vacancy",
                "Opportunity " + saved.getId() + " created with origin " + saved.getOrigin()
                        + ", status " + saved.getStatus()
                        + (proposal != null ? ", submission " + proposal.getId() : ""), null);
        if (derived.awaitingReview()) {
            if (derived.origin() == Vacancy.Origin.SUPERVISOR) {
                // §9: an R6 submission goes to its own university's supervisors.
                notificationService.notify(supervisorIds(actor.getUniversityId()), "OPPORTUNITY_SUBMISSION",
                        "A supervisor submitted an opportunity",
                        "\"" + saved.getTitle() + "\" is waiting for the university's review.",
                        "/university/opportunities");
            } else {
                notificationService.notify(superAdminIds(), "OPPORTUNITY_SUBMITTED",
                        "New opportunity awaiting review",
                        "\"" + saved.getTitle() + "\" was submitted for review.", "/admin/opportunities");
            }
        }
        return saved;
    }

    /** Session decides [H5][H6][H8] — the request's own origin/status/companyId are never read. */
    private Derived derive(UserEntity actor, OpportunityCreateRequest request) {
        return switch (actor.getRole().name()) {
            case "COMPANY" -> {
                if (actor.getCompanyId() == null) {
                    throw new AccessDeniedException("Your account is not linked to a company.");
                }
                // L8: the company id is the session's, whatever the body claims.
                yield new Derived(Vacancy.Origin.COMPANY, Vacancy.Status.PENDING_REVIEW,
                        Vacancy.VerificationStatus.UNVERIFIED, actor.getCompanyId(), true);
            }
            case "SUPERVISOR" -> {
                if (actor.getUniversityId() == null) {
                    // A proposal has to land somewhere: no university, no pipeline.
                    throw new AccessDeniedException("Your account is not linked to a university.");
                }
                yield universitySourced(request)
                        ? new Derived(Vacancy.Origin.UNIVERSITY, Vacancy.Status.PUBLISHED,
                                Vacancy.VerificationStatus.VERIFIED, null, false)
                        : new Derived(Vacancy.Origin.SUPERVISOR, Vacancy.Status.PENDING_REVIEW,
                                Vacancy.VerificationStatus.UNVERIFIED, null, true);
            }
            case "ADMIN" -> {
                boolean moderator = Boolean.TRUE.equals(actor.getSuperAdmin());
                requireSourceEvidence(request);
                yield moderator
                        ? new Derived(Vacancy.Origin.SUPER_ADMIN, Vacancy.Status.PUBLISHED,
                                Vacancy.VerificationStatus.VERIFIED, null, false)
                        : new Derived(Vacancy.Origin.SUPER_ADMIN, Vacancy.Status.PENDING_REVIEW,
                                Vacancy.VerificationStatus.UNVERIFIED, null, true);
            }
            default -> throw new AccessDeniedException("Your role cannot submit opportunities.");
        };
    }

    private boolean universitySourced(OpportunityCreateRequest request) {
        if (request.sourceKind() == null || request.sourceKind().isBlank()) {
            return false;
        }
        return Vacancy.SourceKind.UNIVERSITY_SOURCED == parseSourceKind(request.sourceKind());
    }

    private Vacancy.SourceKind resolveSourceKind(UserEntity actor, OpportunityCreateRequest request) {
        String provided = request.sourceKind();
        if (provided != null && !provided.isBlank()) {
            return parseSourceKind(provided);
        }
        return switch (actor.getRole().name()) {
            case "COMPANY" -> Vacancy.SourceKind.COMPANY_DIRECT;
            case "ADMIN" -> Vacancy.SourceKind.EXTERNAL_OFFER;
            default -> universitySourced(request)
                    ? Vacancy.SourceKind.UNIVERSITY_SOURCED
                    : Vacancy.SourceKind.SUPERVISOR_SOURCED;
        };
    }

    private Vacancy.SourceKind parseSourceKind(String raw) {
        try {
            return Vacancy.SourceKind.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown source kind: " + raw);
        }
    }

    /** R2's "legit offer" must have evidence recorded — the verdict is only as good as its basis. */
    private void requireSourceEvidence(OpportunityCreateRequest request) {
        if (request.sourceReference() == null || request.sourceReference().isBlank()) {
            throw new IllegalArgumentException(
                    "A sourced opportunity must record its source reference — where the offer was found.");
        }
    }

    private void validateLogistics(OpportunityCreateRequest request) {
        if (request.startDate() != null && request.endDate() != null
                && request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("End date must not be before the start date.");
        }
        if (request.durationWeeks() != null && request.durationWeeks() <= 0) {
            throw new IllegalArgumentException("Duration must be at least one week.");
        }
        if (request.slots() != null && request.slots() < 0) {
            throw new IllegalArgumentException("Slots cannot be negative.");
        }
        if (request.workMode() != null && !request.workMode().isBlank()) {
            try {
                Vacancy.WorkMode.valueOf(request.workMode().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Unknown work mode: " + request.workMode());
            }
        }
    }

    /**
     * [H7]: targeting is an academic claim, so only a university may make one, and
     * only about its own units. The {@code Long} session id is converted to the
     * {@code Integer} the academic tables use exactly once, here (§2.5).
     */
    private void validateTargeting(UserEntity actor, OpportunityCreateRequest request) {
        List<String> schools = parseIds(request.targetSchoolIds());
        List<String> departments = parseIds(request.targetDepartmentIds());
        List<String> programmes = parseIds(request.targetProgrammeIds());
        if (schools.isEmpty() && departments.isEmpty() && programmes.isEmpty()) {
            return;
        }
        if (actor.getUniversityId() == null) {
            throw new IllegalArgumentException(
                    "Targeting can only be chosen by a university — it names its own schools, departments and programmes.");
        }
        int universityId = actor.getUniversityId().intValue();
        Set<Integer> ownSchools = schoolRepository.findByUniversityId(universityId).stream()
                .map(School::getSchoolId).collect(java.util.stream.Collectors.toSet());
        Set<Integer> ownDepartments = departmentRepository.findByUniversityId(universityId).stream()
                .map(Department::getDepartmentId).collect(java.util.stream.Collectors.toSet());
        Set<Integer> ownProgrammes = programmeRepository.findByUniversityId(universityId).stream()
                .map(Programme::getProgrammeId).collect(java.util.stream.Collectors.toSet());
        requireWithinUniversity(schools, ownSchools, "school");
        requireWithinUniversity(departments, ownDepartments, "department");
        requireWithinUniversity(programmes, ownProgrammes, "programme");
    }

    private List<String> parseIds(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return List.of(csv.split(","));
    }

    private void requireWithinUniversity(List<String> requested, Set<Integer> own, String noun) {
        for (String raw : requested) {
            String value = raw.trim();
            if (value.isEmpty()) {
                continue;
            }
            final int id;
            try {
                id = Integer.parseInt(value);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Targeting " + noun + " ids must be comma-separated numbers.");
            }
            if (!own.contains(id)) {
                throw new IllegalArgumentException(
                        "Targeting " + noun + " " + id + " does not belong to your university.");
            }
        }
    }

    private void copyAwareness(OpportunityCreateRequest request, Vacancy advert) {
        advert.setResponsibilities(request.responsibilities());
        advert.setDeliverablesExpected(request.deliverablesExpected());
        advert.setBenefits(request.benefits());
        advert.setRequiredSkills(request.requiredSkills());
        advert.setNiceToHave(request.niceToHave());
        advert.setToolsTechnologies(request.toolsTechnologies());
        advert.setSafetyOrientationRequired(Boolean.TRUE.equals(request.safetyOrientationRequired()));
        advert.setSafetyNotes(request.safetyNotes());
    }

    private void copyLogistics(OpportunityCreateRequest request, Vacancy advert) {
        if (request.workMode() != null && !request.workMode().isBlank()) {
            advert.setWorkMode(Vacancy.WorkMode.valueOf(request.workMode().trim().toUpperCase(Locale.ROOT)));
        }
        advert.setCountry(request.country());
        advert.setCity(request.city());
        advert.setAddressDetail(request.addressDetail());
        advert.setDurationWeeks(request.durationWeeks());
        advert.setStartDate(request.startDate());
        advert.setEndDate(request.endDate());
        advert.setIsPaid(request.isPaid());
        advert.setStipendAmount(request.stipendAmount());
        advert.setStipendCurrency(request.stipendCurrency());
        advert.setStipendPeriod(request.stipendPeriod());
    }

    private void copyTargetingAndContact(OpportunityCreateRequest request, Vacancy advert) {
        advert.setTargetSchoolIds(request.targetSchoolIds());
        advert.setTargetDepartmentIds(request.targetDepartmentIds());
        advert.setTargetProgrammeIds(request.targetProgrammeIds());
        advert.setTargetYearOfStudy(request.targetYearOfStudy());
        advert.setTargetDegreeLevels(request.targetDegreeLevels());
        advert.setMinCgpa(request.minCgpa());
        advert.setSlots(request.slots());
        advert.setEligibilityNotes(request.eligibilityNotes());
        advert.setContactPersonName(request.contactPersonName());
        advert.setContactRole(request.contactRole());
        advert.setContactEmail(request.contactEmail());
        advert.setContactPhone(request.contactPhone());
        advert.setApplicationInstructions(request.applicationInstructions());
        advert.setApplicationEmail(request.applicationEmail());
        advert.setApplicationPhone(request.applicationPhone());
        advert.setApplicationUrl(request.applicationUrl());
        advert.setRequiredAttachments(request.requiredAttachments());
    }

    private List<Long> superAdminIds() {
        return userRepository.findBySuperAdminTrue().stream().map(UserEntity::getId).toList();
    }

    private List<Long> supervisorIds(Long universityId) {
        if (universityId == null) {
            return List.of();
        }
        return userRepository.findByUniversityIdAndRole(universityId, com.example.demo.auth.Role.SUPERVISOR)
                .stream().map(UserEntity::getId).toList();
    }
}
