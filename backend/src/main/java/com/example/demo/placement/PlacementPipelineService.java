package com.example.demo.placement;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.CompanyRepository;
import com.example.demo.notification.NotificationService;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;

/**
 * P7 (R8/R9): the offer pipeline. A company posts an offer
 * ({@code OFFERED}); the student's university supervisor assigns a
 * university supervisor (approve → {@code ASSIGNED}) or rejects it. Every
 * transition notifies the right people, server-side only (L15).
 */
@Service
public class PlacementPipelineService {

    private static final Logger log = LoggerFactory.getLogger(PlacementPipelineService.class);

    private final PlacementRepository placementRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final PlacementStatusHistoryRepository placementStatusHistoryRepository;

    public PlacementPipelineService(PlacementRepository placementRepository, StudentRepository studentRepository,
            UserRepository userRepository, CompanyRepository companyRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            NotificationService notificationService, AuditLogService auditLogService,
            PlacementStatusHistoryRepository placementStatusHistoryRepository) {
        this.placementRepository = placementRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.placementStatusHistoryRepository = placementStatusHistoryRepository;
    }

    /** R8: company posts an offer — status OFFERED, companyId forced (L8). */
    @Transactional
    public Placement createOffer(UserEntity actor, Long studentId, String offerNote) {
        if (!"COMPANY".equals(actor.getRole().name())) {
            throw new org.springframework.security.access.AccessDeniedException("Only companies post offers here.");
        }
        if (actor.getCompanyId() == null) {
            throw new IllegalStateException("Your account is not linked to a company.");
        }
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new NoSuchElementException("Student not found."));

        Placement placement = new Placement();
        placement.setStudentId(student.getId());
        placement.setCompanyId(actor.getCompanyId()); // L8: forced, never from the body.
        placement.setUniversityId(student.getUniversityId());
        placement.setUniversitySupervisor("Pending");
        placement.setCompanySupervisor("Pending");
        placement.setStatus(Placement.Status.OFFERED);
        // PC8b: the offer has a real timestamp; createdAt defaults to now() in the entity.
        placement.setOfferedAt(LocalDateTime.now());
        Placement saved = placementRepository.save(placement);

