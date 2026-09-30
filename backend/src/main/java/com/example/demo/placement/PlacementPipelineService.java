package com.example.demo.placement;

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

    public PlacementPipelineService(PlacementRepository placementRepository, StudentRepository studentRepository,
            UserRepository userRepository, CompanyRepository companyRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            NotificationService notificationService, AuditLogService auditLogService) {
        this.placementRepository = placementRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
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
        Placement saved = placementRepository.save(placement);

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
        Placement saved = placementRepository.save(placement);

        notifyApproval(saved, student, supervisor);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "PLACEMENT_APPROVED", "Placement",
                "Placement " + placement.getId() + " assigned to " + placement.getUniversitySupervisor(), null);
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

    private Placement requirePlacement(Long placementId) {
        Placement placement = placementRepository.findById(placementId)
                .orElseThrow(() -> new NoSuchElementException("Placement not found."));
        if (placement.getStatus() != Placement.Status.OFFERED) {
            throw new IllegalStateException("Only OFFERED placements can be reviewed.");
        }
        return placement;
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
