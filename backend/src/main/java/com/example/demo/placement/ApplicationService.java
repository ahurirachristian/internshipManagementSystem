package com.example.demo.placement;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.notification.NotificationService;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * PC9 (D3, part 2): the application lifecycle — submit, review, shortlist,
 * accept / reject / withdraw — plus the two read models (applicant list and
 * funnel) that every query is scoped through.
 *
 * <p>Two invariants carry the PC9 tests:
 * <ul>
 *   <li><b>Only legal transitions.</b> {@link #ALLOWED} is a closed map;
 *       anything not listed — including any move out of a terminal status —
 *       is {@code 409}. Terminal states map to an empty set on purpose so a
 *       late edit cannot resurrect an accepted application.</li>
 *   <li><b>Scope decides visibility.</b> Reads and transitions resolve through
 *       the same scope: admin → everything; company → its own rows only;
 *       student → their own rows only. A competing company's id simply isn't
 *       in scope, so its applicants' PII never leaves the server for it.</li>
 * </ul>
 */
@Service
@Transactional
public class ApplicationService {

    /**
     * The complete legal-transition table. SUBMITTED is the only non-terminal
     * state a student may leave voluntarily (withdraw); review decisions belong
     * to the company or an admin.
     */
    private static final Map<Application.Status, List<Application.Status>> ALLOWED = new EnumMap<>(Application.Status.class);

    static {
        ALLOWED.put(Application.Status.SUBMITTED, List.of(
                Application.Status.REVIEWING, Application.Status.REJECTED, Application.Status.WITHDRAWN));
        ALLOWED.put(Application.Status.REVIEWING, List.of(
                Application.Status.SHORTLISTED, Application.Status.REJECTED, Application.Status.WITHDRAWN));
        ALLOWED.put(Application.Status.SHORTLISTED, List.of(
                Application.Status.ACCEPTED, Application.Status.REJECTED, Application.Status.WITHDRAWN));
        ALLOWED.put(Application.Status.ACCEPTED, List.of());
        ALLOWED.put(Application.Status.REJECTED, List.of());
        ALLOWED.put(Application.Status.WITHDRAWN, List.of());
    }

    private final ApplicationRepository applicationRepository;
    private final VacancyRepository vacancyRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public ApplicationService(ApplicationRepository applicationRepository, VacancyRepository vacancyRepository,
            StudentRepository studentRepository, UserRepository userRepository,
            NotificationService notificationService, AuditLogService auditLogService) {
        this.applicationRepository = applicationRepository;
        this.vacancyRepository = vacancyRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    /**
     * PC9: a student applies to a vacancy. The company link is copied from the
     * VACANCY (never from the body — L8); duplicate applications are a 409;
     * closed vacancies refuse new applications.
     */
    public ApplicationDto apply(UserEntity actor, Long vacancyId, String note) {
        Vacancy vacancy = vacancyRepository.findById(vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Vacancy not found."));
        if (!"OPEN".equalsIgnoreCase(vacancy.getStatus())) {
            throw new IllegalStateException("This vacancy is no longer open.");
        }
        Student student = studentRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new IllegalStateException("Your account has no student record."));
        if (applicationRepository.findByVacancyIdAndStudentId(vacancyId, student.getId()).isPresent()) {
            throw new IllegalStateException("You have already applied to this vacancy.");
        }

        Application application = new Application();
        application.setVacancyId(vacancy.getId());
        application.setCompanyId(vacancy.getCompanyId());
        application.setStudentId(student.getId());
        Application saved = applicationRepository.save(application);

        notifyCompany(saved, vacancy, student, note);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "APPLICATION_SUBMITTED", "Application",
                "Application " + saved.getId() + " submitted for vacancy " + vacancy.getId(), null);
        return toDto(saved, vacancy, student);
    }

    /** PC9: one transition, guarded by scope first, then the closed map. */
    public ApplicationDto transition(UserEntity actor, Long applicationId, Application.Status target) {
        Application application = requireInScope(actor, applicationId);
        Application.Status current = application.getStatus();
        if (!ALLOWED.get(current).contains(target)) {
            // Illegal jump (including any move out of a terminal state) → 409.
            throw new IllegalStateException(
                    "An application in " + current + " cannot move to " + target + ".");
        }
        // Role split: the company side of the table (review / shortlist / accept
        // / reject) belongs to the company or an admin; the student's ONLY move
        // is withdrawing their own application. Without this a student could
        // "accept" themselves onto a company's shortlist.
        if (isStudent(actor)) {
            if (target != Application.Status.WITHDRAWN || !isStudentActingOnOwn(actor, application)) {
                throw new AccessDeniedException("Only the applicant can withdraw an application.");
            }
        } else if (target == Application.Status.WITHDRAWN) {
            throw new AccessDeniedException("Only the applicant can withdraw an application.");
        }

        application.setStatus(target);
        Application saved = applicationRepository.save(application);

        notifyApplicant(saved, target);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "APPLICATION_STATUS", "Application",
                "Application " + saved.getId() + ": " + current + " -> " + target, null);
        Vacancy vacancy = vacancyRepository.findById(saved.getVacancyId()).orElse(null);
        Student student = studentRepository.findById(saved.getStudentId()).orElse(null);
        return toDto(saved, vacancy, student);
    }

    /** Scoped applicant list: admin → all, company → own, student → own. */
    public List<ApplicationDto> listFor(UserEntity actor) {
        List<Application> rows = scopedRows(actor);
        return rows.stream().map(this::toDtoLazy).toList();
    }

    /** Rows for the caller's scope. Single source for list, funnel and detail. */
    private List<Application> scopedRows(UserEntity actor) {
        return switch (scopeOf(actor)) {
            case ADMIN -> applicationRepository.findAll();
            case COMPANY -> applicationRepository.findByCompanyId(requireCompanyId(actor));
            case STUDENT -> {
                Student student = studentRepository.findByUserId(actor.getId()).orElse(null);
                yield student == null ? List.of() : applicationRepository.findByStudentId(student.getId());
            }
        };
    }

    /** PC9: funnel for the caller's scope — zero-filled, reconciled to rows. */
    public ApplicationFunnelDto funnelFor(UserEntity actor) {
        List<Application> rows = scopedRows(actor);
        Map<Application.Status, Long> grouped = new EnumMap<>(Application.Status.class);
        for (Application row : rows) {
            grouped.merge(row.getStatus(), 1L, Long::sum);
        }
        return ApplicationFunnelDto.of(grouped, rows.size());
    }

    private enum Scope { ADMIN, COMPANY, STUDENT }

    private Scope scopeOf(UserEntity actor) {
        if (Boolean.TRUE.equals(actor.getSuperAdmin()) || "ADMIN".equals(actor.getRole().name())) {
            return Scope.ADMIN;
        }
        if ("COMPANY".equals(actor.getRole().name())) {
            return Scope.COMPANY;
        }
        return Scope.STUDENT;
    }

    private Long requireCompanyId(UserEntity actor) {
        if (actor.getCompanyId() == null) {
            // Same shape as PlacementPipelineService.createOffer → 409.
            throw new IllegalStateException("Your account is not linked to a company.");
        }
        return actor.getCompanyId();
    }

    /**
     * Scope-before-role, mirroring PC8a: an id outside the caller's scope is
     * 404 — never a 403 that would confirm the row exists (L7) and never a
     * body carrying the other tenant's PII.
     */
    private Application requireInScope(UserEntity actor, Long applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found."));
        if (Boolean.TRUE.equals(actor.getSuperAdmin()) || "ADMIN".equals(actor.getRole().name())) {
            return application;
        }
        if ("COMPANY".equals(actor.getRole().name())) {
            if (actor.getCompanyId() == null || !actor.getCompanyId().equals(application.getCompanyId())) {
                throw new NoSuchElementException("Application not found.");
            }
            return application;
        }
        Student student = studentRepository.findByUserId(actor.getId()).orElse(null);
        if (student == null || !student.getId().equals(application.getStudentId())) {
            throw new NoSuchElementException("Application not found.");
        }
        return application;
    }

    private boolean isStudent(UserEntity actor) {
        return "STUDENT".equals(actor.getRole().name());
    }

    private boolean isStudentActingOnOwn(UserEntity actor, Application application) {
        return studentRepository.findByUserId(actor.getId())
                .map(s -> s.getId().equals(application.getStudentId()))
                .orElse(false);
    }

    private ApplicationDto toDtoLazy(Application application) {
        Vacancy vacancy = vacancyRepository.findById(application.getVacancyId()).orElse(null);
        Student student = studentRepository.findById(application.getStudentId()).orElse(null);
        return toDto(application, vacancy, student);
    }

    /**
     * The ONLY place applicant PII is packed — reached exclusively from scoped
     * lookups, so a row that never entered the caller's scope is never packed
     * for them.
     */
    private ApplicationDto toDto(Application application, Vacancy vacancy, Student student) {
        String email = student != null && student.getUserId() != null
                ? userRepository.findById(student.getUserId()).map(UserEntity::getEmail).orElse(null)
                : null;
        return new ApplicationDto(
                application.getId(),
                application.getVacancyId(),
                vacancy != null ? vacancy.getTitle() : null,
                application.getCompanyId(),
                application.getStudentId(),
                application.getStatus().name(),
                application.getCreatedAt(),
                student != null ? student.getFirstName() : null,
                student != null ? student.getLastName() : null,
                student != null ? student.getStudentNumber() : null,
                student != null ? student.getRegistrationNumber() : null,
                student != null ? student.getDegreeProgram() : null,
                email);
    }

    private void notifyCompany(Application saved, Vacancy vacancy, Student student, String note) {
        List<Long> recipients = userRepository.findByCompanyId(saved.getCompanyId()).stream()
                .filter(u -> "COMPANY".equals(u.getRole().name()))
                .map(UserEntity::getId)
                .toList();
        String studentName = student.getFirstName() + " " + student.getLastName();
        String body = studentName + " applied for \"" + vacancyTitle(vacancy) + "\"."
                + (note != null && !note.isBlank() ? " Note: " + note.trim() : "");
        notificationService.notify(recipients, "APPLICATION_SUBMITTED", "New application received", body,
                "/company/dashboard");
    }

    private void notifyApplicant(Application saved, Application.Status target) {
        Student student = studentRepository.findById(saved.getStudentId()).orElse(null);
        if (student == null || student.getUserId() == null) {
            return;
        }
        notificationService.notify(List.of(student.getUserId()), "APPLICATION_STATUS",
                "Application updated",
                "Your application is now " + target + ".",
                "/student/dashboard");
    }

    private String vacancyTitle(Vacancy vacancy) {
        return vacancy != null && vacancy.getTitle() != null ? vacancy.getTitle() : "a vacancy";
    }
}