        recordHistory(saved, null, Placement.Status.OFFERED, actor.getUsername());
        notifyUniversitySupervisorsAndAdmins(saved, student, actor.getCompanyId(), offerNote);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "PLACEMENT_OFFER", "Placement",
                "Offer for studentId " + student.getId() + " at companyId " + actor.getCompanyId(), null);
        return saved;
    }

    /** R9: university approves — assign a university supervisor, status ASSIGNED. */
    @Transactional
    public Placement approve(UserEntity actor, Long placementId, Long universitySupervisorId) {
        Placement placement = requirePlacement(placementId);
        requireUniversitySupervisor(actor);
        Long studentUniversity = placement.getUniversityId() != null
                ? placement.getUniversityId()
                : studentRepository.findById(placement.getStudentId()).map(Student::getUniversityId).orElse(null);
        if (!scopeServiceSafe(actor, studentUniversity)) {
            // Cross-university targets are 404 (L7), never a probing oracle.
            throw new NoSuchElementException("Placement not found.");
        }

        UniversitySupervisor supervisor = universitySupervisorRepository.findById(universitySupervisorId)
                .orElseThrow(() -> new NoSuchElementException("University supervisor not found."));
        if (studentUniversity == null || !studentUniversity.equals(supervisor.getUniversityId())) {
            throw new IllegalArgumentException("The selected supervisor does not belong to this student's university.");
        }
        Student student = studentRepository.findById(placement.getStudentId()).orElse(null);

        placement.setUniversitySupervisorId(supervisor.getId());
        placement.setUniversitySupervisor((supervisor.getFirstName() + " " + supervisor.getLastName()).trim());
        placement.setStatus(Placement.Status.ASSIGNED);
        // PC8b: assignment moment for the median time-to-placement query.
        placement.setAssignedAt(LocalDateTime.now());
        Placement saved = placementRepository.save(placement);

        recordHistory(saved, Placement.Status.OFFERED, Placement.Status.ASSIGNED, actor.getUsername());
        notifyApproval(saved, student, supervisor);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "PLACEMENT_APPROVED", "Placement",
                "Placement " + placement.getId() + " assigned to " + placement.getUniversitySupervisor(), null);
        return saved;
    }

    /**
     * PC8a: a pending match enters the review pipeline — status
     * {@code PENDING → OFFERED}. PENDING is the entity default and the
     * legacy/admin create default, so without this step it was a dead end:
     * {@link #requirePlacement} only ever accepted OFFERED, meaning a pending
     * placement could never be reviewed. Same notification/audit shape as
     * {@link #createOffer}.
     */
    @Transactional
    public Placement offer(UserEntity actor, Long placementId) {
        Placement placement = requirePlacementIn(placementId, Placement.Status.PENDING,
                "Only PENDING placements can be offered.");
        requireLifecycleScope(actor, placement);
        requireCompanyOrAdmin(actor);
        Student student = studentRepository.findById(placement.getStudentId()).orElse(null);

        placement.setStatus(Placement.Status.OFFERED);
        placement.setOfferedAt(LocalDateTime.now());
        Placement saved = placementRepository.save(placement);

        recordHistory(saved, Placement.Status.PENDING, Placement.Status.OFFERED, actor.getUsername());
        if (student != null) {
            notifyUniversitySupervisorsAndAdmins(saved, student, saved.getCompanyId(), null);
        }
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "PLACEMENT_OFFER", "Placement",
                "Placement " + saved.getId() + " offered", null);
        return saved;
    }

    /**
     * PC8a: the internship has begun — status {@code ASSIGNED → ACTIVE}.
     * Guard: the company owning the placement, or an admin. Notifies the
     * student and the placement's university supervisor.
     */
    @Transactional
    public Placement start(UserEntity actor, Long placementId) {
        Placement placement = requirePlacementIn(placementId, Placement.Status.ASSIGNED,
                "Only ASSIGNED placements can be started.");
        // PC8a: scope before role so a cross-university actor gets 404 (L7,
        // never a probing oracle) while an in-scope wrong role gets 403.
        requireLifecycleScope(actor, placement);
        requireCompanyOrAdmin(actor);
        Student student = studentRepository.findById(placement.getStudentId()).orElse(null);

        placement.setStatus(Placement.Status.ACTIVE);
        placement.setStartedAt(LocalDateTime.now());
        Placement saved = placementRepository.save(placement);

        recordHistory(saved, Placement.Status.ASSIGNED, Placement.Status.ACTIVE, actor.getUsername());
        notifyInternshipMilestone(saved, student, true);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "PLACEMENT_STARTED", "Placement",
                "Placement " + saved.getId() + " started", null);
        return saved;
    }

    /**
     * PC8a: the internship has finished — status {@code ACTIVE → COMPLETED}.
     * Same guard and audiences as {@link #start}.
     */
    @Transactional
    public Placement complete(UserEntity actor, Long placementId) {
        Placement placement = requirePlacementIn(placementId, Placement.Status.ACTIVE,
                "Only ACTIVE placements can be completed.");
        requireLifecycleScope(actor, placement);
        requireCompanyOrAdmin(actor);
        Student student = studentRepository.findById(placement.getStudentId()).orElse(null);

        placement.setStatus(Placement.Status.COMPLETED);
        placement.setCompletedAt(LocalDateTime.now());
        Placement saved = placementRepository.save(placement);

        recordHistory(saved, Placement.Status.ACTIVE, Placement.Status.COMPLETED, actor.getUsername());
        notifyInternshipMilestone(saved, student, false);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "PLACEMENT_COMPLETED", "Placement",
                "Placement " + saved.getId() + " completed", null);
        return saved;
    }

    /** R9: university rejects — status CANCELLED, student and company notified. */
    @Transactional
    public Placement reject(UserEntity actor, Long placementId) {
        Placement placement = requirePlacement(placementId);
        requireUniversitySupervisor(actor);
        Long studentUniversity = placement.getUniversityId() != null
                ? placement.getUniversityId()
                : studentRepository.findById(placement.getStudentId()).map(Student::getUniversityId).orElse(null);
        if (!scopeServiceSafe(actor, studentUniversity)) {
            throw new NoSuchElementException("Placement not found.");
        }
        Student student = studentRepository.findById(placement.getStudentId()).orElse(null);

        placement.setStatus(Placement.Status.CANCELLED);
        Placement saved = placementRepository.save(placement);

        recordHistory(saved, Placement.Status.OFFERED, Placement.Status.CANCELLED, actor.getUsername());
        List<Long> recipients = new ArrayList<>();
        if (student != null) {
            recipients.add(student.getUserId());
        }
        userRepository.findByCompanyId(placement.getCompanyId()).stream()
                .filter(u -> "COMPANY".equals(u.getRole().name()))
                .map(UserEntity::getId)
                .forEach(recipients::add);
        notificationService.notify(recipients, "PLACEMENT_REJECTED",
                "Placement offer declined",
                student != null
                        ? "The university declined the offer for " + student.getFirstName() + " "
                                + student.getLastName() + "."
                        : "The university declined a placement offer.",
                "/student/dashboard");
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "PLACEMENT_REJECTED", "Placement",
                "Placement " + placement.getId() + " rejected", null);
        return saved;
    }

    /**
     * PC8b: append the transition to {@code placement_status_history}. Called
     * only AFTER the row is saved so the generated id is final. Statuses are
     * stored as strings (see {@link PlacementStatusHistory}): the trail is an
     * audit record and must outlive the enum's vocabulary. Package-private so
     * the legacy ADMIN direct-create path in {@link PlacementController} writes
     * the same shape of row without duplicating the mapping.
     */
    void recordHistory(Placement saved, Placement.Status from, Placement.Status to, String actorUsername) {
        PlacementStatusHistory row = new PlacementStatusHistory();
        row.setPlacementId(saved.getId());
        row.setFromStatus(from != null ? from.name() : null);
        row.setToStatus(to.name());
        row.setChangedBy(actorUsername != null && !actorUsername.isBlank() ? actorUsername : "system");
        placementStatusHistoryRepository.save(row);
    }

    private boolean scopeServiceSafe(UserEntity actor, Long studentUniversity) {
        boolean adminLike = Boolean.TRUE.equals(actor.getSuperAdmin())
                || "ADMIN".equals(actor.getRole().name());
        if (adminLike) {
            return true;
        }
        return actor.getUniversityId() != null && studentUniversity != null
                && actor.getUniversityId().equals(studentUniversity);
    }

    private void requireUniversitySupervisor(UserEntity actor) {
        if (!"SUPERVISOR".equals(actor.getRole().name())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only a university supervisor can review offers.");
        }
    }

    /** PC8a: the company-scoped equivalent — only the owning company or an admin. */
    private void requireCompanyOrAdmin(UserEntity actor) {
        if (isAdminLike(actor)) {
            return;
        }
        if (!"COMPANY".equals(actor.getRole().name())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only the placement's company can manage its internship.");
        }
    }

    private boolean isAdminLike(UserEntity actor) {
        return Boolean.TRUE.equals(actor.getSuperAdmin()) || "ADMIN".equals(actor.getRole().name());
    }

    /**
     * PC8a: scope check for the lifecycle transitions. Admins pass;
     * company-scoped actors must own the placement (generic 403, no details);
     * everyone else is university-scoped and a mismatch is 404 — cross-university
     * targets are never a probing oracle (L7), mirroring approve/reject.
     */
    private void requireLifecycleScope(UserEntity actor, Placement placement) {
        if (isAdminLike(actor)) {
            return;
        }
        if (actor.getCompanyId() != null || "COMPANY".equals(actor.getRole().name())) {
            if (actor.getCompanyId() == null || !actor.getCompanyId().equals(placement.getCompanyId())) {
                throw new PlacementScopeException();
            }
            return;
        }
        Long studentUniversity = placement.getUniversityId() != null
                ? placement.getUniversityId()
                : studentRepository.findById(placement.getStudentId()).map(Student::getUniversityId).orElse(null);
        if (actor.getUniversityId() == null || studentUniversity == null
                || !actor.getUniversityId().equals(studentUniversity)) {
            throw new NoSuchElementException("Placement not found.");
        }
    }

    private Placement requirePlacement(Long placementId) {
        return requirePlacementIn(placementId, Placement.Status.OFFERED,
                "Only OFFERED placements can be reviewed.");
    }

    private Placement requirePlacementIn(Long placementId, Placement.Status expected, String message) {
        Placement placement = placementRepository.findById(placementId)
                .orElseThrow(() -> new NoSuchElementException("Placement not found."));
        if (placement.getStatus() != expected) {
            throw new IllegalStateException(message);
        }
        return placement;
    }

    /**
     * PC8a: milestone notifications go to the student and the placement's
     * university supervisor (assigned by id, falling back to the university's
     * supervisors for legacy string-only rows).
     */
    private void notifyInternshipMilestone(Placement saved, Student student, boolean started) {
        String type = started ? "PLACEMENT_STARTED" : "PLACEMENT_COMPLETED";
        String company = companyRepository.findById(saved.getCompanyId())
                .map(c -> c.getName() != null ? c.getName() : "a company").orElse("a company");
        String studentName = student != null
                ? student.getFirstName() + " " + student.getLastName()
                : "A student";

        if (student != null && student.getUserId() != null) {
            notificationService.notify(List.of(student.getUserId()), type,
                    started ? "Your internship has started" : "Your internship has finished",
                    started ? "Your internship at " + company + " has started."
                            : "Your internship at " + company + " has finished.",
                    "/student/dashboard");
        }
        notificationService.notify(universitySupervisorRecipients(saved, student), type,
                started ? "An internship has started" : "An internship has finished",
                studentName + (started ? "'s internship at " + company + " has started."
                        : "'s internship at " + company + " has finished."),
                "/university/placements");
    }

    private List<Long> universitySupervisorRecipients(Placement saved, Student student) {
        if (saved.getUniversitySupervisorId() != null) {
            return universitySupervisorRepository.findById(saved.getUniversitySupervisorId())
                    .map(s -> List.of(s.getUserId()))
                    .orElse(List.of());
        }
        Long universityId = saved.getUniversityId() != null
                ? saved.getUniversityId()
                : (student != null ? student.getUniversityId() : null);
        if (universityId == null) {
            return List.of();
        }
        return universitySupervisorRepository.findByUniversityId(universityId).stream()
                .map(UniversitySupervisor::getUserId)
                .toList();
    }

    private void notifyUniversitySupervisorsAndAdmins(Placement saved, Student student, Long companyId,
            String offerNote) {
        String company = companyRepository.findById(companyId)
                .map(c -> c.getName() != null ? c.getName() : "a company").orElse("a company");
        String studentName = student.getFirstName() + " " + student.getLastName();
        List<Long> recipients = new ArrayList<>();
        if (student.getUniversityId() != null) {
            universitySupervisorRepository.findByUniversityId(student.getUniversityId()).stream()
                    .map(UniversitySupervisor::getUserId)
                    .forEach(recipients::add);
        }
        userRepository.findByRole(Role.ADMIN).stream().map(UserEntity::getId).forEach(recipients::add);
        String body = "Student " + studentName + " received an offer from " + company
                + " — assign a supervisor."
                + (offerNote != null && !offerNote.isBlank() ? " Note: " + offerNote.trim() : "");
        notificationService.notify(recipients, "PLACEMENT_OFFER", "New placement offer", body,
                "/university/placements");
    }

    private void notifyApproval(Placement saved, Student student, UniversitySupervisor supervisor) {
        String company = companyRepository.findById(saved.getCompanyId())
                .map(c -> c.getName() != null ? c.getName() : "a company").orElse("a company");
        String supervisorName = (supervisor.getFirstName() + " " + supervisor.getLastName()).trim();
        String studentName = student != null
                ? student.getFirstName() + " " + student.getLastName()
                : "the student";

        List<Long> studentRecipient = student != null ? List.of(student.getUserId()) : List.of();
        notificationService.notify(studentRecipient, "PLACEMENT_APPROVED",
                "You have been placed",
                "You are placed at " + company + " — your university supervisor is " + supervisorName + ".",
                "/student/dashboard");

        List<Long> companyRecipients = userRepository.findByCompanyId(saved.getCompanyId()).stream()
                .filter(u -> "COMPANY".equals(u.getRole().name()))
                .map(UserEntity::getId)
                .toList();
        notificationService.notify(companyRecipients, "PLACEMENT_APPROVED",
                "Your offer was accepted",
                studentName + " was placed at your company — university supervisor: " + supervisorName + ".",
                "/company/dashboard");

        notificationService.notify(List.of(supervisor.getUserId()), "PLACEMENT_APPROVED",
                "You supervise a new student",
                "You supervise " + studentName + " at " + company + ".", "/university/placements");
    }
}
