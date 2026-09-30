package com.example.demo.university;

import java.util.List;
import java.util.NoSuchElementException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.AuthorizationScopeService;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.UserDto;
import com.example.demo.email.EmailSender;
import com.example.demo.email.EmailTemplates;
import com.example.demo.notification.NotificationService;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * P5 (R5/R6-scoped/L7): a university supervisor manages only the STUDENT and
 * SUPERVISOR accounts of their own university. ADMIN keeps broad access.
 */
@Service
public class UniversityPeopleService {

    private static final Logger log = LoggerFactory.getLogger(UniversityPeopleService.class);

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthorizationScopeService scope;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final EmailSender emailSender;
    private final EmailTemplates emailTemplates;

    public UniversityPeopleService(UserRepository userRepository, StudentRepository studentRepository,
            PasswordEncoder passwordEncoder, AuthorizationScopeService scope,
            NotificationService notificationService, AuditLogService auditLogService,
            EmailSender emailSender, EmailTemplates emailTemplates) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.scope = scope;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.emailSender = emailSender;
        this.emailTemplates = emailTemplates;
    }

    public List<UserDto> list(UserEntity actor) {
        List<UserEntity> people;
        if (scope.isAdminLike(actor)) {
            people = userRepository.findAll();
        } else {
            requireSupervisor(actor);
            people = userRepository.findByUniversityId(actor.getUniversityId());
        }
        return people.stream().map(this::toDto).toList();
    }

    @Transactional
    public UserEntity createPerson(UserEntity actor, String username, String roleName, Long universityId) {
        String usernameTrimmed = username == null ? "" : username.trim();
        if (usernameTrimmed.isEmpty()) {
            throw new IllegalArgumentException("Username is required.");
        }
        String role = roleName == null ? "" : roleName.trim().toUpperCase();
        if (!"STUDENT".equals(role) && !"SUPERVISOR".equals(role)) {
            throw new IllegalArgumentException("Only STUDENT or SUPERVISOR accounts can be created here.");
        }
        Long targetUniversity = scope.isAdminLike(actor) ? universityId : actor.getUniversityId();
        if (targetUniversity == null) {
            throw new IllegalArgumentException("A university is required.");
        }
        if (userRepository.findByUsername(usernameTrimmed).isPresent()) {
            throw new com.example.demo.role.RoleRequestConflictException("Username already exists.");
        }

        String tempPassword = usernameTrimmed + "123";
        UserEntity user = new UserEntity(usernameTrimmed, passwordEncoder.encode(tempPassword), Role.valueOf(role));
        user.setUniversityId(targetUniversity);
        user.setMustChangePassword(true);
        userRepository.save(user);

        if ("STUDENT".equals(role)) {
            Student student = new Student();
            student.setUserId(user.getId());
            student.setUniversityId(targetUniversity);
            student.setFirstName(usernameTrimmed);
            student.setLastName("");
            student.setStudentNumber(usernameTrimmed);
            student.setRegistrationNumber("Pending");
            student.setDegreeProgram("Undeclared");
            studentRepository.save(student);
        }

        notificationService.notify(List.of(user.getId()), "CREDENTIALS_ISSUED",
                "Your IMS account is ready",
                "Your username is " + usernameTrimmed + ". Change your password at first sign-in.",
                "/login");
        sendCredentialsEmail(user, usernameTrimmed);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "UNIVERSITY_USER_CREATED",
                "User", "Created " + role + " account " + usernameTrimmed, null);
        return user;
    }

    @Transactional
    public UserEntity assignRole(UserEntity actor, Long targetId, String roleName) {
        UserEntity target = requireTarget(actor, targetId);
        String role = roleName == null ? "" : roleName.trim().toUpperCase();
        if (!"STUDENT".equals(role) && !"SUPERVISOR".equals(role)) {
            throw new AccessDeniedException("Only STUDENT or SUPERVISOR roles can be assigned here.");
        }
        target.setRole(Role.valueOf(role));
        userRepository.save(target);

        notificationService.notify(List.of(target.getId()), "UNIVERSITY_ROLE_CHANGE",
                "Your role was updated", "You now have the " + role + " role.", "/");
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "ROLE_GRANTED", "User",
                "University set " + target.getUsername() + " to " + role, null);
        return target;
    }

    @Transactional
    public UserEntity setEnabled(UserEntity actor, Long targetId, boolean enabled) {
        UserEntity target = requireTarget(actor, targetId);
        if (!enabled) {
            scope.requireNotSelf(actor, target);
        }
        target.setEnabled(enabled);
        userRepository.save(target);

        notificationService.notify(List.of(target.getId()),
                enabled ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED",
                enabled ? "Your account was re-enabled" : "Your account was disabled",
                enabled ? "An administrator restored your access."
                        : "Your university disabled your account. Contact them for details.",
                null);
        auditLogService.log(actor.getUsername(), actor.getRole().name(),
                enabled ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED", "User",
                "University " + (enabled ? "enabled " : "disabled ") + target.getUsername(), null);
        return target;
    }

    /** Resolve + scope-check a target, returning 404 (not 403) across tenants (L7). */
    public UserEntity requireTarget(UserEntity actor, Long targetId) {
        UserEntity target = userRepository.findById(targetId)
                .orElseThrow(() -> new NoSuchElementException("User not found."));
        scope.requireUniversityCanAct(actor, target);
        return target;
    }

    private void requireSupervisor(UserEntity actor) {
        if (!scope.isUniversitySupervisor(actor)) {
            throw new AccessDeniedException("Only a university supervisor can manage these accounts.");
        }
    }

    private void sendCredentialsEmail(UserEntity user, String username) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        try {
            emailSender.send(user.getEmail(), "Your IMS account is ready",
                    emailTemplates.credentialsIssued(username));
        } catch (RuntimeException ex) {
            log.warn("credentials email failed: {}", ex.getMessage());
        }
    }

    private UserDto toDto(UserEntity user) {
        UserDto dto = new UserDto(user.getId(), user.getUsername(), user.getRole().name(),
                user.getEmail(), user.getCompanyId(), user.getUniversityId());
        dto.setEnabled(Boolean.TRUE.equals(user.getEnabled()));
        dto.setSuperAdmin(Boolean.TRUE.equals(user.getSuperAdmin()));
        dto.setMustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()));
        return dto;
    }
}
